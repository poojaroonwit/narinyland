import { NextResponse } from 'next/server';

// GET /api/instagram/profile/[username]
export async function GET(
  request: Request,
  props: { params: Promise<{ username: string }> }
) {
  const params = await props.params;
  const { username } = params;

  if (!username || username.length < 1) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const cleanUsername = username.replace(/^@/, '').trim();
    
    // --- Method A: Try v1 API (Experimental & More Reliable) ---
    try {
      const apiUrl = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${cleanUsername}`;
      console.log(`[Instagram Scraper] Attempting v1 API for @${cleanUsername}...`);
      const apiResponse = await fetch(apiUrl, {
        headers: {
          'x-ig-app-id': '936619743392459',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Origin': 'https://www.instagram.com',
          'Referer': 'https://www.instagram.com/',
          'SEC-FETCH-DEST': 'empty',
          'SEC-FETCH-MODE': 'cors',
          'SEC-FETCH-SITE': 'same-site',
        }
      });

      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        const user = apiData.data?.user;
        if (user) {
          const edges = user.edge_owner_to_timeline_media?.edges || [];
          const posts = edges.map((edge: any) => ({
            url: `https://www.instagram.com/p/${edge.node.shortcode}/`,
            shortcode: edge.node.shortcode,
            thumbnail: edge.node.display_url,
          }));

          console.log(`[Instagram Scraper] v1 API Success! Found ${posts.length} posts for @${cleanUsername}`);
          return NextResponse.json({
            username: cleanUsername,
            displayName: user.full_name || cleanUsername,
            profilePicture: user.profile_pic_url,
            postCount: posts.length,
            posts,
            method: 'api_v1'
          });
        }
      } 
    } catch (apiErr: any) {
      console.error(`[Instagram Scraper] v1 API error for @${cleanUsername}:`, apiErr.message);
    }

    // --- Method B: Fallback to HTML Scraping (Legacy) ---
    const profileUrl = `https://www.instagram.com/${cleanUsername}/`;
    const response = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: `Profile @${cleanUsername} not found` }, { status: 404 });
      }
      throw new Error(`Instagram returned ${response.status}`);
    }

    const html = await response.text();

    // Extract post shortcodes from the profile HTML
    const shortcodes = new Set<string>();

    // Method 1: Look for /p/SHORTCODE/ links in the HTML
    const postLinkRegex = /\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)\//g;
    let match;
    while ((match = postLinkRegex.exec(html)) !== null) {
      shortcodes.add(match[1]);
    }

    // Method 2: Look for shortcode in JSON data embedded in page (more robust)
    const shortcodeJsonRegex = /"(?:shortcode|code)"\s*:\s*"([A-Za-z0-9_-]+)"/g;
    while ((match = shortcodeJsonRegex.exec(html)) !== null) {
      shortcodes.add(match[1]);
    }

    // Method 3: Parse window._sharedData if available
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({[\s\S]*?});/);
    if (sharedDataMatch) {
      try {
        const sharedData = JSON.parse(sharedDataMatch[1]);
        const user = sharedData.entry_data?.ProfilePage?.[0]?.graphql?.user || sharedData.entry_data?.ProfilePage?.[0]?.user;
        const edges = user?.edge_owner_to_timeline_media?.edges || user?.edge_web_feed_timeline?.edges;
        if (edges) {
          edges.forEach((edge: any) => {
            const code = edge.node?.shortcode;
            if (code) shortcodes.add(code);
          });
        }
      } catch (e) {
        // Silently fail if JSON is malformed
      }
    }

    const blacklist = new Set(['en', 'en_US', 'th', 'th_TH', 'default', 'privacy', 'about', 'explore', 'reels']);
    const finalShortcodes = Array.from(shortcodes).filter(code => 
      code.length >= 8 && !blacklist.has(code)
    );

    const ogImageMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
      || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
    
    const profilePicture = ogImageMatch ? ogImageMatch[1].replace(/&amp;/g, '&') : null;

    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
      || html.match(/<title>([^<]+)<\/title>/i);
    const displayName = titleMatch ? titleMatch[1].replace(/ \(@[^)]+\).*/, '').replace(/ \u2022 Instagram.*/, '') : cleanUsername;

    const posts = finalShortcodes.map(code => ({
      url: `https://www.instagram.com/p/${code}/`,
      shortcode: code,
    }));

    return NextResponse.json({
      username: cleanUsername,
      displayName,
      profilePicture,
      postCount: posts.length,
      posts,
      method: 'html_scrape'
    });

  } catch (error: any) {
    console.error('Instagram profile scrape error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch Instagram profile.' }, { status: 500 });
  }
}
