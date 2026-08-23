import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const UNDESIRABLE_BOTS = [
  'ahrefsbot', 'mj12bot', 'semrushbot', 'dotbot', 'rogerbot', 'exabot',
  'grapeshot', 'petalbot', 'gptbot', 'chatgpt-user', 'ccbot', 'claudebot',
  'piplbot', 'web-crawlers', 'python-requests', 'curl', 'node-fetch', 'axios', 'scrapy',
];

const PUBLIC_API_PREFIXES = ['/api/auth', '/api/config/appkit', '/api/health'];
const LOCAL_AUTH_PATHS = ['/login', '/signup'];
const PROTECTED_PAGE_PREFIXES = ['/garden', '/onboarding', '/board'];

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
    request.cookies.get('narinyland_session')?.value ||
    request.cookies.get('appkit_access_token')?.value ||
    request.cookies.get('appkit_refresh_token')?.value
  );
}

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isLocalAuthPage(pathname: string): boolean {
  return LOCAL_AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const hasSession = hasServerSessionCookie(request);

  if (pathname === '/api/health') return NextResponse.next();

  if (pathname.startsWith('/api') && isUnsafeMethod(request.method) && !isSameOrigin(request)) {
    return NextResponse.json(
      { error: 'forbidden', error_description: 'CSRF validation failed' },
      { status: 403 }
    );
  }

  if (!pathname.startsWith('/api')) {
    if (isProtectedPage(pathname) && !hasSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
    if (isLocalAuthPage(pathname) && hasSession) {
      return NextResponse.redirect(new URL('/garden', request.url));
    }
  }

  if (ua.includes('googlebot') || ua.includes('bingbot') || ua.includes('duckduckbot') || ua.includes('baiduspider')) {
    return NextResponse.next();
  }

  if (UNDESIRABLE_BOTS.some((bot) => ua.includes(bot))) {
    console.log(`[AntiBot] Blocked undesirable bot: ${ua}`);
    return new NextResponse(JSON.stringify({
      error: 'Direct bot access is prohibited.',
      message: 'If you are a human, please use a standard web browser.',
    }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  if (
    pathname.startsWith('/api') &&
    !PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !hasSession
  ) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/garden/:path*',
    '/onboarding/:path*',
    '/board/:path*',
    '/login',
    '/signup',
  ],
};
