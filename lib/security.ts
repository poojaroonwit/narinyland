import { NextResponse } from 'next/server';

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin || !host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function rejectCrossOrigin(request: Request): NextResponse | null {
  if (isSameOrigin(request)) return null;
  return NextResponse.json(
    { error: 'forbidden', error_description: 'CSRF validation failed' },
    { status: 403 }
  );
}

export function requireAdminRequest(request: Request): NextResponse | null {
  const configuredToken = process.env.ADMIN_API_TOKEN;

  if (process.env.NODE_ENV !== 'production' && !configuredToken) {
    return null;
  }

  if (!configuredToken) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (request.headers.get('x-admin-token') !== configuredToken) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return null;
}
