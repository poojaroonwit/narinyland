import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { requireAdminRequest } from '@/lib/security';
import { isSafeStorageKey } from '@/lib/upload-validation';

type BrokenMediaItem = {
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
  createdAt: Date;
};

const CLEANUP_TARGETS = ['all', 'memories', 'timeline'] as const;
type CleanupTarget = (typeof CLEANUP_TARGETS)[number];

// Helper function to validate image URL
async function validateImageUrl(url: string | null | undefined): Promise<boolean> {
  try {
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return false;
    }

    if (url.startsWith('/api/serve-image')) {
      return true;
    }

    // Check URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }

    // Try to fetch the image to check if it's accessible
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return response.ok;
  } catch {
    return false;
  }
}

// Helper function to validate managed storage references.
function validateStorageReference(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  if (isSafeStorageKey(value)) return true;
  
  const legacyCloudPatterns = [
    /s3\.amazonaws\.com/,
    /\.s3\.amazonaws\.com/,
    /s3-[^/]+\.amazonaws\.com/,
    /s3-[^/]+\.amazonaws\.com\.cn/,
    /storage\.googleapis\.com/
  ];
  
  return legacyCloudPatterns.some(pattern => pattern.test(value));
}

function isCleanupTarget(value: unknown): value is CleanupTarget {
  return typeof value === 'string' && CLEANUP_TARGETS.includes(value as CleanupTarget);
}

