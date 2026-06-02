import { MetadataRoute } from 'next'
import { getAppBranding } from '@/lib/appkit-server'

// Environment-variable fallbacks
const ENV_APP_NAME = process.env.PWA_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Narinyland';
const ENV_APP_SHORT = process.env.PWA_SHORT_NAME || ENV_APP_NAME;
const ENV_APP_DESC = process.env.PWA_DESCRIPTION || 'Our Love Story';
const ENV_THEME_COLOR = process.env.PWA_THEME_COLOR || '#ec4899';
const ENV_BG_COLOR = process.env.PWA_BG_COLOR || '#ffffff';
const ENV_ICON_URL = process.env.PWA_ICON_URL || null;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';
  const branding = isProductionBuild ? null : await getAppBranding();

  // Priority: AppKit branding → env vars → hardcoded defaults
  const name = branding?.appName || ENV_APP_NAME;
  const shortName = ENV_APP_SHORT;
  const description = ENV_APP_DESC;
  const themeColor = branding?.splash?.spinnerColor || ENV_THEME_COLOR;
  const bgColor = branding?.splash?.backgroundColor || ENV_BG_COLOR;
  const iconUrl = branding?.logoUrl || ENV_ICON_URL;

  const icons: MetadataRoute.Manifest['icons'] = [
    {
      src: '/favicon.ico',
      sizes: 'any',
      type: 'image/x-icon',
    },
  ];

  if (iconUrl) {
    icons.push({ src: iconUrl, sizes: '192x192', type: 'image/png' });
    icons.push({ src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable' });
  } else {
    // Default Narinyland heart icon as fallback
    icons.push({
      src: 'https://cdn-icons-png.flaticon.com/512/3209/3209995.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    });
  }

  return {
    name,
    short_name: shortName,
    description,
    start_url: '/',
    display: 'standalone',
    background_color: bgColor,
    theme_color: themeColor,
    icons,
    orientation: 'portrait',
    categories: ['lifestyle', 'social'],
    lang: 'en',
  };
}
