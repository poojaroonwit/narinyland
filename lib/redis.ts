import Redis from 'ioredis';

type RedisClient = Redis;

type SafeRedis = {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ping(): Promise<string>;
};

const globalForRedis = globalThis as unknown as {
  redisClient: RedisClient | null | undefined;
  redisWarned: boolean | undefined;
};

const redisUrl = process.env.REDIS_PUBLIC_URL || process.env.REDIS_URL;
const shouldCreateClient = Boolean(redisUrl) || process.env.NODE_ENV !== 'production';

function warnRedisFailure(operation: string, error: unknown) {
  if (globalForRedis.redisWarned) return;
  globalForRedis.redisWarned = true;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Redis ${operation} failed; continuing without cache.`, message);
}

function createRedisClient(): RedisClient | null {
  if (!shouldCreateClient) return null;

  const client =
    globalForRedis.redisClient ??
    new Redis(redisUrl || 'redis://localhost:6379', {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        return Math.min(times * 100, 1000);
      },
    });

  client.on('error', (error) => warnRedisFailure('connection', error));

  if (process.env.NODE_ENV !== 'production') globalForRedis.redisClient = client;
  return client;
}

const client = createRedisClient();

async function safeRedisCommand<T>(
  operation: string,
  fallback: T,
  command: (redisClient: RedisClient) => Promise<T>
): Promise<T> {
  if (!client) return fallback;

  try {
    return await command(client);
  } catch (error) {
    warnRedisFailure(operation, error);
    return fallback;
  }
}

export const redis: SafeRedis = {
  get(key) {
    return safeRedisCommand('get', null, (redisClient) => redisClient.get(key));
  },
  setex(key, seconds, value) {
    return safeRedisCommand('setex', 'OK', (redisClient) => redisClient.setex(key, seconds, value));
  },
  del(...keys) {
    return safeRedisCommand('del', 0, (redisClient) => redisClient.del(...keys));
  },
  expire(key, seconds) {
    return safeRedisCommand('expire', 0, (redisClient) => redisClient.expire(key, seconds));
  },
  async ping() {
    if (!client) throw new Error('Redis is not configured');
    return client.ping();
  },
};

export default redis;
