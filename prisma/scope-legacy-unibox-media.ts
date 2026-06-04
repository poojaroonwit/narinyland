import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  getConfigIdFromStorageKey,
  isUniboxStorageKey,
  scopeLegacyUniboxStorageKey,
} from '../lib/media-key';

const prisma = new PrismaClient();
const WRITE = process.argv.includes('--write');

type Change = {
  model: 'Memory' | 'TimelineEvent' | 'LoveLetter';
  id: string;
  field: string;
  before: string;
  after: string;
};

type UnsupportedKey = {
  model: 'Memory' | 'TimelineEvent' | 'LoveLetter';
  id: string;
  field: string;
  key: string;
  reason: string;
};

function scopedUniboxChange(
  model: Change['model'],
  id: string,
  field: string,
  key: string | null | undefined,
  configId: string
): Change | UnsupportedKey | null {
  if (!key) return null;
  if (getConfigIdFromStorageKey(key)) return null;

  const scoped = scopeLegacyUniboxStorageKey(key, configId);
  if (scoped) {
    return { model, id, field, before: key, after: scoped };
  }

  if (isUniboxStorageKey(key)) {
    return { model, id, field, key, reason: 'Invalid UniBox key shape' };
  }

  return { model, id, field, key, reason: 'Legacy S3-style key requires object copy before DB rewrite' };
}

function collectResult(result: Change | UnsupportedKey | null, changes: Change[], unsupported: UnsupportedKey[]) {
  if (!result) return;
  if ('after' in result) {
    changes.push(result);
  } else {
    unsupported.push(result);
  }
}

function isMissingColumnError(error: unknown): error is { code: string; meta?: { column?: unknown } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2022'
  );
}

async function main() {
  const changes: Change[] = [];
  const unsupported: UnsupportedKey[] = [];

  const memories = await prisma.memory.findMany({
    select: { id: true, configId: true, s3Key: true },
  });

  for (const memory of memories) {
    collectResult(
      scopedUniboxChange('Memory', memory.id, 's3Key', memory.s3Key, memory.configId),
      changes,
      unsupported
    );
  }

  const events = await prisma.timelineEvent.findMany({
    select: { id: true, configId: true, mediaS3Key: true, mediaS3Keys: true },
  });

  for (const event of events) {
    const single = scopedUniboxChange('TimelineEvent', event.id, 'mediaS3Key', event.mediaS3Key, event.configId);
    collectResult(single, changes, unsupported);

    for (const key of event.mediaS3Keys) {
      const change = scopedUniboxChange('TimelineEvent', event.id, 'mediaS3Keys', key, event.configId);
      collectResult(change, changes, unsupported);
    }
  }

  const letters = await prisma.loveLetter.findMany({
    select: {
      id: true,
      mediaS3Key: true,
      from: { select: { configId: true } },
    },
  });

  for (const letter of letters) {
    collectResult(
      scopedUniboxChange('LoveLetter', letter.id, 'mediaS3Key', letter.mediaS3Key, letter.from.configId),
      changes,
      unsupported
    );
  }

  console.log(`Legacy UniBox keys to scope: ${changes.length}`);
  console.log(`Unsupported legacy keys requiring manual object migration: ${unsupported.length}`);

  for (const item of unsupported.slice(0, 25)) {
    console.warn(`[unsupported] ${item.model}.${item.field} ${item.id}: ${item.key} (${item.reason})`);
  }

  if (!WRITE) {
    console.log('Dry run only. Re-run with --write to update scoped UniBox keys.');
    return;
  }

  for (const change of changes) {
    if (change.model === 'Memory') {
      await prisma.memory.update({
        where: { id: change.id },
        data: { s3Key: change.after, url: `/api/serve-image?key=${encodeURIComponent(change.after)}` },
      });
    }

    if (change.model === 'TimelineEvent' && change.field === 'mediaS3Key') {
      await prisma.timelineEvent.update({
        where: { id: change.id },
        data: { mediaS3Key: change.after },
      });
    }

    if (change.model === 'LoveLetter') {
      await prisma.loveLetter.update({
        where: { id: change.id },
        data: { mediaS3Key: change.after, mediaUrl: `/api/serve-image?key=${encodeURIComponent(change.after)}` },
      });
    }
  }

  for (const event of events) {
    const nextKeys = event.mediaS3Keys.map((key) => {
      const change = changes.find((item) => item.model === 'TimelineEvent' && item.id === event.id && item.field === 'mediaS3Keys' && item.before === key);
      return change?.after || key;
    });

    if (nextKeys.some((key, index) => key !== event.mediaS3Keys[index])) {
      await prisma.timelineEvent.update({
        where: { id: event.id },
        data: {
          mediaS3Keys: nextKeys,
          mediaUrls: nextKeys.map((key) => `/api/serve-image?key=${encodeURIComponent(key)}`),
        },
      });
    }
  }

  console.log(`Updated ${changes.length} scoped UniBox key references.`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    if (isMissingColumnError(error)) {
      console.error(
        `Database schema is not current; missing column ${String(error.meta?.column || 'unknown')}. Run the pending Prisma migration/deploy step before scoping legacy media.`
      );
      process.exit(1);
    }
    console.error(error);
    process.exit(1);
  });
