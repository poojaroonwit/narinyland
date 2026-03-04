import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const isAuth = cookieStore.get('narinyland_is_auth')?.value === 'true';
  
  return NextResponse.json({ 
    authenticated: isAuth,
    // We don't return the token here, just the status
  });
}
