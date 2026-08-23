import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { requireAdminRequest } from '@/lib/security';
import { isSafeStorageKey } from '@/lib/upload-validation';
import { checkRemoteMediaHealth, type RemoteMediaHealth } from '@/lib/media-health';

type MediaIssueItem = {
  id: string;
  url?: string | null;
  s3Key?: string | null;
  mediaUrl?: string | null;
  mediaUrls?: string[];
  mediaS3Key?: string | null;
  mediaS3Keys?: string[];
  privacy?: string;
  caption?: string | null;
  text?: string;
  issue: string;
  createdAt?: Date;
};

const CLEANUP_TARGETS = ['all', 'memories', 'timeline'] as const;
type CleanupTarget = (typeof CLEANUP_TARGETS)[number];

function validateStorageReference(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  if (isSafeStorageKey(value)) return true;

  const legacyCloudPatterns = [
    /s3\.amazonaws\.com/,
    /\.s3\.amazonaws\.com/,
    /s3-[^/]+\.amazonaws\.com/,
    /s3-[^/]+\.amazonaws\.com\.cn/,
    /storage\.googleapis\.com/,
  ];

  return legacyCloudPatterns.some((pattern) => pattern.test(value));
}

function isCleanupTarget(value: unknown): value is CleanupTarget {
  return typeof value === 'string' && CLEANUP_TARGETS.includes(value as CleanupTarget);
}

async function inspectUrls(urls: string[]) {
  const health = await Promise.all(urls.map((url) => checkRemoteMediaHealth(url)));
  return {
    health,
    hasHealthy: health.includes('healthy'),
    hasBroken: health.includes('broken'),
    hasUncertain: health.includes('uncertain'),
  };
}

function classifySingleMedia(
  urlHealth: RemoteMediaHealth,
  storageValid: boolean,
): RemoteMediaHealth {
  if (!storageValid || urlHealth === 'broken') return 'broken';
  if (urlHealth === 'uncertain') return 'uncertain';
  return 'healthy';
}

