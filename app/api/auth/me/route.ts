import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';

type SessionUser = {
  id: string;
  sub: string;
  name?: string;
  email?: string;
  avatar?: string;
  attributes?: Record<string, unknown>;
};

function normalizeUser(user: SessionUser) {
  return {
    id: user.sub,
    sub: user.sub,
    name: user.name || '',
    email: user.email || '',
    avatar: user.avatar || '',
    attributes: user.attributes || {},
  };
}

export async function GET(req: Request) {
  try {
    const session = await getAuthSession(req);
    if (session.error || !session.userId || !session.user) {
      return NextResponse.json({ error: session.error || 'unauthorized' }, { status: session.status || 401 });
    }

    return NextResponse.json(normalizeUser(session.user as SessionUser));
  } catch (error) {
    console.error('BFF /me: Unexpected failure:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
