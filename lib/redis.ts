import Redis from 'ioredis';

type RedisClient = Redis;

type SafeRedis = {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  del(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrem(key: string, ...members: string[]): Promise<number>;
  zrangebyscore(key: string, min: number, max: number): Promise<string[]>;
  zremrangebyscore(key: string, min: number, max: number): Promise<number>;
  publish(channel: string, message: string): Promise<number>;
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

  const redisClient =
    globalForRedis.redisClient ??
    new Redis(redisUrl || 'redis://localhost:6379', {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        return Math.min(times * 100, 1000);
      },
    });

  redisClient.on('error', (error) => warnRedisFailure('connection', error));

  if (process.env.NODE_ENV !== 'production') globalForRedis.redisClient = redisClient;
  return redisClient;
}

const client = createRedisClient();

export function createRedisSubscriber(): RedisClient | null {
  if (!shouldCreateClient) return null;

  const subscriber = new Redis(redisUrl || 'redis://localhost:6379', {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      return Math.min(times * 100, 1000);
    },
  });

  subscriber.on('error', (error) => warnRedisFailure('subscriber connection', error));
  return subscriber;
}

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

export async function redisSetNxPx(key: string, value: string, ttlMs: number): Promise<boolean> {
  return safeRedisCommand('set nx px', false, async (redisClient) => {
    const result = await redisClient.set(key, value, 'PX', ttlMs, 'NX');
    return result === 'OK';
  });
}

export async function redisEval<T>(
  operation: string,
  fallback: T,
  script: string,
  keys: string[],
  args: Array<string | number>,
): Promise<T> {
  return safeRedisCommand(operation, fallback, async (redisClient) => {
    const result = await redisClient.eval(script, keys.length, ...keys, ...args.map(String));
    return result as T;
  });
}

export async function closeRedisConnection(): Promise<void> {
  if (!client) return;
  try {
    if (client.status !== 'end') await client.quit();
  } catch (error) {
    warnRedisFailure('close', error);
    client.disconnect();
  } finally {
    if (globalForRedis.redisClient === client) globalForRedis.redisClient = null;
  }
}

export const redis: SafeRedis = {
  get(key) {
    return safeRedisCommand('get', null, (redisClient) => redisClient.get(key));
  },
  setex(key, seconds, value) {
    return safeRedisCommand('setex', 'OK', (redisClient) => redisClient.setex(key, seconds, value));
  },
  mget(...keys) {
    return safeRedisCommand('mget', keys.map(() => null), (redisClient) => redisClient.mget(...keys));
  },
  del(...keys) {
    return safeRedisCommand('del', 0, (redisClient) => redisClient.del(...keys));
  },
  expire(key, seconds) {
    return safeRedisCommand('expire', 0, (redisClient) => redisClient.expire(key, seconds));
  },
  zadd(key, score, member) {
    return safeRedisCommand('zadd', 0, (redisClient) => redisClient.zadd(key, score, member));
  },
  zrem(key, ...members) {
    return safeRedisCommand('zrem', 0, (redisClient) => redisClient.zrem(key, ...members));
  },
  zrangebyscore(key, min, max) {
    return safeRedisCommand('zrangebyscore', [], (redisClient) => redisClient.zrangebyscore(key, min, max));
  },
  zremrangebyscore(key, min, max) {
    return safeRedisCommand('zremrangebyscore', 0, (redisClient) => redisClient.zremrangebyscore(key, min, max));
  },
  publish(channel, message) {
    return safeRedisCommand('publish', 0, (redisClient) => redisClient.publish(channel, message));
  },
  async ping() {
    if (!client) throw new Error('Redis is not configured');
    return client.ping();
  },
};

export default redis;
