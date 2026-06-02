import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

const MAX_PROXY_IMAGE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;

function parseUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

function isInstagramPostUrl(url: URL): boolean {
  return (
    (url.hostname === 'instagram.com' || url.hostname === 'www.instagram.com') &&
    /^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?/.test(url.pathname)
  );
}

function isInstagramCdnUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return (
    host === 'cdninstagram.com' ||
    host.endsWith('.cdninstagram.com') ||
    host === 'fbcdn.net' ||
    host.endsWith('.fbcdn.net')
  );
}

async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1] = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// GET /api/instagram/image
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const igUrl = searchParams.get('url');
  const parsedUrl = igUrl ? parseUrl(igUrl) : null;
  const isPost = parsedUrl ? isInstagramPostUrl(parsedUrl) : false;
  const isCdn = parsedUrl ? isInstagramCdnUrl(parsedUrl) : false;

  if (!parsedUrl || (!isPost && !isCdn)) {
    return NextResponse.json({ error: 'Invalid Instagram or Media URL' }, { status: 400 });
  }

  try {
    // 1. If it's already a CDN link, proxy it directly
    if (isCdn) {
        return proxyImage(parsedUrl);
    }

    // 2. Check Redis for previously resolved CDN URL
    const cacheKey = `ig_resolve:${parsedUrl.href}`;
    const cachedCdnUrl = await redis.get(cacheKey);

    if (cachedCdnUrl) {
        const cachedUrl = parseUrl(cachedCdnUrl);
        if (cachedUrl && isInstagramCdnUrl(cachedUrl)) {
          return proxyImage(cachedUrl);
        }
        await redis.del(cacheKey);
    }

    // 3. Scrape the Post to find the CDN URL
    const response = await fetchWithTimeout(parsedUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        },
    });

    if (!response.ok) return NextResponse.json({ error: 'Instagram fetch failed' }, { status: response.status });
    const html = await response.text();

    // Extract URL
    let targetImageUrl = '';
    const ogImageMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i) 
                      || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
    
    if (ogImageMatch) {
         targetImageUrl = ogImageMatch[1].replace(/&amp;/g, '&');
    } else {
         const cdnMatch = html.match(/(https:\/\/[^"'\s]+(?:cdninstagram|fbcdn)[^"'\s]+\.jpg[^"'\s]*)/i);
         if (cdnMatch) targetImageUrl = cdnMatch[1];
    }

    const targetUrl = parseUrl(targetImageUrl);
    if (!targetUrl || !isInstagramCdnUrl(targetUrl)) {
        return NextResponse.json({ error: 'No image found' }, { status: 404 });
    }

    // 4. Cache the resolved URL (1 hour)
    await redis.setex(cacheKey, 3600, targetUrl.href);
    
    // 5. Proxy the resolved image
    return proxyImage(targetUrl);

  } catch (error) {
    console.error('IG Proxy Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}

async function proxyImage(imageUrl: URL) {
  try {
    const imgResponse = await fetchWithTimeout(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.instagram.com/',
      },
    });

    if (!imgResponse.ok) {
       return NextResponse.json({ error: `Image fetch failed: ${imgResponse.status}` }, { status: 502 });
    }

    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
    const contentLength = Number(imgResponse.headers.get('content-length') || 0);

    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Unsupported media response' }, { status: 415 });
    }

    if (contentLength > MAX_PROXY_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413 });
    }
    
    return new NextResponse(imgResponse.body, {
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
        }
    });
  } catch (error) {
    console.error('Image proxy error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 502 });
  }
}
