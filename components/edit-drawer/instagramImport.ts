import { AppConfig } from '../../types';

type InstagramPost = { thumbnail?: string; url?: string };
type InstagramProfileResponse = { error?: string; posts?: InstagramPost[]; postCount?: number; displayName?: string };
type InstagramFeedItem = { media_url?: string; permalink?: string };
type InstagramFeedResponse = { error?: { message?: string }; data?: InstagramFeedItem[] };

type InstagramImportArgs = {
  localConfig: AppConfig;
  updateLocal: (updater: (prev: AppConfig) => AppConfig) => void;
  setIsFetchingIG: (isFetching: boolean) => void;
  getErrorMessage: (error: unknown) => string;
};

export const fetchInstagramProfileImport = async ({
  localConfig,
  updateLocal,
  setIsFetchingIG,
  setIgProfileResult,
  getErrorMessage,
}: InstagramImportArgs & { setIgProfileResult: (result: string | null) => void }) => {
  const username = localConfig.instagramUsername?.trim();
  if (!username) return;

  setIsFetchingIG(true);
  setIgProfileResult(null);
  try {
    const res = await fetch(`/api/instagram/profile/${encodeURIComponent(username)}`);
    const data = await res.json() as InstagramProfileResponse;

    if (!res.ok) {
      setIgProfileResult(`❌ ${data.error || 'Failed to fetch profile'}`);
      return;
    }

    if (data.posts?.length === 0) {
      setIgProfileResult(`⚠️ No public posts found for @${username}`);
      return;
    }

    const existingUrls = new Set(localConfig.gallery.map((g) => g.url));
    const newItems = (data.posts || []).flatMap((p) => {
      const url = p.thumbnail || p.url;
      return url && !existingUrls.has(url) ? [{ url, privacy: 'public' as const }] : [];
    });

    if (newItems.length === 0) {
      setIgProfileResult(`✅ All ${data.postCount} posts from @${username} are already in gallery`);
      return;
    }

    updateLocal(prev => ({ ...prev, gallery: [...prev.gallery, ...newItems] }));
    setIgProfileResult(`✅ Added ${newItems.length} posts from @${data.displayName || username}`);
  } catch (err: unknown) {
    setIgProfileResult(`❌ ${getErrorMessage(err)}`);
  } finally {
    setIsFetchingIG(false);
  }
};

export const fetchInstagramFeedImport = async ({
  igToken,
  localConfig,
  updateLocal,
  setIsFetchingIG,
  getErrorMessage,
}: InstagramImportArgs & { igToken: string }) => {
  if (!igToken.trim()) return;
  setIsFetchingIG(true);
  try {
    const res = await fetch(`https://graph.instagram.com/me/media?fields=id,media_url,permalink,caption,timestamp&access_token=${igToken}`);
    const data = await res.json() as InstagramFeedResponse;

    if (data.error) {
      alert(`Instagram API Error: ${data.error.message || 'Unknown Instagram API error'}`);
      return;
    }

    if (!data.data?.length) {
      alert('No media found in your Instagram feed.');
      return;
    }

    const existingUrls = new Set(localConfig.gallery.map((g) => g.url));
    const newItems = (data.data || []).flatMap((m) => {
      const url = m.permalink || m.media_url;
      return m.media_url && url && !existingUrls.has(url) ? [{ url, privacy: 'public' as const }] : [];
    });

    updateLocal(prev => ({ ...prev, gallery: [...prev.gallery, ...newItems] }));
    alert(`Added ${newItems.length} photos from Instagram!`);
  } catch (err: unknown) {
    alert(`Failed to fetch: ${getErrorMessage(err)}`);
  } finally {
    setIsFetchingIG(false);
  }
};
