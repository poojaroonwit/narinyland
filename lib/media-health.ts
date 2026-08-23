export type RemoteMediaHealth = 'healthy' | 'broken' | 'uncertain';

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function classifyRemoteMediaStatus(status: number): RemoteMediaHealth {
  if (status >= 200 && status < 400) return 'healthy';
  if (status === 404 || status === 410) return 'broken';
  return 'uncertain';
}

export async function checkRemoteMediaHealth(
  url: string | null | undefined,
  options: { fetcher?: FetchLike; timeoutMs?: number } = {},
): Promise<RemoteMediaHealth> {
  if (!url || typeof url !== 'string' || !url.trim()) return 'broken';
  if (url.startsWith('/api/serve-image')) return 'healthy';

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'broken';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'broken';

  const fetcher = options.fetcher ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);

  try {
    const response = await fetcher(parsed, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    return classifyRemoteMediaStatus(response.status);
  } catch {
    return 'uncertain';
  } finally {
    clearTimeout(timeout);
  }
}
