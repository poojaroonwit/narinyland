function normalizeConfigId(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) return null;
  if (normalized.length > 128) return null;
  if (normalized.includes('..')) return null;
  if (!/^[A-Za-z0-9_.-]+$/.test(normalized)) return null;

  return normalized;
}

function getCookieValue(request: Request, name: string): string | null {
  const cookies = request.headers.get('cookie');
  if (!cookies) return null;

  for (const part of cookies.split(';')) {
    const [rawName, ...valueParts] = part.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return null;
}

function getQueryConfigId(request: Request): string | null {
  try {
    return normalizeConfigId(new URL(request.url).searchParams.get('circleId'));
  } catch {
    return null;
  }
}

export function getExplicitConfigId(request: Request): string | null {
  return (
    normalizeConfigId(request.headers.get('X-Circle-Id')) ||
    getQueryConfigId(request) ||
    normalizeConfigId(getCookieValue(request, 'narinyland_circle_id'))
  );
}

/**
 * Extracts the active circle/config ID from the request. API calls send
 * X-Circle-Id; browser streams can use ?circleId=; browser media requests
 * use the same-site circle cookie.
 * Falls back to 'default' for backwards compatibility.
 */
export function getConfigId(request: Request): string {
  return getExplicitConfigId(request) || 'default';
}
