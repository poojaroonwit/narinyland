import type { AppConfig, Emotion, Interaction, LoveLetterMessage, LoveStats } from '../../../types';
import { configAPI, lettersAPI, timelineAPI, statsAPI, couponsAPI } from '../../../services/api';
import { getErrorMessage } from '../../../lib/errors';

type StateSetter<T> = (value: T | ((previous: T) => T)) => void;

type GardenConfirmPrompt = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
};

type GardenActionsContext = {
  appConfig: AppConfig;
  setAppConfig: StateSetter<AppConfig>;
  handleSetAppConfig: StateSetter<AppConfig>;
  loveStats: LoveStats;
  setLoveStats: StateSetter<LoveStats>;
  setPetEmotion: StateSetter<Emotion>;
  setPetMessage: StateSetter<string>;
  setLoveLetters: StateSetter<LoveLetterMessage[]>;
  showToast?: (message: string) => void;
  setHasAcceptedProposal: StateSetter<boolean>;
  requestConfirm?: (prompt: GardenConfirmPrompt) => Promise<boolean>;
};

export const useGardenActions = (ctx: GardenActionsContext) => {
  const {
    appConfig,
    setAppConfig,
    handleSetAppConfig,
    loveStats,
    setLoveStats,
    setPetEmotion,
    setPetMessage,
    setLoveLetters,
    showToast,
    setHasAcceptedProposal,
    requestConfirm,
  } = ctx;

  const notify = (message: string) => {
    showToast?.(message);
  };

  const confirmWorldAction = async (prompt: GardenConfirmPrompt) => {
    if (!requestConfirm) {
      notify('Confirmation is unavailable right now.');
      return false;
    }
    return requestConfirm(prompt);
  };

  // Compatibility name retained because downstream garden context exposes
  // `addXP`. Rewards are now server-authoritative; this only refreshes stats.
  const addXP = async (amount = 0, partnerId?: string) => {
    void amount;
    void partnerId;
    try {
      const res = await statsAPI.get();
      const leveledUp = res.level > loveStats.level;

      if (leveledUp) {
        const nextLevel = res.level;
        let message = `LEVEL UP! Nari evolved to Level ${nextLevel}! 🎉✨`;
        if (nextLevel === 2) message = 'Nari is feeling royal! Level 2 Unlocked 👑';
        if (nextLevel === 3) message = 'Magic flows through Nari! Level 3 Reached ✨';
        if (nextLevel === 4) message = 'Nari has taken flight! Level 4 Angel Form 👼';
        if (nextLevel === 5) message = 'Behold! Ascended Nari! Level 5 reached 🌟';

        setPetMessage(message);
        setPetEmotion('excited');
      }

      setLoveStats({
        xp: res.xp,
        level: res.level,
        xpForNextLevel: res.xpForNextLevel,
        totalXP: res.totalXP,
        leaves: res.leaves ?? loveStats.leaves,
        points: res.points ?? loveStats.points,
        partnerPoints: res.partnerPoints,
      });
    } catch (error) {
      console.error('Stats refresh failed:', error);
    }
  };

  const handleAddLeaf = async () => {
    if (loveStats.points < 100) {
      notify('Not enough points to grow a leaf. Create coupons to earn points.');
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);

    const prevStats = { ...loveStats };
    setLoveStats((prev) => ({
      ...prev,
      leaves: prev.leaves + 1,
      points: prev.points - 100,
    }));
    setPetEmotion('happy');
    setPetMessage('A new memory planted! 🌱');
    setTimeout(() => setPetEmotion('neutral'), 3000);

    try {
      const res = await statsAPI.addLeaf();
      if (res.success) {
        setLoveStats((prev) => ({
          ...prev,
          leaves: res.leaves,
          points: res.points,
          xp: res.xp,
          level: res.level,
          xpForNextLevel: res.xpForNextLevel,
          totalXP: res.totalXP,
          partnerPoints: res.partnerPoints,
        }));

        if (res.leveledUp) {
          setPetEmotion('excited');
          setPetMessage(`Level Up! Our garden is growing! Level ${res.level} 🌟`);
        }
      } else {
        setLoveStats(prevStats);
        notify('Something went wrong growing the leaf.');
      }
    } catch (error) {
      console.error('Failed to add leaf:', error);
      setLoveStats(prevStats);
      notify('Something went wrong growing the leaf.');
    }
  };

  const handleProposalStepChange = (progress: number) => {
    handleSetAppConfig((prev) => ({
      ...prev,
      proposal: { ...prev.proposal, progress },
    }));
  };

  const handleProposalAccepted = () => {
    setHasAcceptedProposal(true);
    handleSetAppConfig((prev) => ({
      ...prev,
      proposal: { ...prev.proposal, isAccepted: true },
    }));
  };

  const handleRedeemCoupon = async (id: string) => {
    try {
      await couponsAPI.redeem(id);

      setAppConfig((prev) => ({
        ...prev,
        coupons: prev.coupons.map((coupon) => coupon.id === id
          ? { ...coupon, isRedeemed: true, redeemedAt: new Date() }
          : coupon),
      }));

      const coupon = appConfig.coupons.find((candidate) => candidate.id === id);
      if (coupon) {
        const text = `🎟️ Coupon Redeemed: ${coupon.title} ${coupon.emoji}`;
        const timelineRes = await timelineAPI.create({
          text,
          type: 'system',
          timestamp: new Date().toISOString(),
        });

        const newEvent: Interaction = {
          id: timelineRes.id,
          text: timelineRes.text,
          timestamp: new Date(timelineRes.timestamp),
          type: 'system',
        };

        setAppConfig((prev) => ({
          ...prev,
          timeline: [newEvent, ...prev.timeline],
        }));
      }

      await addXP();
    } catch (error) {
      console.error('Failed to redeem coupon:', error);
      notify('Failed to redeem coupon. Please try again.');
    }
  };

  const handleAddCoupon = async (data: {
    title: string;
    emoji: string;
    desc: string;
    color: string;
    forPartner: string;
    points: number;
  }) => {
    try {
      const newCoupon = await couponsAPI.create(data);
      setAppConfig((prev) => ({
        ...prev,
        coupons: [...prev.coupons, newCoupon],
      }));
    } catch (error) {
      console.error('Failed to add coupon:', error);
      notify('Failed to add coupon.');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    const confirmed = await confirmWorldAction({
      title: 'Delete coupon?',
      message: 'This removes the reward from your shared world. This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await couponsAPI.delete(id);
      setAppConfig((prev) => ({
        ...prev,
        coupons: prev.coupons.filter((coupon) => coupon.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete coupon:', error);
      notify('Failed to delete coupon.');
    }
  };

  const handleSendMessage = async (msg: LoveLetterMessage) => {
    try {
      setLoveLetters((prev) => [msg, ...prev]);

      let file: File | undefined;
      if (msg.media?.url?.startsWith('blob:')) {
        try {
          const response = await fetch(msg.media.url);
          const blob = await response.blob();
          const ext = msg.media.type === 'image' ? 'jpg' : msg.media.type === 'video' ? 'mp4' : 'ogg';
          file = new File([blob], `letter-media.${ext}`, { type: blob.type });
        } catch (error) {
          console.error('Failed to process media blob:', error);
        }
      }

      const savedLetter = await lettersAPI.create({
        fromId: msg.fromId,
        content: msg.content,
        unlockDate: msg.unlockDate.toISOString(),
        file,
      });

      setLoveLetters((prev) => prev.map((letter) => letter.id === msg.id ? {
        ...letter,
        id: savedLetter.id,
        media: savedLetter.media
          ? { type: savedLetter.media.type, url: savedLetter.media.url }
          : letter.media,
      } : letter));

      // Letter reward is committed by the server. Refresh the resulting stats.
      await addXP();

      const senderName = msg.fromId === 'partner1'
        ? appConfig.partners.partner1.name
        : appConfig.partners.partner2.name;
      const timelineRes = await timelineAPI.create({
        text: `💌 Letter from ${senderName}: ${msg.content.substring(0, 60)}...`,
        type: 'letter',
        timestamp: msg.unlockDate.toISOString(),
      });

      const newTimelineEvent: Interaction = {
        id: timelineRes.id,
        text: timelineRes.text,
        timestamp: new Date(timelineRes.timestamp),
        type: 'letter',
      };

      setAppConfig((prev) => ({
        ...prev,
        timeline: [newTimelineEvent, ...prev.timeline],
      }));
    } catch (error) {
      console.error('Failed to send letter:', error);
      notify('Failed to save your letter. Please try again.');
      setLoveLetters((prev) => prev.filter((letter) => letter.id !== msg.id));
    }
  };

  const handleUpdateMessage = async (msg: LoveLetterMessage) => {
    try {
      await lettersAPI.update(msg.id, {
        folder: msg.folder,
        isRead: msg.isRead,
        readAt: msg.readAt,
      });
      setLoveLetters((prev) => prev.map((message) => message.id === msg.id ? msg : message));
    } catch (error: unknown) {
      console.error('Failed to update message', error);
      notify(getErrorMessage(error) || 'Failed to update message');
    }
  };

  const handleUpdateTimeline = async (updated: Interaction) => {
    try {
      const files: File[] = [];
      if (updated.mediaItems) {
        for (const item of updated.mediaItems) {
          if (item.url.startsWith('blob:')) {
            try {
              const res = await fetch(item.url);
              const blob = await res.blob();
              const ext = blob.type.split('/')[1] || 'jpg';
              files.push(new File([blob], `timeline-media-${Date.now()}.${ext}`, { type: blob.type }));
            } catch (error) {
              console.error('Failed to process blob:', error);
            }
          }
        }
      }

      const saved = await timelineAPI.update(updated.id, {
        text: updated.text,
        type: updated.type,
        location: updated.location,
        latitude: updated.latitude,
        longitude: updated.longitude,
        timestamp: updated.timestamp.toISOString(),
        files: files.length > 0 ? files : undefined,
      });

      setAppConfig((prev) => ({
        ...prev,
        timeline: prev.timeline.map((event) => event.id === updated.id ? {
          ...updated,
          timestamp: new Date(updated.timestamp),
          media: saved.media,
          mediaItems: saved.mediaItems,
        } : event),
      }));
    } catch (error) {
      console.error('Failed to update timeline:', error);
      notify('Failed to save changes.');
    }
  };

  const handleAddTimeline = async (interaction: Interaction) => {
    try {
      const files: File[] = [];
      const mediaToProcess = interaction.mediaItems?.length
        ? interaction.mediaItems
        : interaction.media
          ? [interaction.media]
          : [];

      for (const item of mediaToProcess) {
        if (item.url.startsWith('blob:')) {
          try {
            const res = await fetch(item.url);
            const blob = await res.blob();
            const ext = blob.type.split('/')[1] || 'jpg';
            files.push(new File([blob], `timeline-media-${Date.now()}.${ext}`, { type: blob.type }));
          } catch (error) {
            console.error('Failed to process blob:', error);
          }
        }
      }

      const saved = await timelineAPI.create({
        text: interaction.text,
        type: interaction.type,
        location: interaction.location,
        latitude: interaction.latitude,
        longitude: interaction.longitude,
        timestamp: interaction.timestamp.toISOString(),
        files: files.length > 0 ? files : undefined,
      });

      const newEvent: Interaction = {
        ...interaction,
        id: saved.id,
        timestamp: new Date(saved.timestamp),
        media: saved.media,
        mediaItems: saved.mediaItems,
      };

      setAppConfig((prev) => ({
        ...prev,
        timeline: [newEvent, ...prev.timeline],
      }));
    } catch (error) {
      console.error('Failed to add timeline event:', error);
      notify('Failed to save event.');
    }
  };

  const handleMassTimelineUpdate = async (items: Interaction[]) => {
    for (const item of items) {
      const original = appConfig.timeline.find((candidate) => candidate.id === item.id);
      if (!original || JSON.stringify(original) !== JSON.stringify(item)) {
        if (item.id.startsWith('temp-')) await handleAddTimeline(item);
        else await handleUpdateTimeline(item);
      }
    }
  };

  const handleDeleteTimeline = async (id: string) => {
    try {
      await timelineAPI.delete(id);
      setAppConfig((prev) => ({
        ...prev,
        timeline: prev.timeline.filter((event) => event.id !== id),
      }));
    } catch (error: unknown) {
      console.error('Failed to delete timeline event:', error);
      const message = getErrorMessage(error);
      if (message.includes('404') || message.includes('not found')) {
        setAppConfig((prev) => ({
          ...prev,
          timeline: prev.timeline.filter((event) => event.id !== id),
        }));
      } else {
        notify('Failed to delete memory. Please try again.');
      }
    }
  };

  return {
    addXP,
    handleAddLeaf,
    handleProposalStepChange,
    handleProposalAccepted,
    handleRedeemCoupon,
    handleAddCoupon,
    handleDeleteCoupon,
    handleSendMessage,
    handleUpdateMessage,
    handleUpdateTimeline,
    handleAddTimeline,
    handleDeleteTimeline,
    handleMassTimelineUpdate,
  };
};
