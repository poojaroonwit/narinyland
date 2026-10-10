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

// Prefer Railway's private network so cache traffic does not traverse the public TCP proxy.
const redisUrl = process.env.REDIS_URL || process.env.REDIS_PUBLIC_URL;
const REDIS_IDLE_DISCONNECT_MS = 60_000;
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
      // An imported module should not open a Redis socket before its first command.
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      // Never retry on a background loop after a transient outage; the next
      // request explicitly reconnects and can wake a sleeping Redis instance.
      retryStrategy: () => null,
    });

  redisClient.on('error', (error) => warnRedisFailure('connection', error));

  if (process.env.NODE_ENV !== 'production') globalForRedis.redisClient = redisClient;
  return redisClient;
}

const client = createRedisClient();
let activeCommands = 0;
let connectPromise: Promise<void> | null = null;
let idleDisconnectTimer: ReturnType<typeof setTimeout> | null = null;

function cancelIdleDisconnect() {
  if (!idleDisconnectTimer) return;
  clearTimeout(idleDisconnectTimer);
  idleDisconnectTimer = null;
}

function scheduleIdleDisconnect() {
  if (!client || activeCommands > 0) return;
  cancelIdleDisconnect();
  idleDisconnectTimer = setTimeout(() => {
    idleDisconnectTimer = null;
    if (activeCommands === 0 && client.status !== 'end') client.disconnect();
  }, REDIS_IDLE_DISCONNECT_MS);
  idleDisconnectTimer.unref?.();
}

/**
 * Use the shared client only while it serves a command. A permanently open
 * Redis socket emits network traffic even when the game has no visitors,
 * preventing Railway Serverless from sleeping.
 */
async function executeRedisCommand<T>(command: (redisClient: RedisClient) => Promise<T>): Promise<T> {
  if (!client) throw new Error('Redis is not configured');
  cancelIdleDisconnect();
  activeCommands += 1;
  try {
    if (client.status !== 'ready') {
      if (!connectPromise) {
        connectPromise = client.connect().finally(() => {
          connectPromise = null;
        });
      }
      await connectPromise;
    }
    return await command(client);
  } finally {
    activeCommands -= 1;
    scheduleIdleDisconnect();
  }
}

export function createRedisSubscriber(): RedisClient | null {
  if (!shouldCreateClient) return null;

  // Subscriptions belong to a live SSE request and are closed by its abort/
  // cancel handler. Unlike the command client they must stay connected while
  // a real user is listening for world updates.
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
    return await executeRedisCommand(command);
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
  cancelIdleDisconnect();
  if (!client) return;
  // Disconnect locally instead of sending an unnecessary QUIT packet as the
  // server exits. The next command can reconnect through executeRedisCommand.
  client.disconnect();
  if (globalForRedis.redisClient === client) globalForRedis.redisClient = null;
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
    return executeRedisCommand((redisClient) => redisClient.ping());
  },
};

export default redis;
