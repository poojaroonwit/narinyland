import { Metadata, Viewport } from 'next';
import AuthBoundary from '@/components/AuthBoundary';
import './globals.css';

const ENV_APP_NAME = process.env.PWA_NAME || process.env.NEXT_PUBLIC_APP_NAME;
const ENV_APP_SHORT = process.env.PWA_SHORT_NAME;
const ENV_APP_DESC = process.env.PWA_DESCRIPTION;
const ENV_THEME_COLOR = process.env.PWA_THEME_COLOR;
const ENV_ICON_URL = process.env.PWA_ICON_URL;

/**
 * Root metadata must be build-safe. Runtime branding/config still comes from
 * authenticated application APIs, but `next build` must never require a live
 * Railway Postgres connection just to render static metadata.
 */
export function generateMetadata(): Metadata {
  const appName = ENV_APP_NAME || 'Narinyland';
  const shortName = ENV_APP_SHORT || appName;

  return {
    title: appName,
    description: ENV_APP_DESC || 'Experience Narinyland, an interactive virtual pet and love garden. Track your relationship growth, collect memories, and nurture your digital bond.',
    applicationName: shortName,
    appleWebApp: {
      capable: true,
      title: shortName,
      statusBarStyle: 'black-translucent',
    },
    icons: {
      icon: ENV_ICON_URL || undefined,
      apple: ENV_ICON_URL || undefined,
    },
  };
}

export function generateViewport(): Viewport {
  return {
    themeColor: ENV_THEME_COLOR || '#ec4899',
    width: 'device-width',
    initialScale: 1,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>
        <AuthBoundary>{children}</AuthBoundary>
      </body>
    </html>
  );
}
