import { NextResponse } from 'next/server';
import { getHeadlessAuthConfig } from '@/lib/appkit-headless-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getHeadlessAuthConfig();
    return NextResponse.json(config, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('AppKit auth config error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Authentication configuration unavailable' }, { status: 503 });
  }
}
