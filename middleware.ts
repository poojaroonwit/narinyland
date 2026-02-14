import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * List of bot signatures to block by default.
 * These are typically high-traffic or undesirable scrapers.
 */
const UNDESIRABLE_BOTS = [
  'ahrefsbot',
  'mj12bot',
  'semrushbot',
  'dotbot',
  'rogerbot',
  'exabot',
  'grapeshot',
  'petalbot',
  'gptbot',
  'chatgpt-user',
  'ccbot',
  'claudebot',
  'piplbot',
  'web-crawlers',
  'python-requests',
  'curl',
  'node-fetch',
  'axios',
  'scrapy',
];

export function middleware(request: NextRequest) {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  
  // 1. Check for Legitimate Search Engines (Allow List)
  // Note: Strict DNS verification is not easily possible in Edge Runtime middleware without external APIs.
  // We trust the UA for now or rely on Vercel's built-in protections.
  if (ua.includes('googlebot') || ua.includes('bingbot') || ua.includes('duckduckbot') || ua.includes('baiduspider')) {
    return NextResponse.next();
  }

  // 2. Block Undesirable Bots (Deny List)
  if (UNDESIRABLE_BOTS.some(bot => ua.includes(bot))) {
    console.log(`[AntiBot] Blocked undesirable bot: ${ua}`);
    return new NextResponse(JSON.stringify({ 
      error: 'Direct bot access is prohibited.',
      message: 'If you are a human, please use a standard web browser.' 
    }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // 3. Optional: Block requests with no User-Agent
  // Allowing empty UA for now as some legitimate tools might omit it, but valid browsers usually send it.
  if (!ua || ua.length < 5) {
      // return new NextResponse(JSON.stringify({ error: 'Invalid User-Agent' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
