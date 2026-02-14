import { NextResponse } from 'next/server';

// GET /api/instagram/image
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const igUrl = searchParams.get('url');

  if (!igUrl || !/instagram\.com\/(p|reel|tv)\//.test(igUrl)) {
    return NextResponse.json({ error: 'Invalid Instagram URL' }, { status: 400 });
  }

  try {
    // Fetch the Instagram post page
    const response = await fetch(igUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
        // Just return json error
      return NextResponse.json({ error: `Instagram returned ${response.status}` }, { status: response.status });
    }

    const html = await response.text();

    // Extract og:image
    const ogImageMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
      || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);

    if (!ogImageMatch || !ogImageMatch[1]) {
      // Fallback
      const cdnMatch = html.match(/(https:\/\/[^"'\s]+(?:cdninstagram|fbcdn)[^"'\s]+\.jpg[^"'\s]*)/i);
      if (cdnMatch) {
         return proxyImage(cdnMatch[1]);
      }
      return NextResponse.json({ error: 'Could not extract image from Instagram post' }, { status: 404 });
    }

    const imageUrl = ogImageMatch[1].replace(/&amp;/g, '&');
    return proxyImage(imageUrl);

  } catch (error: any) {
    console.error('Instagram proxy error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch Instagram image' }, { status: 500 });
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
    
    // Create a new response with the image body
    return new NextResponse(imgResponse.body, {
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
        }
    });

  } catch (error: any) {
    console.error('Image proxy error:', error.message);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 502 });
  }
}
