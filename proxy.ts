import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * List of bot signatures to block by default.
 * These are typically high-traffic or undesirable scrapers.
 */
const UNDESIRABLE_BOTS = [
  'ahrefsbot',
  'mj12bot',
  'semrushbot',
  'dotbot',
  'rogerbot',
  'exabot',
  'grapeshot',
  'petalbot',
  'gptbot',
  'chatgpt-user',
  'ccbot',
  'claudebot',
  'piplbot',
  'web-crawlers',
  'python-requests',
  'curl',
  'node-fetch',
  'axios',
  'scrapy',
];

const PUBLIC_API_PREFIXES = [
  '/api/auth',
  '/api/config/appkit',
  '/api/health',
];

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin || !host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function isUnsafeMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

function hasServerSessionCookie(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get('appkit_access_token')?.value ||
    request.cookies.get('appkit_refresh_token')?.value ||
    request.cookies.get('narinyland_sub')?.value
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ua = (request.headers.get('user-agent') || '').toLowerCase();

  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api') && isUnsafeMethod(request.method) && !isSameOrigin(request)) {
    return NextResponse.json(
      { error: 'forbidden', error_description: 'CSRF validation failed' },
      { status: 403 }
    );
  }
  
  // 1. Check for Legitimate Search Engines (Allow List)
  // Note: Strict DNS verification is not easily possible in Edge Runtime middleware without external APIs.
  // We trust the UA for now or rely on Vercel's built-in protections.
  if (ua.includes('googlebot') || ua.includes('bingbot') || ua.includes('duckduckbot') || ua.includes('baiduspider')) {
    return NextResponse.next();
  }

  // 2. Block Undesirable Bots (Deny List)
  if (UNDESIRABLE_BOTS.some(bot => ua.includes(bot))) {
    console.log(`[AntiBot] Blocked undesirable bot: ${ua}`);
    return new NextResponse(JSON.stringify({ 
      error: 'Direct bot access is prohibited.',
      message: 'If you are a human, please use a standard web browser.' 
    }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // 3. Optional: Block requests with no User-Agent
  // Allowing empty UA for now as some legitimate tools might omit it, but valid browsers usually send it.
  if (!ua || ua.length < 5) {
      // return new NextResponse(JSON.stringify({ error: 'Invalid User-Agent' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  if (
    pathname.startsWith('/api') &&
    !PUBLIC_API_PREFIXES.some(prefix => pathname.startsWith(prefix)) &&
    !hasServerSessionCookie(request)
  ) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
