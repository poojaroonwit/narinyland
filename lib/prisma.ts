import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: (() => {
          let url = process.env.DATABASE_URL;
          if (!url) return undefined;
          // Add connection limit if not present to avoid Supabase connection errors
          if (!url.includes('connection_limit')) {
             const separator = url.includes('?') ? '&' : '?';
             // For Supabase, smaller limits are better to prevent "Max clients reached"
             url = `${url}${separator}connection_limit=3&pool_timeout=20`;
          }

          // Detect Supabase Transaction Pooler (port 6543) and ensure pgbouncer=true
          // Note: If you get "MaxClientsInSessionMode" error, ensure your Supabase 
          // dashboard pooler setting is set to "Transaction" mode, NOT "Session".
          if (url.includes(':6543') && !url.includes('pgbouncer=true')) {
             const separator = url.includes('?') ? '&' : '?';
             url = `${url}${separator}pgbouncer=true`;
          }
          
          return url;
        })(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