// GET /api/cleanup - Analyze broken images
export async function GET(request: Request) {
  const adminRejection = requireAdminRequest(request);
  if (adminRejection) return adminRejection;

  try {
    console.log('[Cleanup] Starting broken image analysis.');

    // Get all memories
    const memories = await prisma.memory.findMany({
      select: {
        id: true,
        url: true,
        s3Key: true,
        privacy: true,
        caption: true,
        configId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' }
    });

    // Get all timeline events with media
    const timelineEvents = await prisma.timelineEvent.findMany({
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
      orderBy: { createdAt: 'asc' }
    });

    console.log(`[Cleanup] Found ${memories.length} memories and ${timelineEvents.length} timeline events.`);

    // Analyze memories
    const memoryAnalysis = {
      total: memories.length,
      valid: 0,
      broken: 0,
      brokenItems: [] as BrokenMediaItem[]
    };

    for (const memory of memories) {
      const isUrlValid = await validateImageUrl(memory.url);
      const isStorageKeyValid = memory.s3Key ? validateStorageReference(memory.s3Key) : true;
      
      if (memory.url && isUrlValid && isStorageKeyValid) {
        memoryAnalysis.valid++;
      } else {
        memoryAnalysis.broken++;
        memoryAnalysis.brokenItems.push({
          id: memory.id,
          url: memory.url,
          s3Key: memory.s3Key,
          privacy: memory.privacy,
          caption: memory.caption,
          issue: !memory.url ? 'Empty URL' : (!isUrlValid ? 'Invalid URL' : (!isStorageKeyValid ? 'Invalid storage reference' : 'Unknown')),
          createdAt: memory.createdAt
        });
      }
    }

    // Analyze timeline events
    const timelineAnalysis = {
      total: timelineEvents.length,
      valid: 0,
      broken: 0,
      brokenItems: [] as BrokenMediaItem[]
    };

    for (const event of timelineEvents) {
      const allMediaUrls = [event.mediaUrl, ...(event.mediaUrls || [])].filter((url): url is string => Boolean(url));
      const allStorageKeys = [event.mediaS3Key, ...(event.mediaS3Keys || [])].filter((key): key is string => Boolean(key));
      
      let hasValidMedia = false;
      let hasBrokenMedia = false;
      
      for (const url of allMediaUrls) {
        const isValid = await validateImageUrl(url);
        if (isValid) {
          hasValidMedia = true;
        } else {
          hasBrokenMedia = true;
          break;
        }
      }
      
      for (const storageKey of allStorageKeys) {
        const isValid = validateStorageReference(storageKey);
        if (!isValid) {
          hasBrokenMedia = true;
          break;
        }
      }
      
      if (allMediaUrls.length === 0) {
        // No media to check
        timelineAnalysis.valid++;
      } else if (hasValidMedia && !hasBrokenMedia) {
        timelineAnalysis.valid++;
      } else {
        timelineAnalysis.broken++;
        timelineAnalysis.brokenItems.push({
          id: event.id,
          mediaUrl: event.mediaUrl,
          mediaS3Key: event.mediaS3Key,
          mediaUrls: allMediaUrls,
          mediaS3Keys: allStorageKeys,
          text: event.text,
          issue: allMediaUrls.length === 0 ? 'No media' : (hasBrokenMedia ? 'Broken media found' : 'Unknown'),
          createdAt: event.createdAt
        });
      }
    }

    const totalAnalysis = {
      memories: memoryAnalysis,
      timelineEvents: timelineAnalysis,
      summary: {
        totalItems: memoryAnalysis.total + timelineAnalysis.total,
        totalBroken: memoryAnalysis.broken + timelineAnalysis.broken,
        totalValid: memoryAnalysis.valid + timelineAnalysis.valid
      }
    };

    console.log('[Cleanup] Analysis results:');
    console.log(`   Memories: ${memoryAnalysis.valid} valid, ${memoryAnalysis.broken} broken`);
    console.log(`   Timeline Events: ${timelineAnalysis.valid} valid, ${timelineAnalysis.broken} broken`);
    console.log(`   Total: ${totalAnalysis.summary.totalValid} valid, ${totalAnalysis.summary.totalBroken} broken`);

    return NextResponse.json(totalAnalysis, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    console.error('[Cleanup] Error analyzing broken images:', error);
    return NextResponse.json(
      { error: 'Failed to analyze broken images', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/cleanup - Clean broken images
export async function DELETE(request: Request) {
  const adminRejection = requireAdminRequest(request);
  if (adminRejection) return adminRejection;

  try {
    console.log('[Cleanup] Starting broken image cleanup.');

    const body = await request.json();
    const { dryRun = false, targetTable = 'all' } = body;

    if (!isCleanupTarget(targetTable)) {
      return NextResponse.json(
        { error: `Invalid targetTable. Expected one of: ${CLEANUP_TARGETS.join(', ')}` },
        { status: 400 }
      );
    }
    
    console.log(`[Cleanup] Configuration: dryRun=${dryRun}, targetTable=${targetTable}.`);

    let deletedMemories = 0;
    let deletedEvents = 0;
    const errors: string[] = [];
    const affectedConfigIds = new Set<string>();

    // Clean memories
    if (targetTable === 'all' || targetTable === 'memories') {
      const memories = await prisma.memory.findMany({
        select: { id: true, url: true, s3Key: true, privacy: true, caption: true, configId: true, createdAt: true }
      });

      for (const memory of memories) {
        const isUrlValid = await validateImageUrl(memory.url);
        const isStorageKeyValid = memory.s3Key ? validateStorageReference(memory.s3Key) : true;
        
        if (memory.url && (!isUrlValid || !isStorageKeyValid)) {
          console.log(`   Deleting memory: ${memory.id.substring(0, 8)}... (${memory.url?.substring(0, 50)}...)`);
          
          if (!dryRun) {
            try {
              await prisma.memory.delete({ where: { id: memory.id } });
              affectedConfigIds.add(memory.configId);
              deletedMemories++;
            } catch (error) {
              errors.push(`Failed to delete memory ${memory.id}: ${error}`);
            }
          } else {
            deletedMemories++;
          }
        }
      }
    }

    // Clean timeline events
    if (targetTable === 'all' || targetTable === 'timeline') {
      const events = await prisma.timelineEvent.findMany({
        select: { id: true, configId: true, mediaUrl: true, mediaS3Key: true, mediaUrls: true, mediaS3Keys: true, text: true }
      });

      for (const event of events) {
        const allMediaUrls = [event.mediaUrl, ...(event.mediaUrls || [])].filter(Boolean);
        const allStorageKeys = [event.mediaS3Key, ...(event.mediaS3Keys || [])].filter((key): key is string => Boolean(key));
        
        let hasValidMedia = false;
        let hasBrokenMedia = false;
        
        // Check all media URLs
        for (const url of allMediaUrls) {
          const isValid = await validateImageUrl(url);
          if (isValid) {
            hasValidMedia = true;
          } else {
            hasBrokenMedia = true;
            break;
          }
        }
        
        // Check all managed storage keys.
        for (const storageKey of allStorageKeys) {
          const isValid = validateStorageReference(storageKey);
          if (!isValid) {
            hasBrokenMedia = true;
            break;
          }
        }
        
        // Delete if no valid media or has broken media
        if ((allMediaUrls.length > 0 || allStorageKeys.length > 0) && (!hasValidMedia || hasBrokenMedia)) {
          console.log(`   Deleting timeline event: ${event.id.substring(0, 8)}... (${event.text?.substring(0, 50)}...)`);
          
          if (!dryRun) {
            try {
              await prisma.timelineEvent.delete({ where: { id: event.id } });
              affectedConfigIds.add(event.configId);
              deletedEvents++;
            } catch (error) {
              errors.push(`Failed to delete timeline event ${event.id}: ${error}`);
            }
          } else {
            deletedEvents++;
          }
        }
      }
    }

    // Clear cache after cleanup
    if (!dryRun && (deletedMemories > 0 || deletedEvents > 0)) {
      console.log('[Cleanup] Clearing cache.');
      await Promise.all(
        [...affectedConfigIds].flatMap((configId) => [
          redis.del(`app_config:${configId}`),
          redis.del(`timeline_events:${configId}`),
          redis.del(`memories:${configId}:all`),
          redis.del(`memories:${configId}:public`),
          redis.del(`memories:${configId}:private`),
        ])
      );
    }

    const result = {
      dryRun,
      deletedMemories,
      deletedEvents,
      errors,
      totalDeleted: deletedMemories + deletedEvents
    };

    console.log('[Cleanup] Cleanup results:');
    console.log(`   Deleted ${deletedMemories} memories`);
    console.log(`   Deleted ${deletedEvents} timeline events`);
    console.log(`   Total deleted: ${result.totalDeleted} items`);
    if (errors.length > 0) {
      console.log('   Errors encountered:');
      errors.forEach(error => console.log(`     ${error}`));
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    console.error('[Cleanup] Error cleaning broken images:', error);
    return NextResponse.json(
      { error: 'Failed to clean broken images', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
