// @ts-nocheck

import { Interaction, LoveLetterMessage } from '../../../types';
import { configAPI, lettersAPI, timelineAPI, memoriesAPI, statsAPI, couponsAPI } from '../../../services/api';

export const useGardenActions = (ctx: any) => {
  const { appConfig, setAppConfig, handleSetAppConfig, loveStats, setLoveStats, activePartners, setPetEmotion, setPetMessage, setLoveLetters, showToast, setHasAcceptedProposal } = ctx;

  const addXP = async (amount: number, partnerId?: string) => {
    try {
      const res = await statsAPI.addXP(amount, partnerId);
      
      if (res.leveledUp) {
        const nextLevel = res.level;
        let message = `LEVEL UP! Nari evolved to Level ${nextLevel}! 🎉✨`;
        if (nextLevel === 2) message = "Nari is feeling royal! Level 2 Unlocked 👑";
        if (nextLevel === 3) message = "Magic flows through Nari! Level 3 Reached ✨";
        if (nextLevel === 4) message = "Nari has taken flight! Level 4 Angel Form 👼";
        if (nextLevel === 5) message = "Behold! Ascended Nari! Level 5 reached 🌟";
        
        setPetMessage(message);
        setPetEmotion('excited');
      }

      setLoveStats({
        xp: res.xp,
        level: res.level,
        leaves: res.leaves ?? loveStats.leaves,
        points: res.points ?? loveStats.points
      });
    } catch (e) {
      console.error("XP Update Failed:", e);
    }
  };

  const handleAddLeaf = async () => {
    if (loveStats.points < 100) {
      alert("Not enough points to grow a leaf! Create coupons to earn points. 🌱");
      return;
    }

    // Optimistic Update: Immediately update UI
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
       navigator.vibrate(50); // Haptic feedback
    }

    const prevStats = { ...loveStats }; // Backup for rollback
    setLoveStats(prev => ({
       ...prev,
       leaves: prev.leaves + 1,
       points: prev.points - 100
    }));
    setPetEmotion('happy');
    setPetMessage("A new memory planted! 🌱");
    setTimeout(() => setPetEmotion('neutral'), 3000);

    try {
      const res = await statsAPI.addLeaf();
      if (res.success) {
         // Sync with server response to ensure consistency (especially for level ups)
         setLoveStats(prev => ({
           ...prev,
           leaves: res.leaves,
           points: res.points,
           xp: res.xp,
           level: res.level,
         }));

         if (res.leveledUp) {
            setPetEmotion('excited');
            setPetMessage(`Level Up! Our garden is growing! Level ${res.level} 🌟`);
         }
      } else {
         // Revert on failure
         setLoveStats(prevStats);
         alert("Something went wrong growing the leaf.");
      }
    } catch (e) {
      console.error("Failed to add leaf:", e);
      setLoveStats(prevStats); // Revert on error
      alert("Something went wrong growing the leaf.");
    }
  };

  const handleProposalStepChange = (progress: number) => {
    handleSetAppConfig(prev => ({
      ...prev,
      proposal: { ...prev.proposal, progress }
    }));
  };

  const handleProposalAccepted = () => {
    setHasAcceptedProposal(true);
    // Update local state and persist to backend
    handleSetAppConfig(prev => ({
      ...prev,
      proposal: { ...prev.proposal, isAccepted: true }
    }));
  };


  const handleRedeemCoupon = async (id: string) => {
    try {
      // Call API first
      await couponsAPI.redeem(id);
      
      // Update state only after success
      setAppConfig(prev => ({
        ...prev,
        coupons: prev.coupons.map(c => c.id === id ? { ...c, isRedeemed: true, redeemedAt: new Date() } : c)
      }));

      // Add timeline event
      const coupon = appConfig.coupons.find(c => c.id === id);
      if (coupon) {
        const text = `🎟️ Coupon Redeemed: ${coupon.title} ${coupon.emoji}`;
        const timelineRes = await timelineAPI.create({
          text,
          type: 'system',
          timestamp: new Date().toISOString()
        });
        
        // Update timeline locally
        const newEvent: Interaction = {
          id: timelineRes.id,
          text: timelineRes.text,
          timestamp: new Date(timelineRes.timestamp),
          type: 'system'
        };
        
        setAppConfig(prev => ({
           ...prev,
           timeline: [newEvent, ...prev.timeline]
        }));
        
        // Refresh Stats to show new level/points (0 amount just recalculates)
        addXP(0);
      }

    } catch (err) {
      console.error("Failed to redeem coupon:", err);
      alert("Failed to redeem coupon. Please try again.");
    }
  };

  const handleAddCoupon = async (data: { title: string; emoji: string; desc: string; color: string; forPartner: string; points: number }) => {
    try {
      const newCoupon = await couponsAPI.create(data);
      setAppConfig(prev => ({
        ...prev,
        coupons: [...prev.coupons, newCoupon]
      }));
    } catch (err) {
      console.error("Failed to add coupon:", err);
      alert("Failed to add coupon.");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon? This cannot be undone.")) return;
    try {
      await couponsAPI.delete(id);
      setAppConfig(prev => ({
        ...prev,
        coupons: prev.coupons.filter(c => c.id !== id)
      }));
    } catch (err) {
      console.error("Failed to delete coupon:", err);
      alert("Failed to delete coupon.");
    }
  };

  const handleSendMessage = async (msg: LoveLetterMessage) => {
    try {
       // 1. Optimistic Update (Show immediately)
       setLoveLetters(prev => [msg, ...prev]);
       
       // 2. Prepare File if media exists (convert blob URL to File)
       let file: File | undefined;
       if (msg.media?.url && msg.media.url.startsWith('blob:')) {
         try {
           const response = await fetch(msg.media.url);
           const blob = await response.blob();
           const ext = msg.media.type === 'image' ? 'jpg' : msg.media.type === 'video' ? 'mp4' : 'ogg';
           file = new File([blob], `letter-media.${ext}`, { type: blob.type });
         } catch (e) {
           console.error("Failed to process media blob:", e);
         }
       }

       // 3. Persist Letter
       const savedLetter = await lettersAPI.create({
         fromId: msg.fromId, // 'partner1' or 'partner2'
         content: msg.content,
         unlockDate: msg.unlockDate.toISOString(),
         file: file
       });

        // 4. Update local state with real ID and storage URL
       setLoveLetters(prev => prev.map(l => l.id === msg.id ? { 
         ...l, 
         id: savedLetter.id, 
         media: savedLetter.media ? { type: savedLetter.media.type, url: savedLetter.media.url } : l.media 
       } : l));

       // 5. Update XP
       await addXP(20, msg.fromId);

       // 6. Add to Timeline
       const senderName = msg.fromId === 'partner1' ? appConfig.partners.partner1.name : appConfig.partners.partner2.name;
       
       // Persist timeline event
       const timelineRes = await timelineAPI.create({
         text: `💌 Letter from ${senderName}: ${msg.content.substring(0, 60)}...`,
         type: 'letter',
         timestamp: msg.unlockDate.toISOString()
       });

       // Update local timeline
       const newTimelineEvent: Interaction = {
         id: timelineRes.id,
         text: timelineRes.text,
         timestamp: new Date(timelineRes.timestamp),
         type: 'letter'
       };

       setAppConfig(prev => ({ 
         ...prev, 
         timeline: [newTimelineEvent, ...prev.timeline] 
       }));

    } catch (err) {
      console.error("Failed to send letter:", err);
      alert("Failed to save your letter. Please try again.");
      // Revert optimistic update
      setLoveLetters(prev => prev.filter(l => l.id !== msg.id));
    }
  };

    const handleUpdateMessage = async (msg: LoveLetterMessage) => {
    try {
      await lettersAPI.update(msg.id, {
        folder: msg.folder,
        isRead: msg.isRead,
        readAt: msg.readAt
      });
      // Optimistic update
      setLoveLetters(prev => prev.map(m => m.id === msg.id ? msg : m));
    } catch (err: unknown) {
        console.error("Failed to update message", err);
        alert(getErrorMessage(err) || 'Failed to update message');
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
                } catch (e) { console.error("Failed to process blob:", e); }
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
          files: files.length > 0 ? files : undefined
        });

        setAppConfig(prev => ({
          ...prev,
          timeline: prev.timeline.map(t => t.id === updated.id ? { 
            ...updated, 
            timestamp: new Date(updated.timestamp),
            media: saved.media,
            mediaItems: saved.mediaItems 
          } : t)
        }));
      } catch (err) {
        console.error("Failed to update timeline:", err);
        alert("Failed to save changes.");
      }
    };

    const handleMassTimelineUpdate = async (items: Interaction[]) => {
      for (const item of items) {
        const original = appConfig.timeline.find(t => t.id === item.id);
        if (!original || JSON.stringify(original) !== JSON.stringify(item)) {
          if (item.id.startsWith('temp-')) {
            await handleAddTimeline(item);
          } else {
            await handleUpdateTimeline(item);
          }
        }
      }
    };
 
   const handleAddTimeline = async (interaction: Interaction) => {
     try {
        // Handle files if present
        const files: File[] = [];
        const mediaToProcess = interaction.mediaItems?.length ? interaction.mediaItems : interaction.media ? [interaction.media] : [];
        
        for (const item of mediaToProcess) {
          if (item.url.startsWith('blob:')) {
            try {
              const res = await fetch(item.url);
              const blob = await res.blob();
              const ext = blob.type.split('/')[1] || 'jpg';
              files.push(new File([blob], `timeline-media-${Date.now()}.${ext}`, { type: blob.type }));
            } catch (e) { console.error("Failed to process blob:", e); }
          }
        }

        const saved = await timelineAPI.create({
          text: interaction.text,
          type: interaction.type,
          location: interaction.location,
          latitude: interaction.latitude,
          longitude: interaction.longitude,
          timestamp: interaction.timestamp.toISOString(),
          files: files.length > 0 ? files : undefined
        });

        const newEvent: Interaction = {
          ...interaction,
          id: saved.id,
          timestamp: new Date(saved.timestamp),
          media: saved.media,
          mediaItems: saved.mediaItems
        };

       setAppConfig(prev => ({
         ...prev,
         timeline: [newEvent, ...prev.timeline]
       }));
     } catch (err) {
       console.error("Failed to add timeline event:", err);
       alert("Failed to save event.");
     }
   };
 
    const handleDeleteTimeline = async (id: string) => {
      try {
        await timelineAPI.delete(id);
        setAppConfig(prev => ({
          ...prev,
          timeline: prev.timeline.filter(t => t.id !== id)
        }));
      } catch (err: unknown) {
        console.error("Failed to delete timeline event:", err);
        // If it's already gone from server (404), still remove it from local state to stay in sync
        const message = getErrorMessage(err);
        if (message.includes('404') || message.includes('not found')) {
          setAppConfig(prev => ({
            ...prev,
            timeline: prev.timeline.filter(t => t.id !== id)
          }));
        } else {
          alert("Failed to delete memory. Please try again.");
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
