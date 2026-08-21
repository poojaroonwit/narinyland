import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

async function loadRetryModule() {
  try {
    return await import('../lib/database-read-retry');
  } catch (error) {
    assert.fail(`database read retry helper is missing: ${error instanceof Error ? error.message : String(error)}`);
  }
}

test('transient Railway database read failures retry and recover', async () => {
  const retryModule = await loadRetryModule();
  let attempts = 0;

  const result = await retryModule.retryDatabaseRead(
    async () => {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error("Can't reach database server at `postgres.railway.internal:5432`") as Error & { code?: string };
        error.code = 'P1001';
        throw error;
      }
      return 'ready';
    },
    { delaysMs: [0, 0, 0] },
  );

  assert.equal(result, 'ready');
  assert.equal(attempts, 3);
});

test('non-transient database errors fail immediately', async () => {
  const retryModule = await loadRetryModule();
  let attempts = 0;

  await assert.rejects(
    retryModule.retryDatabaseRead(
      async () => {
        attempts += 1;
        const error = new Error('Unique constraint failed') as Error & { code?: string };
        error.code = 'P2002';
        throw error;
      },
      { delaysMs: [0, 0, 0] },
    ),
    /Unique constraint failed/,
  );

  assert.equal(attempts, 1);
});

test('only read-only Prisma operations are eligible for automatic retry', async () => {
  const retryModule = await loadRetryModule();

  for (const operation of ['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy']) {
    assert.equal(retryModule.isRetryablePrismaReadOperation(operation), true, `${operation} should retry`);
  }

  for (const operation of ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']) {
    assert.equal(retryModule.isRetryablePrismaReadOperation(operation), false, `${operation} must never auto-retry`);
  }
});

test('Prisma client applies retry only through the read-operation gate', async () => {
  const source = await readFile(new URL('../lib/prisma.ts', import.meta.url), 'utf8');

  assert.match(source, /\$extends/);
  assert.match(source, /\$allModels/);
  assert.match(source, /\$allOperations/);
  assert.match(source, /isRetryablePrismaReadOperation\(operation\)/);
  assert.match(source, /retryDatabaseRead\(\(\) => query\(args\)\)/);
});
