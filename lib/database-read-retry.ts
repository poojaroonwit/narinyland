const DEFAULT_RETRY_DELAYS_MS = [150, 300, 600, 1200, 2400, 3600] as const;

const RETRYABLE_READ_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

const TRANSIENT_DATABASE_CODES = new Set(['P1001', 'P1017']);
const TRANSIENT_DATABASE_MESSAGES = [
  "can't reach database server",
  'database system is not yet accepting connections',
  'consistent recovery state has not been yet reached',
  'error in postgresql connection',
  'server has closed the connection',
  'connection closed',
] as const;

type RetryOptions = {
  delaysMs?: readonly number[];
};

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryablePrismaReadOperation(operation: string): boolean {
  return RETRYABLE_READ_OPERATIONS.has(operation);
}

export function isTransientDatabaseReadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as { code?: unknown; message?: unknown };
  if (typeof candidate.code === 'string' && TRANSIENT_DATABASE_CODES.has(candidate.code)) {
    return true;
  }

  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : String(error).toLowerCase();
  return TRANSIENT_DATABASE_MESSAGES.some((fragment) => message.includes(fragment));
}

export async function retryDatabaseRead<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const delaysMs = options.delaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  let retryIndex = 0;

  for (;;) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientDatabaseReadError(error) || retryIndex >= delaysMs.length) {
        throw error;
      }

      await sleep(delaysMs[retryIndex]);
      retryIndex += 1;
    }
  }
}
