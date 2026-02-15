import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

// GET /api/instagram/image
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const igUrl = searchParams.get('url');
  
  // Basic validation
  const isPost = /instagram\.com\/(p|reel|tv)\//.test(igUrl || '');
  const isCdn = /(cdninstagram|fbcdn)/.test(igUrl || '');

  if (!igUrl || (!isPost && !isCdn)) {
    return NextResponse.json({ error: 'Invalid Instagram or Media URL' }, { status: 400 });
  }

  try {
    // 1. If it's already a CDN link, proxy it directly
    if (isCdn) {
        return proxyImage(igUrl);
    }

    // 2. Check Redis for previously resolved CDN URL
    const cacheKey = `ig_resolve:${igUrl}`;
    const cachedCdnUrl = await redis.get(cacheKey);

    if (cachedCdnUrl) {
        return proxyImage(cachedCdnUrl);
    }

    // 3. Scrape the Post to find the CDN URL
    const response = await fetch(igUrl, {
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

    if (!targetImageUrl) {
        return NextResponse.json({ error: 'No image found' }, { status: 404 });
    }

    // 4. Cache the resolved URL (1 hour)
    await redis.setex(cacheKey, 3600, targetImageUrl);
    
    // 5. Proxy the resolved image
    return proxyImage(targetImageUrl);

  } catch (error: any) {
    console.error('IG Proxy Error:', error.message);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}

async function proxyImage(imageUrl: string) {
  try {
    const imgResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.instagram.com/',
      },
    });

    if (!imgResponse.ok) {
       return NextResponse.json({ error: `Image fetch failed: ${imgResponse.status}` }, { status: 502 });
    }

    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
    
    return new NextResponse(imgResponse.body, {
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
        }
    });
  } catch (error: any) {
    console.error('Image proxy error:', error.message);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 502 });
  }
}