// GET /api/cleanup - analyze media without deleting uncertain records.
export async function GET(request: Request) {
  const adminRejection = requireAdminRequest(request);
  if (adminRejection) return adminRejection;

  try {
    const [memories, timelineEvents] = await Promise.all([
      prisma.memory.findMany({
        select: {
          id: true,
          url: true,
          s3Key: true,
          privacy: true,
          caption: true,
          configId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.timelineEvent.findMany({
        select: {
          id: true,
          configId: true,
          mediaUrl: true,
          mediaS3Key: true,
          mediaUrls: true,
          mediaS3Keys: true,
          text: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const memoryAnalysis = {
      total: memories.length,
      valid: 0,
      broken: 0,
      uncertain: 0,
      brokenItems: [] as MediaIssueItem[],
      uncertainItems: [] as MediaIssueItem[],
    };

    for (const memory of memories) {
      const health = await checkRemoteMediaHealth(memory.url);
      const storageValid = memory.s3Key ? validateStorageReference(memory.s3Key) : true;
      const classification = classifySingleMedia(health, storageValid);
      const item: MediaIssueItem = {
        id: memory.id,
        url: memory.url,
        s3Key: memory.s3Key,
        privacy: memory.privacy,
        caption: memory.caption,
        issue: !storageValid ? 'Invalid storage reference' : classification === 'uncertain' ? 'Remote media temporarily unreachable' : 'Broken media URL',
        createdAt: memory.createdAt,
      };

      if (classification === 'healthy') memoryAnalysis.valid += 1;
      else if (classification === 'broken') {
        memoryAnalysis.broken += 1;
        memoryAnalysis.brokenItems.push(item);
      } else {
        memoryAnalysis.uncertain += 1;
        memoryAnalysis.uncertainItems.push(item);
      }
    }

    const timelineAnalysis = {
      total: timelineEvents.length,
      valid: 0,
      broken: 0,
      uncertain: 0,
      brokenItems: [] as MediaIssueItem[],
      uncertainItems: [] as MediaIssueItem[],
    };

    for (const event of timelineEvents) {
      const allMediaUrls = [event.mediaUrl, ...(event.mediaUrls || [])].filter((url): url is string => Boolean(url));
      const allStorageKeys = [event.mediaS3Key, ...(event.mediaS3Keys || [])].filter((key): key is string => Boolean(key));
      if (allMediaUrls.length === 0 && allStorageKeys.length === 0) {
        timelineAnalysis.valid += 1;
        continue;
      }

      const urlState = await inspectUrls(allMediaUrls);
      const storageValid = allStorageKeys.every(validateStorageReference);
      // A mixed event with at least one healthy asset is retained. Cleanup should
      // never destroy a whole timeline entry because one attachment is down.
      const classification: RemoteMediaHealth = !storageValid
        ? 'broken'
        : urlState.hasHealthy
          ? (urlState.hasBroken || urlState.hasUncertain ? 'uncertain' : 'healthy')
          : urlState.hasUncertain
            ? 'uncertain'
            : 'broken';
      const item: MediaIssueItem = {
        id: event.id,
        mediaUrl: event.mediaUrl,
        mediaS3Key: event.mediaS3Key,
        mediaUrls: allMediaUrls,
        mediaS3Keys: allStorageKeys,
        text: event.text,
        issue: !storageValid ? 'Invalid storage reference' : classification === 'uncertain' ? 'Some media could not be verified' : 'All referenced media is broken',
        createdAt: event.createdAt,
      };

      if (classification === 'healthy') timelineAnalysis.valid += 1;
      else if (classification === 'broken') {
        timelineAnalysis.broken += 1;
        timelineAnalysis.brokenItems.push(item);
      } else {
        timelineAnalysis.uncertain += 1;
        timelineAnalysis.uncertainItems.push(item);
      }
    }

    return NextResponse.json({
      memories: memoryAnalysis,
      timelineEvents: timelineAnalysis,
      summary: {
        totalItems: memoryAnalysis.total + timelineAnalysis.total,
        totalBroken: memoryAnalysis.broken + timelineAnalysis.broken,
        totalUncertain: memoryAnalysis.uncertain + timelineAnalysis.uncertain,
        totalValid: memoryAnalysis.valid + timelineAnalysis.valid,
      },
    }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (error) {
    console.error('[Cleanup] Error analyzing media:', error);
    return NextResponse.json(
      { error: 'Failed to analyze media', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// DELETE /api/cleanup - delete only media proven broken. Network failures are uncertain and retained.
export async function DELETE(request: Request) {
  const adminRejection = requireAdminRequest(request);
  if (adminRejection) return adminRejection;

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body && typeof body === 'object' && 'dryRun' in body ? body.dryRun === true : false;
    const targetTable = body && typeof body === 'object' && 'targetTable' in body ? body.targetTable : 'all';

    if (!isCleanupTarget(targetTable)) {
      return NextResponse.json(
        { error: `Invalid targetTable. Expected one of: ${CLEANUP_TARGETS.join(', ')}` },
        { status: 400 },
      );
    }

    let deletedMemories = 0;
    let deletedEvents = 0;
    let retainedUncertain = 0;
    const errors: string[] = [];
    const affectedConfigIds = new Set<string>();

    if (targetTable === 'all' || targetTable === 'memories') {
      const memories = await prisma.memory.findMany({
        select: { id: true, url: true, s3Key: true, configId: true },
      });

      for (const memory of memories) {
        const health = await checkRemoteMediaHealth(memory.url);
        const storageValid = memory.s3Key ? validateStorageReference(memory.s3Key) : true;
        const definitelyBroken = !storageValid || health === 'broken';
        if (health === 'uncertain' && storageValid) {
          retainedUncertain += 1;
          continue;
        }
        if (!definitelyBroken) continue;

        if (dryRun) {
          deletedMemories += 1;
          continue;
        }
        try {
          await prisma.memory.delete({ where: { id: memory.id } });
          affectedConfigIds.add(memory.configId);
          deletedMemories += 1;
        } catch (error) {
          errors.push(`Failed to delete memory ${memory.id}: ${String(error)}`);
        }
      }
    }

    if (targetTable === 'all' || targetTable === 'timeline') {
      const events = await prisma.timelineEvent.findMany({
        select: { id: true, configId: true, mediaUrl: true, mediaS3Key: true, mediaUrls: true, mediaS3Keys: true },
      });

      for (const event of events) {
        const allMediaUrls = [event.mediaUrl, ...(event.mediaUrls || [])].filter((url): url is string => Boolean(url));
        const allStorageKeys = [event.mediaS3Key, ...(event.mediaS3Keys || [])].filter((key): key is string => Boolean(key));
        if (allMediaUrls.length === 0 && allStorageKeys.length === 0) continue;

        const urlState = await inspectUrls(allMediaUrls);
        const storageValid = allStorageKeys.every(validateStorageReference);
        const definitelyBroken = !storageValid || (!urlState.hasHealthy && !urlState.hasUncertain && urlState.hasBroken);
        if (!definitelyBroken) {
          if (urlState.hasUncertain || urlState.hasBroken) retainedUncertain += 1;
          continue;
        }

        if (dryRun) {
          deletedEvents += 1;
          continue;
        }
        try {
          await prisma.timelineEvent.delete({ where: { id: event.id } });
          affectedConfigIds.add(event.configId);
          deletedEvents += 1;
        } catch (error) {
          errors.push(`Failed to delete timeline event ${event.id}: ${String(error)}`);
        }
      }
    }

    if (!dryRun && (deletedMemories > 0 || deletedEvents > 0)) {
      await Promise.all(
        [...affectedConfigIds].flatMap((configId) => [
          redis.del(`app_config:${configId}`),
          redis.del(`timeline_events:${configId}`),
          redis.del(`memories:${configId}:all`),
          redis.del(`memories:${configId}:public`),
          redis.del(`memories:${configId}:private`),
        ]),
      );
    }

    return NextResponse.json({
      dryRun,
      deletedMemories,
      deletedEvents,
      retainedUncertain,
      errors,
      totalDeleted: deletedMemories + deletedEvents,
    }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (error) {
    console.error('[Cleanup] Error cleaning media:', error);
    return NextResponse.json(
      { error: 'Failed to clean media', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
