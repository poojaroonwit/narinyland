import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/auth/callback'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(path => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`)));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = request.cookies.get('narinyland_is_auth')?.value === 'true';

  if (!authenticated && !isPublicPath(pathname)) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/garden', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|images).*)'],
};
