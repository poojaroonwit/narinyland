import { Metadata, Viewport } from 'next';
import prisma from '@/lib/prisma';
import AuthProvider from '@/components/AuthProvider';
import './globals.css';

// Helper to get config
async function getConfig() {
  try {
    return await prisma.appConfig.findUnique({ where: { id: 'default' } });
  } catch (e) {
    console.error("Layout Config Error", e);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  
  return {
    title: (config as any)?.pwaName || 'Narinyland',
    description: (config as any)?.pwaDescription || 'Experience Narinyland, an interactive virtual pet and love garden. Track your relationship growth, collect memories, and nurture your digital bond.',
    applicationName: (config as any)?.pwaShortName || 'Narinyland',
    appleWebApp: {
      capable: true,
      title: (config as any)?.pwaShortName || 'Narinyland',
      statusBarStyle: 'black-translucent',
    },
    icons: {
        icon: (config as any)?.pwaIconUrl || undefined,
        apple: (config as any)?.pwaIconUrl || undefined,
    }
  };
}

export async function generateViewport(): Promise<Viewport> {
   const config = await getConfig();
   return {
     themeColor: (config as any)?.pwaThemeColor || '#ec4899',
     width: 'device-width',
     initialScale: 1,
     maximumScale: 1,
     userScalable: false,
   }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appKitClientId = (
    process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID ||
    process.env.APPKIT_CLIENT_ID ||
    ''
  ).trim();
  const appKitDomain = (
    process.env.NEXT_PUBLIC_APPKIT_DOMAIN ||
    process.env.APPKIT_DOMAIN ||
    'https://appkits.up.railway.app'
  ).trim();
  const injectedAppKitConfig = JSON.stringify({
    clientId: appKitClientId,
    domain: appKitDomain,
  });

  return (
    <html lang="en">
      <head>
        {/* Font Awesome */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        
        {/* Google Fonts - Geometric Sans Selection + Multi-language Support */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Geist:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Barlow:wght@300;400;500;600&family=Kanit:wght@300;400;500;700&family=Noto+Sans+SC:wght@300;400;500;700&family=Noto+Sans+JP:wght@300;400;500;700&family=Noto+Sans+KR:wght@300;400;500;700&family=Pacifico&family=Outfit:wght@300;400;500;700;900&display=swap" rel="stylesheet" />
        
        {/* Preload hero assets from remote */}
        <link rel="preload" as="image" href="/images/hero_bg.jpeg" type="image/jpeg" />
        <link rel="preload" as="video" href="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260306_115329_5e00c9c5-4d69-49b7-94c3-9c31c60bb644.mp4" type="video/mp4" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__NARINYLAND_APPKIT_CONFIG__ = ${injectedAppKitConfig};`,
          }}
        />
      </head>

      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
