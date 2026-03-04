import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  
  // Clear all auth-related cookies
  cookieStore.delete('appkit_access_token');
  cookieStore.delete('appkit_refresh_token');
  cookieStore.delete('narinyland_is_auth');

  return NextResponse.json({ success: true });
}
