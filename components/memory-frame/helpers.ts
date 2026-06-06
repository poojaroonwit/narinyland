import { Interaction, MediaContent, MemoryItem } from '../../types';

export const seededRatio = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
};


export const getDisplayUrl = (url: string) => {
    if (!url) return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Crect width='600' height='600' fill='%23f9fafb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
    if (/instagram\.com\/(p|reel|tv)\//.test(url)) {
      return `/api/instagram/image?url=${encodeURIComponent(url)}`;
    }
    if (url.startsWith('/api/') && typeof window !== 'undefined') {
      return `${window.location.origin}${url}`;
    }
    return url;
};

export const isInstagramLink = (url: string) => url.includes('instagram.com') || url.includes('cdninstagram.com');

export const convertTimelineToMemoryItems = (timeline: Interaction[]): MemoryItem[] => {
    return timeline
      .filter(interaction => {
        const mediaItems = interaction.mediaItems || (interaction.media ? [interaction.media] : []);
        return mediaItems.some((media: MediaContent) => media.type === 'image');
      })
      .map((interaction, index) => {
        const mediaItems = interaction.mediaItems || (interaction.media ? [interaction.media] : []);
        const firstImage = mediaItems.find((media: MediaContent) => media.type === 'image');
        return {
          id: interaction.id,
          url: firstImage?.url || '',
          privacy: 'public' as 'public' | 'private',
          caption: interaction.text || `Memory ${index + 1}`
        };
      })
      .filter(item => item.url);
};
