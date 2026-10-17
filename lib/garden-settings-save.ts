import type { AppConfig } from '@/types';
import { configAPI, couponsAPI, memoriesAPI, timelineAPI } from '@/services/api';

// Config PUT intentionally excludes entity collections. Save them using their own
// authenticated endpoints, then rehydrate canonical server data.
export async function saveGardenSettings(draft: AppConfig, previous: AppConfig, savedTimelineMediaIds: ReadonlySet<string> = new Set()): Promise<AppConfig> {
  const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
  const oldGallery = previous.gallery ?? [];
  const nextGallery = draft.gallery ?? [];
  const oldTimeline = previous.timeline ?? [];
  const nextTimeline = draft.timeline ?? [];
  const oldCoupons = previous.coupons ?? [];
  const nextCoupons = draft.coupons ?? [];

  // Redeeming coupons is a transaction with point rewards, not a settings edit.
  if (nextCoupons.some((coupon) => {
    const old = oldCoupons.find((item) => item.id === coupon.id);
    return old && !!old.isRedeemed !== !!coupon.isRedeemed;
  })) throw new Error('Redeem coupons from the Coupons screen, not Settings.');

  // Refuse partial media replacements: timeline API only accepts uploaded files
  // and does not persist an arbitrary media URL from the settings draft.
  if (nextTimeline.some((event) => {
    const prior = oldTimeline.find((item) => item.id === event.id);
    return prior && changed(event.media, prior.media) && !savedTimelineMediaIds.has(event.id);
  })) throw new Error('Timeline media changes must use the Timeline upload flow.');

  for (const item of nextTimeline) {
    if (!oldTimeline.some((prior) => prior.id === item.id) && (item.media || item.mediaItems?.length)) {
      throw new Error('Save new timeline events before attaching media. Your edits are still in Settings.');
    }
  }

  for (const item of oldCoupons) {
    if (!nextCoupons.some((next) => next.id === item.id)) await couponsAPI.delete(item.id);
  }
  for (const item of nextCoupons) {
    const old = oldCoupons.find((before) => before.id === item.id);
    const data = {
      title: item.title, emoji: item.emoji, desc: item.desc, color: item.color,
      forPartner: item.for ?? 'partner1', points: item.points ?? 0,
    };
    if (!old) await couponsAPI.create(data);
    else if (changed(data, {
      title: old.title, emoji: old.emoji, desc: old.desc, color: old.color,
      forPartner: old.for ?? 'partner1', points: old.points ?? 0,
    })) await couponsAPI.update(item.id, data);
  }

  for (const item of oldTimeline) {
    if (!nextTimeline.some((next) => next.id === item.id)) await timelineAPI.delete(item.id);
  }
  for (const item of nextTimeline) {
    const old = oldTimeline.find((before) => before.id === item.id);
    const timestamp = new Date(item.timestamp).toISOString();
    const data = { text: item.text, type: item.type, timestamp, location: item.location, latitude: item.latitude, longitude: item.longitude };
    if (!old || item.id.startsWith('temp-')) await timelineAPI.create(data);
    else if (changed(data, {
      text: old.text, type: old.type, timestamp: new Date(old.timestamp).toISOString(),
      location: old.location, latitude: old.latitude, longitude: old.longitude,
    })) await timelineAPI.update(item.id, data);
  }

  for (const item of oldGallery) {
    if (item.id && !nextGallery.some((next) => next.id === item.id)) await memoriesAPI.delete(item.id);
  }
  for (const item of nextGallery) {
    if (!item.url.trim()) throw new Error('Choose an image URL or upload a file before saving memories.');
    const old = oldGallery.find((before) => before.id && before.id === item.id);
    const data = { url: item.url, privacy: item.privacy, caption: item.caption ?? '', albumId: item.albumId ?? null };
    if (!old || !item.id) await memoriesAPI.create(data);
    else if (changed(data, { url: old.url, privacy: old.privacy, caption: old.caption ?? '', albumId: old.albumId ?? null })) await memoriesAPI.update(item.id, data);
  }

  await configAPI.update({
    ...draft, isProposalAccepted: !!draft.proposal?.isAccepted,
    proposalProgress: draft.proposal?.progress ?? 0,
  });

  const [freshConfig, freshGallery, freshTimeline] = await Promise.all([
    configAPI.get(), memoriesAPI.list(), timelineAPI.list(),
  ]);
  return {
    ...freshConfig,
    gallery: freshGallery,
    timeline: freshTimeline.map((item) => ({ ...item, timestamp: new Date(item.timestamp) })),
  };
}
