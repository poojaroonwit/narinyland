import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rejectCrossOrigin } from '@/lib/security';
import { deleteSession, SESSION_COOKIE_NAME } from '@/lib/session-store';

export async function POST(req: Request) {
  const csrfRejection = rejectCrossOrigin(req);
  if (csrfRejection) return csrfRejection;

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  await deleteSession(sessionId);

  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete('appkit_access_token');
  cookieStore.delete('appkit_refresh_token');
  cookieStore.delete('narinyland_is_auth');
  cookieStore.delete('narinyland_sub');

  return NextResponse.json({ success: true });
}
