import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { isTransientDatabaseReadError } from '../lib/database-read-retry';

test('production startup never runs destructive cleanup', async () => {
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.doesNotMatch(dockerfile, /cleanup-db\.cjs/);
  assert.doesNotMatch(dockerfile, /prisma\s+db\s+push/);
});

test('production startup waits for Railway Postgres recovery before serving traffic', async () => {
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
  const startup = await readFile(new URL('../scripts/start-production.sh', import.meta.url), 'utf8');

  assert.match(dockerfile, /COPY --from=builder --chown=nextjs:nodejs \/app\/scripts\/start-production\.sh \.\/scripts\/start-production\.sh/);
  assert.match(dockerfile, /CMD \["sh", "scripts\/start-production\.sh"\]/);
  assert.match(startup, /until npx prisma migrate deploy/);
  assert.match(startup, /DB_STARTUP_MAX_ATTEMPTS/);
  assert.match(startup, /Database not ready; retrying migration/);
  assert.match(startup, /exec node server\.js/);
});

test('runtime reads retry Railway Postgres while the database system is starting up', () => {
  assert.equal(
    isTransientDatabaseReadError(new Error('Error querying the database: FATAL: the database system is starting up')),
    true,
  );
  assert.equal(
    isTransientDatabaseReadError(new Error("Invalid prisma.appConfig.findMany invocation: Can't reach database server at postgres.railway.internal:5432")),
    true,
  );
});
