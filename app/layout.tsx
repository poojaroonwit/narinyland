import { Metadata, Viewport } from 'next';
import type { AppConfig } from '@prisma/client';
import prisma from '@/lib/prisma';
import AuthProvider from '@/components/AuthProvider';
import './globals.css';

type RuntimeAppConfig = AppConfig & {
  pwaName?: string | null;
  pwaDescription?: string | null;
  pwaShortName?: string | null;
  pwaIconUrl?: string | null;
  pwaThemeColor?: string | null;
};

// Helper to get config
async function getConfig(): Promise<RuntimeAppConfig | null> {
  try {
    return await prisma.appConfig.findUnique({ where: { id: 'default' } }) as RuntimeAppConfig | null;
  } catch (e) {
    console.error("Layout Config Error", e);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  
  return {
    title: config?.pwaName || 'Narinyland',
    description: config?.pwaDescription || 'Experience Narinyland, an interactive virtual pet and love garden. Track your relationship growth, collect memories, and nurture your digital bond.',
    applicationName: config?.pwaShortName || 'Narinyland',
    appleWebApp: {
      capable: true,
      title: config?.pwaShortName || 'Narinyland',
      statusBarStyle: 'black-translucent',
    },
    icons: {
        icon: config?.pwaIconUrl || undefined,
        apple: config?.pwaIconUrl || undefined,
    }
    // Manifest is automatically handled by app/manifest.ts presence
  };
}

export async function generateViewport(): Promise<Viewport> {
   const config = await getConfig();
   return {
     themeColor: config?.pwaThemeColor || '#ec4899',
     width: 'device-width',
     initialScale: 1,
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
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Font Awesome */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        {/* Google Fonts */}
        {/* Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Prompt:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Pacifico&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
