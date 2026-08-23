import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
    if (session.error || !session.userId) {
      return NextResponse.json({ error: session.error || 'unauthorized' }, { status: session.status || 401 });
    }

    if (session.user) {
      return NextResponse.json(normalizeUser(session.user as SessionUser));
    }

    // Secure fallback for legacy/local sessions: identity is already proven by
    // the opaque session, so profile decoration may come from the local Partner.
    const partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { id: session.userId },
          { userId: session.userId },
          { partnerId: session.userId },
        ],
      },
      select: { id: true, name: true, avatar: true },
    });

    return NextResponse.json({
      id: session.userId,
      sub: session.userId,
      name: partner?.name || '',
      email: '',
      avatar: partner?.avatar || '',
      attributes: {},
    });
  } catch (error) {
    console.error('BFF /me: Unexpected failure:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
