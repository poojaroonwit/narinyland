function normalizeOrigin(value: string | undefined) {
  if (!value?.trim()) return '';
  const raw = value.trim();
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(candidate).origin;
  } catch {
    return '';
  }
}

export function getTrustedNarinylandOrigin(req?: Request) {
  const configured =
    normalizeOrigin(process.env.NARINYLAND_PUBLIC_ORIGIN) ||
    normalizeOrigin(process.env.RAILWAY_PUBLIC_DOMAIN) ||
    normalizeOrigin(process.env.RAILWAY_STATIC_URL);
  if (configured) return configured;

  if (req) {
    const requestOrigin = new URL(req.url).origin;
    const hostname = new URL(requestOrigin).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return requestOrigin;
  }

  throw new Error('Narinyland public origin is not configured');
}
