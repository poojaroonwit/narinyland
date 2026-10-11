import { PrismaClient } from '@prisma/client';
import { isRetryablePrismaReadOperation, retryDatabaseRead } from './database-read-retry';
import { createIdleDisconnectGuard } from './database-idle';

function buildDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Add connection limit if not present to avoid Supabase connection errors.
  if (!url.includes('connection_limit')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}connection_limit=3&pool_timeout=20`;
  }

  // Detect Supabase Transaction Pooler (port 6543) and ensure pgbouncer=true.
  if (url.includes(':6543') && !url.includes('pgbouncer=true')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}pgbouncer=true`;
  }

  return url;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
  });

  // Prisma pools are lazy to connect but otherwise stay open indefinitely.
  // Idle sockets can prevent Railway Serverless from sleeping even without visitors.
  const idleGuard = process.env.NODE_ENV === 'production'
    ? createIdleDisconnectGuard(() => client.$disconnect())
    : null;

  const extended = client.$extends({
    name: 'railway-read-recovery',
    query: {
      // Covers model operations and raw queries (including /api/health).
      async $allOperations({ operation, args, query }) {
        const performQuery = () => isRetryablePrismaReadOperation(operation)
          ? retryDatabaseRead(() => query(args))
          : query(args);
        return idleGuard ? idleGuard.run(performQuery) : performQuery();
      },
    },
  });

  // This extension only intercepts query execution; it does not add or alter
  // client/model APIs. Keep the public type as PrismaClient so existing
  // Prisma.TransactionClient contracts remain compatible.
  return extended as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
