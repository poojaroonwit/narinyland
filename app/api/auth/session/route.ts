import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';

export async function GET(request: Request) {
  const session = await getAuthSession(request);
  return NextResponse.json({ authenticated: !session.error && Boolean(session.userId) });
}
