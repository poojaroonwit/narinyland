/**
 * Extracts the active circle/config ID from the request headers.
 * Frontend sends X-Circle-Id header; backend uses it as the Prisma configId.
 * Falls back to 'default' for backwards compatibility.
 */
export function getConfigId(request: Request): string {
  const circleId = request.headers.get('X-Circle-Id');
  const normalized = circleId?.trim();

  if (!normalized) return 'default';
  if (normalized.length > 128) return 'default';
  if (!/^[A-Za-z0-9_.-]+$/.test(normalized)) return 'default';

  return normalized;
}
