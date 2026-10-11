/**
 * Let Railway Serverless sleep by closing Prisma's idle TCP connection pool.
 * Only close after all in-flight queries (including retries and raw queries)
 * complete. New queries await a pending disconnect to avoid races.
 */
export function createIdleDisconnectGuard(
  disconnect: () => Promise<void>,
  idleMs = 120_000,
) {
  let active = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disconnecting: Promise<void> | null = null;

  function clearIdleTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function scheduleDisconnect() {
    if (active !== 0 || timer || disconnecting) return;
    timer = setTimeout(() => {
      timer = null;
      if (active !== 0 || disconnecting) return;
      disconnecting = Promise.resolve()
        .then(disconnect)
        .catch((error: unknown) => {
          console.warn('Failed to disconnect idle database pool.', error);
        })
        .finally(() => {
          disconnecting = null;
        });
    }, idleMs);
    timer.unref?.();
  }

  async function run<T>(query: () => Promise<T>): Promise<T> {
    clearIdleTimer();
    active += 1;
    try {
      if (disconnecting) await disconnecting;
      return await query();
    } finally {
      active -= 1;
      scheduleDisconnect();
    }
  }

  return { run };
}
