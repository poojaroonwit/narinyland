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
    // Manifest is automatically handled by app/manifest.ts presence
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
  return (
    <html lang="en">
      <head>
        {/* Tailwind CDN - Keeping existing setup for now */}
        <script src="https://cdn.tailwindcss.com"></script>
        {/* Font Awesome */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        {/* Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;700&family=Pacifico&family=Outfit:wght@300;400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
