"use client";

import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Timeline from '../../components/Timeline';
import MemoryFrame from '../../components/MemoryFrame';
import ProposalScreen from '../../components/ProposalScreen';
import LoveCoupons from '../../components/LoveCoupons';
import LoveLetter from '../../components/LoveLetter';
import LoveTree3D from '../../components/LoveTree3D';
import EditDrawer from '../../components/EditDrawer';
import Logo from '../../components/Logo';
import SimplePlayer from '../../components/SimplePlayer';
import Toast from '../../components/Toast';
import TimelineSpreadsheet from '../../components/TimelineSpreadsheet';
import { Interaction, Emotion, LoveLetterMessage, LoveStats, MemoryItem, AppConfig } from '../../types';
import { configAPI, lettersAPI, timelineAPI, memoriesAPI, statsAPI, couponsAPI, partnersAPI } from '../../services/api';
import { useAuth } from '../../components/AuthProvider';
import UserDropdown from '../../components/UserDropdown';
import UserProfileModal from '../../components/UserProfileModal';
import Shop, { ShopItem } from '../../components/Shop';
import World3D from '../../components/World3D';
import OptimizedImage from '../../components/OptimizedImage';

const INITIAL_MEMORIES: MemoryItem[] = [];
const INITIAL_TIMELINE: Interaction[] = [];

const INITIAL_COUPONS: any[] = [];

const Home: React.FC = () => {
  const { user, logout, loading: authLoading, circles, activeCircleId, setActiveCircle } = useAuth();
  const [hasAcceptedProposal, setHasAcceptedProposal] = useState(false);
  const [isLetterOpen, setIsLetterOpen] = useState(false); 
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);
  const [isStatsGuideOpen, setIsStatsGuideOpen] = useState(false);
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  const [isMusicMuted, setIsMusicMuted] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [toast, setToast] = useState({ message: '', isVisible: false });

  const showToast = (message: string) => {
    setToast({ message, isVisible: true });
  };
  
  const [petEmotion, setPetEmotion] = useState<Emotion>('neutral');
  const [petMessage, setPetMessage] = useState("Hello! Welcome back to our world! 🐾");
  const [loveStats, setLoveStats] = useState<LoveStats & { leaves: number; points: number }>({ 
    xp: 0, 
    level: 1, 
    leaves: 0,
    points: 0,
    partnerPoints: {
      partner1: 0,
      partner2: 0
    }
  });
  const [loveLetters, setLoveLetters] = useState<LoveLetterMessage[]>([]);
  const [timeline, setTimeline] = useState<Interaction[]>([]); // New local timeline state if we separate it
  // Note: currently timeline is in appConfig.timeline. We should populate that.

  const [appConfig, setAppConfig] = useState<AppConfig>({
    appName: "Our Story",
    anniversaryDate: new Date().toISOString(),
    treeStyle: "oak",
    viewMode: "3d",
    galleryStyle: "carousel",
    gallerySource: "manual",
    instagramUsername: "",
    daysPerTree: 100,
    daysPerFlower: 7,
    flowerType: 'cherry',
    mixedFlowers: ['sunflower', 'tulip', 'rose', 'cherry', 'lavender', 'heart'],
    timelineDefaultRows: 5,
    showTimelineImagesOnHomepage: true,
    includeTimelineInGallery: true,
    skyMode: "follow_timezone",
    musicPlaylist: ["https://www.youtube.com/watch?v=igx8-BdblEI"],
    proposal: {
      questions: ["Will you be my partner forever?"],
      isAccepted: false,
      progress: 0
    },
    gallery: INITIAL_MEMORIES,
    timeline: INITIAL_TIMELINE,
    partners: {
      partner1: { name: 'Partner 1', avatar: '❤️' },
      partner2: { name: 'Partner 2', avatar: '💖' }
    },
    coupons: INITIAL_COUPONS,
    showProposal: true,
  });

  const [galleryViewMode, setGalleryViewMode] = useState<'all' | 'public' | 'private'>('all');
  const [activeTab, setActiveTab] = useState<'home' | 'timeline' | 'coupons' | 'letters' | 'shop'>('home'); // Add activeTab state
  const [worldMode, setWorldMode] = useState<'tree' | 'globe'>('tree');
  const [isWorldConfigOpen, setIsWorldConfigOpen] = useState(false);
  const [isLandDropdownOpen, setIsLandDropdownOpen] = useState(false);
  const [isCircleDropdownOpen, setIsCircleDropdownOpen] = useState(false);
  const [landSearch, setLandSearch] = useState('');
  const [selectedFlagItem, setSelectedFlagItem] = useState<Interaction | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  // ─── Load config & data from database on mount ─────────────────────────────
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    // PWA Install Prompt Logic
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      showToast("App installed successfully! 🎉");
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Sync the logged-in user as a circle partner (fire-and-forget before config fetch)
        if (user?.sub) {
          await partnersAPI.sync({ name: user.name }).catch(() => {});
        }

        const [
          serverConfig,
          letters,
          timelineData,
          memories,
          stats
        ] = await Promise.all([
          configAPI.get(),
          lettersAPI.list().catch(() => []),
          timelineAPI.list().catch(() => []), 
          memoriesAPI.list().catch(() => []),
          statsAPI.get().catch(() => ({ xp: 0, level: 1, leaves: 0, points: 0 }))
        ]);

        // Transform Timeline Data
        const mappedTimeline = timelineData.map((t: any) => ({
           id: t.id,
           text: t.text,
           type: t.type,
           timestamp: new Date(t.timestamp),
           location: t.location,
           latitude: t.latitude,
           longitude: t.longitude,
           media: t.media,
           mediaItems: t.mediaItems
        }));

        setAppConfig(prev => ({
          ...prev,
          appName: serverConfig.appName || prev.appName,
          anniversaryDate: serverConfig.anniversaryDate || prev.anniversaryDate,
          treeStyle: serverConfig.treeStyle || prev.treeStyle,
          galleryStyle: serverConfig.galleryStyle || prev.galleryStyle,
          gallerySource: serverConfig.gallerySource || prev.gallerySource,
          instagramUsername: serverConfig.instagramUsername || prev.instagramUsername,
          daysPerTree: serverConfig.daysPerTree ?? prev.daysPerTree,
          daysPerFlower: serverConfig.daysPerFlower ?? prev.daysPerFlower,
          flowerType: serverConfig.flowerType || prev.flowerType,
          mixedFlowers: serverConfig.mixedFlowers || prev.mixedFlowers,
          skyMode: serverConfig.skyMode || prev.skyMode,
          petType: serverConfig.petType || prev.petType,
          pets: serverConfig.pets || prev.pets,
          timelineDefaultRows: serverConfig.timelineDefaultRows ?? prev.timelineDefaultRows,
          showTimelineImagesOnHomepage: serverConfig.showTimelineImagesOnHomepage ?? prev.showTimelineImagesOnHomepage,
          includeTimelineInGallery: serverConfig.includeTimelineInGallery ?? prev.includeTimelineInGallery,
          musicPlaylist: serverConfig.musicPlaylist || prev.musicPlaylist,
          proposal: serverConfig.proposal || prev.proposal,
          partners: serverConfig.partners || prev.partners,
          gallery: memories.length ? memories.map((m: any) => ({ id: m.id, url: m.url, privacy: m.privacy, caption: m.caption, albumId: m.albumId })) : prev.gallery,
          timeline: mappedTimeline,
          coupons: serverConfig.coupons?.length ? serverConfig.coupons : prev.coupons,
          albums: serverConfig.albums || prev.albums,
          lands: serverConfig.lands || prev.lands,
          showProposal: serverConfig.showProposal ?? prev.showProposal,
        }));

        // Transform Letters
        setLoveLetters(letters.map((l: any) => ({
          id: l.id,
          fromId: l.fromId === serverConfig.partners?.partner1?.partnerId ? 'partner1' : 'partner2', // Simplified assumption, logic might need adjustment if schema differs
          content: l.content,
          folder: l.folder,
          timestamp: new Date(l.createdAt),
          unlockDate: new Date(l.unlockDate),
          isRead: l.isRead,
          readAt: l.readAt ? new Date(l.readAt) : undefined,
          media: l.mediaUrl ? { type: l.mediaType, url: l.mediaUrl } : undefined
        })));

        // Set Proposal State
        if (serverConfig.proposal?.isAccepted) {
          setHasAcceptedProposal(true);
        }

        // Set Stats
        setLoveStats(stats);
        
        setConfigLoaded(true);
      } catch (err: any) {
        console.warn('⚠️ Could not load data from API, using defaults:', err.message);
        setConfigLoaded(true);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCircleId]);

  useEffect(() => {
    if (activeTab !== 'home') {
      setIsWorldConfigOpen(false);
      setLandSearch('');
    }
  }, [activeTab]);

  // ─── Save config to database when setAppConfig is called ────────────
  const handleSetAppConfig: typeof setAppConfig = (updater) => {
    setAppConfig((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Persist to database (fire & forget)
      configAPI.update({
        appName: next.appName,
        anniversaryDate: next.anniversaryDate,
        treeStyle: next.treeStyle,
        galleryStyle: next.galleryStyle,
        gallerySource: next.gallerySource,
        instagramUsername: next.instagramUsername,
        daysPerTree: next.daysPerTree,
        daysPerFlower: next.daysPerFlower,
        flowerType: next.flowerType,
        mixedFlowers: next.mixedFlowers,
        skyMode: next.skyMode,
        petType: next.petType,
        pets: next.pets,
        timelineDefaultRows: next.timelineDefaultRows,
        showTimelineImagesOnHomepage: next.showTimelineImagesOnHomepage,
        includeTimelineInGallery: next.includeTimelineInGallery,
        musicPlaylist: next.musicPlaylist,
        proposal: next.proposal,
        isProposalAccepted: next.proposal.isAccepted,
        proposalProgress: next.proposal.progress,
        partners: next.partners,
        coupons: next.coupons,
        gallery: next.gallery,
        showProposal: next.showProposal,
      }).then(() => {})
        .catch((err: any) => console.error('❌ Failed to save config:', err.message));
      return next;
    });
  };

  useEffect(() => {
    const isCompleted = !appConfig.showProposal || !!appConfig.proposal?.isAccepted || 
                        ((appConfig.proposal?.progress || 0) >= (appConfig.proposal?.questions?.length || 0) && (appConfig.proposal?.questions?.length || 0) > 0);
    setHasAcceptedProposal(isCompleted);
  }, [appConfig.proposal?.isAccepted, appConfig.proposal?.progress, appConfig.proposal?.questions?.length, appConfig.showProposal]);

  useEffect(() => {
    if (!hasAcceptedProposal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      document.body.style.overflowX = 'hidden';
    }
  }, [hasAcceptedProposal]);

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

       // 4. Update local state with real ID and S3 URL
       setLoveLetters(prev => prev.map(l => l.id === msg.id ? { 
         ...l, 
         id: savedLetter.id, 
         media: savedLetter.media ? { type: savedLetter.media.type as any, url: savedLetter.media.url } : l.media 
       } : l));

       // 5. Update XP
       await addXP(20, msg.fromId);

       // 6. Add to Timeline
       const senderName = appConfig.partners[msg.fromId]?.name || msg.fromId;
       
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
    } catch (err: any) {
        console.error("Failed to update message", err);
        alert(err.message || 'Failed to update message');
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
      } catch (err: any) {
        console.error("Failed to delete timeline event:", err);
        // If it's already gone from server (404), still remove it from local state to stay in sync
        if (err.message?.includes('404') || err.message?.includes('not found')) {
          setAppConfig(prev => ({
            ...prev,
            timeline: prev.timeline.filter(t => t.id !== id)
          }));
        } else {
          alert("Failed to delete memory. Please try again.");
        }
      }
    };

  const combinedInteractions = useMemo(() => {
    const interactions = [...appConfig.timeline];
    
    if (appConfig.showCouponsOnTimeline) {
      const couponInteractions: Interaction[] = appConfig.coupons
        .filter(c => c.isRedeemed && c.redeemedAt)
        .map(c => ({
          id: `coupon-${c.id}`,
          text: `Redeemed: ${c.emoji} ${c.title}`,
          timestamp: c.redeemedAt instanceof Date ? c.redeemedAt : new Date(c.redeemedAt!),
          type: 'system' as const,
        }));
      
      interactions.push(...couponInteractions);
    }
    
    return interactions;
  }, [appConfig.timeline, appConfig.coupons, appConfig.showCouponsOnTimeline]);

  const handleTimelineConfigUpdate = (updates: { layoutMode?: 'vertical' | 'wave' | 'gallery', zoomLevel?: number }) => {
    handleSetAppConfig(prev => ({
      ...prev,
      timelineLayoutMode: updates.layoutMode || prev.timelineLayoutMode,
      timelineZoomLevel: updates.zoomLevel !== undefined ? updates.zoomLevel : prev.timelineZoomLevel
    }));
  };

  const daysTogether = Math.max(0, Math.floor((new Date().getTime() - new Date(appConfig.anniversaryDate).getTime()) / (1000 * 60 * 60 * 24)));
  const flowerCount = Math.floor(daysTogether / appConfig.daysPerFlower);

  const activeCircle = useMemo(
    () => circles.find(circle => circle.id === activeCircleId) || null,
    [circles, activeCircleId]
  );

  const activeLand = useMemo(
    () => appConfig.lands?.find(land => land.isActive) || appConfig.lands?.[0] || null,
    [appConfig.lands]
  );

  const filteredLands = useMemo(() => {
    const query = landSearch.trim().toLowerCase();
    if (!appConfig.lands) return [];
    if (!query) return appConfig.lands;
    return appConfig.lands.filter(land => land.name.toLowerCase().includes(query));
  }, [appConfig.lands, landSearch]);

  const handleSelectLand = async (landId: string, landName: string) => {
    setAppConfig(prev => ({
      ...prev,
      lands: prev.lands?.map(land => ({ ...land, isActive: land.id === landId }))
    }));
    setIsWorldConfigOpen(false);
    setLandSearch('');
    showToast(`Switched to ${landName}!`);

    try {
      await fetch(`/api/lands/${landId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });
    } catch (e) {
      console.error('Failed to persist active land:', e);
    }
  };

  const handleWorldFlagClick = React.useCallback((item: Interaction) => {
    setSelectedFlagItem(item);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-2 md:p-6 relative overflow-x-hidden bg-[#F7f5f2]">
        {/* Fullscreen Background & Tree/Globe */}
        <div className="fixed inset-0 z-0">
           {worldMode === 'tree' ? (
             <LoveTree3D 
               anniversaryDate={appConfig.anniversaryDate} 
               treeStyle={appConfig.treeStyle} 
               petEmotion={petEmotion}
               petMessage={petMessage}
               level={loveStats.level}
               daysPerTree={appConfig.daysPerTree}
               daysPerFlower={appConfig.daysPerFlower}
               flowerType={appConfig.flowerType}
               mixedFlowers={appConfig.mixedFlowers}
               leaves={loveStats.leaves}
               points={loveStats.points}
               skyMode={appConfig.skyMode}
               showQRCode={appConfig.showQRCode}
               petType={appConfig.petType}
               pets={appConfig.pets}
               albums={appConfig.albums}
               graphicsQuality={appConfig.graphicsQuality}
               onAddLeaf={handleAddLeaf}
               purchasedItems={appConfig.lands?.find(l => l.isActive)?.items}
               onUpdateItemPosition={async (itemId: string, x: number, y: number, z: number) => {
                  try {
                     setAppConfig(prev => {
                        if (!prev.lands) return prev;
                        const newLands = prev.lands.map(l => {
                           if (!l.isActive) return l;
                           return {
                              ...l,
                              items: l.items?.map(it => it.id === itemId ? { ...it, x, y, z } : it)
                           };
                        });
                        return { ...prev, lands: newLands };
                     });
                     
                     await fetch(`/api/purchased-items/${itemId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ x, y, z })
                     });
                  } catch (e) {
                     console.error("Failed to update item position", e);
                  }
               }}
               activeLandId={appConfig.lands?.find(l => l.isActive)?.id}
               onPurchase={async (item) => {
                  try {
                    const landId = appConfig.lands?.find(l => l.isActive)?.id;
                    if (!landId) return;
                    setLoveStats(prev => ({ ...prev, points: prev.points - item.price }));
                    const res = await fetch('/api/purchased-items', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ type: item.type, landId, modelUrl: item.modelUrl })
                    });
                    if (!res.ok) throw new Error("Failed to purchase");
                    const newItem = await res.json();
                    setAppConfig(prev => ({
                      ...prev,
                      lands: prev.lands?.map(l => l.id === landId ? { ...l, items: [...(l.items || []), newItem] } : l)
                    }));
                    showToast(`You bought a ${item.name}! 🛍️`);
                  } catch (err) {
                    console.error("Purchase error", err);
                    setLoveStats(prev => ({ ...prev, points: prev.points + item.price }));
                    showToast("Purchase failed. Please try again.");
                  }
               }}
             />
           ) : (
             <World3D 
                timeline={appConfig.timeline} 
                onFlagClick={handleWorldFlagClick}
                paused={!!selectedFlagItem}
             />
           )}
        </div>

        {/* Land Float Button + Dropdown with Search — legacy, kept for future use */}
        {false && worldMode === 'tree' && (appConfig.lands?.length || 0) > 1 && (
          <div className="relative">
                {/* Dropdown */}
                <AnimatePresence>
                  {isLandDropdownOpen && (
                    <>
                      {/* Click-outside backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsLandDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-xl border border-black/10 shadow-2xl rounded-none p-3 min-w-[210px] z-50"
                      >
                        <div className="flex items-center gap-2 bg-gray-100 rounded-none px-3 py-2 mb-2">
                          <i className="fas fa-search text-[10px] text-black/60"></i>
                          <input
                            type="text"
                            placeholder="Search lands..."
                            value={landSearch}
                            onChange={e => setLandSearch(e.target.value)}
                            className="bg-transparent text-xs text-gray-700 outline-none flex-1 placeholder-gray-400"
                            autoFocus
                          />
                          {landSearch && (
                            <button onClick={() => setLandSearch('')} className="text-gray-300 hover:text-gray-500">
                              <i className="fas fa-times text-[9px]"></i>
                            </button>
                          )}
                        </div>

                        {/* Land list */}
                        <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                          {(appConfig.lands || [])
                            .filter(l => l.name.toLowerCase().includes(landSearch.toLowerCase()))
                            .map(land => (
                              <button
                                key={land.id}
                                onClick={async () => {
                                  setAppConfig(prev => ({
                                    ...prev,
                                    lands: prev.lands?.map(l => ({ ...l, isActive: l.id === land.id }))
                                  }));
                                  setIsLandDropdownOpen(false);
                                  showToast(`Switched to ${land.name}! ✨`);
                                  try {
                                    await fetch(`/api/lands/${land.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ isActive: true })
                                    });
                                  } catch (e) {
                                    console.error('Failed to persist active land:', e);
                                  }
                                }}
                                className={`flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                                  land.isActive
                                    ? 'bg-black text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-black/5 hover:text-black'
                                }`}
                              >
                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${land.isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                                  {land.icon || '🏞️'}
                                </span>
                                <span className="flex-1 truncate">{land.name}</span>
                                {land.isActive && <i className="fas fa-check-circle text-[10px] opacity-70 flex-shrink-0"></i>}
                              </button>
                            ))}
                          {(appConfig.lands || []).filter(l => l.name.toLowerCase().includes(landSearch.toLowerCase())).length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No lands found</p>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

        {/* Selected Flag Modal */}
        <AnimatePresence>
          {selectedFlagItem && (
             <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={() => setSelectedFlagItem(null)}
             >
                <motion.div 
                   className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl overflow-hidden"
                   onClick={(e) => e.stopPropagation()}
                   initial={{ scale: 0.9, y: 20 }}
                   animate={{ scale: 1, y: 0 }}
                   exit={{ scale: 0.9, y: 20 }}
                >
                   <div className="flex justify-between items-start mb-4">
                      <div>
                         <h3 className="font-geist font-bold tracking-tight text-2xl text-black">Memory</h3>
                         <p className="text-xs font-bold text-gray-400">{new Date(selectedFlagItem.timestamp).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => setSelectedFlagItem(null)} className="text-gray-400 hover:text-gray-600">
                         <i className="fas fa-times text-xl"></i>
                      </button>
                   </div>
                   
                   {(() => {
                     const previewImage =
                       selectedFlagItem.mediaItems?.find((media) => media.type === 'image') ||
                       (selectedFlagItem.media?.type === 'image' ? selectedFlagItem.media : null);

                     if (!previewImage) return null;

                     return (
                       <div className="rounded-xl overflow-hidden mb-4 shadow-sm border-2 border-pink-50 max-h-48 bg-gray-50">
                          <OptimizedImage
                            src={previewImage.url}
                            alt={selectedFlagItem.text || 'Memory preview'}
                            className="w-full h-48 object-cover"
                            width={512}
                            height={288}
                            priority
                            loading="eager"
                            sizes="(max-width: 768px) 90vw, 384px"
                          />
                       </div>
                     );
                   })()}
                   
                   <p className="text-gray-700 font-medium mb-4">{selectedFlagItem.text}</p>
                   
                   {selectedFlagItem.location && (
                     <div className="flex items-center gap-2 text-xs font-bold font-mono text-purple-500 bg-purple-50 px-3 py-2 rounded-lg">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{selectedFlagItem.location}</span>
                     </div>
                   )}
                   
                   <button 
                     onClick={() => {
                       setSelectedFlagItem(null);
                       setWorldMode('tree');
                       setActiveTab('timeline');
                     }} 
                     className="mt-6 w-full py-3 bg-black text-white font-bold rounded-none shadow-md hover:shadow-lg hover:bg-zinc-800 transition-all"
                   >
                      View on Timeline
                   </button>
                </motion.div>
             </motion.div>
          )}
        </AnimatePresence>

      
      <AnimatePresence>
        {configLoaded && appConfig.showProposal && !hasAcceptedProposal && (
          <ProposalScreen 
            onAccept={handleProposalAccepted} 
            onStepChange={handleProposalStepChange}
            questions={appConfig.proposal} 
            appName={appConfig.appName} 
          />
        )}
      </AnimatePresence>

      {hasAcceptedProposal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col z-10 relative">

          {/* Tab Content Rendering */}
          <div className="flex-1 w-full overflow-y-auto overflow-x-hidden pb-24"> {/* Added padding bottom for tab bar */}
             
             {activeTab === 'home' && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 transition={{ duration: 0.3 }}
                 className="flex flex-col items-center w-full min-h-full pt-20"
               >
                 <MemoryFrame 
                    isVisible={true} 
                    items={appConfig.gallery} 
                    albums={appConfig.albums}
                    style={appConfig.galleryStyle} 
                    source={appConfig.gallerySource}
                    username={appConfig.instagramUsername}
                    viewMode={galleryViewMode}
                    onViewModeChange={setGalleryViewMode}
                    variant="sky"
                    timelineItems={appConfig.timeline}
                    includeTimelineInGallery={appConfig.includeTimelineInGallery}
                 />
                 
                 {/* Spacer for Home view scrolling if needed */}
                 <div className="h-24"></div> 
               </motion.div>
             )}

             {activeTab === 'timeline' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex justify-center pt-12 md:pt-24"
                >
                  <Timeline 
                    interactions={combinedInteractions} 
                    anniversaryDate={appConfig.anniversaryDate} 
                    defaultRows={appConfig.timelineDefaultRows}
                    onUpdateInteraction={handleUpdateTimeline}
                    onDeleteInteraction={handleDeleteTimeline}
                    onAddInteraction={handleAddTimeline}
                    onOpenSpreadsheet={() => setIsSpreadsheetOpen(true)}
                    cardScale={appConfig.timelineCardScale}
                    layoutMode={appConfig.timelineLayoutMode}
                    zoomLevel={appConfig.timelineZoomLevel}
                    thumbnailHeight={appConfig.timelineThumbnailHeight}
                    onUpdateConfig={handleTimelineConfigUpdate}
                 />
                </motion.div>
             )}

             {activeTab === 'coupons' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex justify-center pt-12 md:pt-24"
                >
                  <LoveCoupons 
                    coupons={appConfig.coupons} 
                    partners={appConfig.partners} 
                    onRedeem={handleRedeemCoupon}
                    onDelete={handleDeleteCoupon}
                    onAdd={handleAddCoupon}
                  />
                </motion.div>
             )}

             {activeTab === 'shop' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex justify-center pt-12 md:pt-24 px-4 overflow-y-auto"
                >
                  <Shop 
                    points={loveStats.points} 
                    activeLandId={appConfig.lands?.find(l => l.isActive)?.id}
                    onPurchase={async (item) => {
                       try {
                         const landId = appConfig.lands?.find(l => l.isActive)?.id;
                         if (!landId) return;
                         
                         // Deduct points locally (temporary until synced)
                         setLoveStats(prev => ({ ...prev, points: prev.points - item.price }));
                         
                         const res = await fetch('/api/purchased-items', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: item.type, landId })
                         });
                         
                         if (!res.ok) throw new Error("Failed to purchase");
                         
                         const newItem = await res.json();
                         // Add to local config
                         setAppConfig(prev => ({
                           ...prev,
                           lands: prev.lands?.map(l => l.id === landId ? { ...l, items: [...(l.items || []), newItem] } : l)
                         }));
                         
                         showToast(`You bought a ${item.name}! 🛍️`);
                       } catch (err) {
                         console.error("Purchase error", err);
                         setLoveStats(prev => ({ ...prev, points: prev.points + item.price })); // Refund
                         showToast("Purchase failed. Please try again.");
                       }
                    }} 
                  />
                </motion.div>
             )}

             {activeTab === 'letters' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-[calc(100vh-180px)] flex justify-center pt-10 md:pt-20 px-0 md:px-4"
                >
                  <LoveLetter 
                    isOpen={true} 
                    isInline={true}
                    onClose={() => setActiveTab('home')} 
                    messages={loveLetters}
                    onSendMessage={handleSendMessage}
                    partners={appConfig.partners}
                  />
                </motion.div>
             )}
          </div>

          {/* Bottom Navigation Tab Bar - DIGITAL ARCHIVE STYLE */}
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-black/5 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-none px-12 py-5 flex items-center gap-14 z-[70]">
             <button 
               onClick={() => setActiveTab('home')}
               className={`flex flex-col items-center gap-2 transition-all duration-300 ${activeTab === 'home' ? 'text-black' : 'text-black/20 hover:text-black/50'}`}
             >
               <i className={`fas fa-fingerprint transition-all ${activeTab === 'home' ? 'text-lg' : 'text-sm'}`}></i>
               <span className="text-[9px] font-black uppercase tracking-[0.3em]">Archive</span>
             </button>

             <button 
               onClick={() => setActiveTab('timeline')}
               className={`flex flex-col items-center gap-2 transition-all duration-300 ${activeTab === 'timeline' ? 'text-black' : 'text-black/20 hover:text-black/50'}`}
             >
               <i className={`fas fa-barcode transition-all ${activeTab === 'timeline' ? 'text-lg' : 'text-sm'}`}></i>
               <span className="text-[9px] font-black uppercase tracking-[0.3em]">Timeline</span>
             </button>

             <button 
               onClick={() => setActiveTab('coupons')}
               className={`flex flex-col items-center gap-2 transition-all duration-300 ${activeTab === 'coupons' ? 'text-black' : 'text-black/20 hover:text-black/50'}`}
             >
               <i className={`fas fa-terminal transition-all ${activeTab === 'coupons' ? 'text-lg' : 'text-sm'}`}></i>
               <span className="text-[9px] font-black uppercase tracking-[0.3em]">Utility</span>
             </button>

             <button 
               onClick={() => setActiveTab('letters')}
               className={`flex flex-col items-center gap-2 transition-all duration-300 relative ${activeTab === 'letters' ? 'text-black' : 'text-black/20 hover:text-black/50'}`}
             >
               <i className={`fas fa-folder-open transition-all ${activeTab === 'letters' ? 'text-lg' : 'text-sm'}`}></i>
               <span className="text-[9px] font-black uppercase tracking-[0.3em]">Records</span>
               {loveLetters.filter(l => !l.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-4 bg-black text-white text-[8px] px-2 py-0.5 font-black shadow-sm">
                    {loveLetters.filter(l => !l.isRead).length}
                  </span>
               )}
             </button>
          </div>

          {/* Fixed UI Overlays - Always Visible (Outside the scrollable content flow) */}
          
          {/* Config & Top Menu - Persistently Visible */}
          <div className="fixed top-8 right-8 md:right-14 flex items-center gap-4 z-[60]">

             {/* World Config button + popover */}
             <div className="relative">
               <button
                 onClick={() => { setIsWorldConfigOpen(prev => !prev); if (isWorldConfigOpen) setLandSearch(''); }}
                 className={`w-12 h-12 flex items-center justify-center transition-all border border-black/10 backdrop-blur-3xl rounded-none group ${
                   isWorldConfigOpen ? 'bg-black text-white' : 'bg-white/50 text-black hover:bg-black hover:text-white'
                 }`}
               >
                 <i className={`fas ${isWorldConfigOpen ? 'fa-times' : 'fa-sliders-h'} text-[10px]`}></i>
                 <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black opacity-20 group-hover:opacity-100"></div>
               </button>

               <AnimatePresence>
                 {isWorldConfigOpen && (
                   <>
                     <button
                       type="button"
                       aria-label="Close world config"
                       className="fixed inset-0 z-40 cursor-default"
                       onClick={() => { setIsWorldConfigOpen(false); setLandSearch(''); }}
                     />
                     <motion.div
                       initial={{ opacity: 0, scale: 0.98 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.98 }}
                       transition={{ duration: 0.2 }}
                       className="absolute top-full right-0 mt-4 z-50 w-64 rounded-none bg-white/90 backdrop-blur-2xl border border-black/10 shadow-[0_30px_60px_rgba(0,0,0,0.15)] p-6 space-y-6 text-black overflow-hidden"
                     >
                       {/* View mode toggle */}
                       <div className="flex gap-1 bg-black/5 rounded-none p-1">
                         <button
                           onClick={() => setWorldMode('tree')}
                           className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-none text-[9px] font-black uppercase tracking-widest transition-all ${
                             worldMode === 'tree' ? 'bg-black text-white shadow-xl' : 'text-black/30 hover:text-black/60'
                           }`}
                         >
                            Garden.exe
                         </button>
                         <button
                           onClick={() => setWorldMode('globe')}
                           className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-none text-[9px] font-black uppercase tracking-widest transition-all ${
                             worldMode === 'globe' ? 'bg-black text-white shadow-xl' : 'text-black/30 hover:text-black/60'
                           }`}
                         >
                            Globe.exe
                         </button>
                       </div>

                       {/* World list */}
                       {circles.length > 0 && (
                         <div>
                           <p className="text-[8px] font-black uppercase tracking-[0.4em] text-black/20 mb-3 ml-1">Archive_Indices</p>
                           <div className="space-y-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                             {circles.map(circle => (
                               <button
                                 key={circle.id}
                                 onClick={async () => {
                                   if (circle.id !== activeCircleId) {
                                     await setActiveCircle(circle.id);
                                     showToast(`Switched to ${circle.name}!`);
                                   }
                                   setIsWorldConfigOpen(false);
                                   setLandSearch('');
                                 }}
                                 className={`w-full flex items-center gap-4 px-4 py-3 rounded-none text-[10px] font-black uppercase tracking-widest transition-all text-left group ${
                                   circle.id === activeCircleId
                                     ? 'bg-black text-white'
                                     : 'text-black/40 hover:bg-black/5 hover:text-black'
                                 }`}
                               >
                                 <span className="flex-1 truncate">{circle.name}</span>
                                 {circle.id === activeCircleId && <div className="w-1.5 h-1.5 bg-white"></div>}
                               </button>
                             ))}
                           </div>
                         </div>
                       )}
                     </motion.div>
                   </>
                 )}
               </AnimatePresence>
             </div>

             {/* Volume Control */}
             <div className="relative">
                <button
                  onClick={() => setIsVolumeModalOpen(!isVolumeModalOpen)}
                  className={`w-12 h-12 flex items-center justify-center transition-all border border-black/10 backdrop-blur-3xl rounded-none ${
                    isMusicMuted ? 'bg-[#EAE6E1] text-black opacity-40' : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  <i className={`fas ${isMusicMuted ? 'fa-volume-mute' : 'fa-volume-up'} text-[10px]`}></i>
                </button>
                <AnimatePresence>
                   {isVolumeModalOpen && (
                     <motion.div
                       initial={{ opacity: 0, y: -10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="absolute top-full right-0 mt-4 bg-white/90 backdrop-blur-xl p-4 rounded-none shadow-2xl border border-black/10 flex flex-col items-center gap-4 w-12"
                     >
                        <span className="text-[7px] font-black text-black/30 uppercase tracking-widest">VOL</span>
                        <div className="h-32 w-[2px] bg-black/5 relative overflow-hidden">
                           <input 
                              type="range" min="0" max="1" step="0.01" value={isMusicMuted ? 0 : musicVolume}
                              onChange={(e) => { setMusicVolume(parseFloat(e.target.value)); setIsMusicMuted(false); }}
                              className="absolute inset-0 w-32 h-full opacity-0 cursor-pointer -rotate-90 origin-left translate-y-32"
                           />
                           <div className="absolute bottom-0 left-0 right-0 bg-black" style={{ height: `${(isMusicMuted ? 0 : musicVolume) * 100}%` }} />
                        </div>
                     </motion.div>
                   )}
                </AnimatePresence>
             </div>

             <UserDropdown
                user={user}
                onLogout={logout}
                onEditUserInfo={() => setIsUserProfileModalOpen(true)}
                onOpenSettings={() => setIsEditDrawerOpen(true)}
                loading={authLoading}
              />
          </div>

          {/* TOP CENTER: System Status */}
          {activeTab === 'home' && (
            <div 
              className="fixed top-12 left-1/2 transform -translate-x-1/2 z-[80] flex flex-col items-center pointer-events-auto cursor-pointer group"
              onClick={() => setIsStatsGuideOpen(true)}
            >
              <div className="flex items-center gap-10 md:gap-24 pb-4 px-12 border-x border-black/5">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] md:text-[9px] font-black text-black/20 uppercase tracking-[0.6em] mb-2">ALLOCATION_TIME</span>
                    <span className="text-xl md:text-4xl font-black text-black flex items-center gap-3 tracking-extratight leading-none">
                        {daysTogether} <span className="text-[9px] md:text-[10px] font-black text-black/30 uppercase tracking-[0.4em]">DAYS</span>
                    </span>
                  </div>
                  <div className="w-[1px] h-8 md:h-12 bg-black/10"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] md:text-[9px] font-black text-black/20 uppercase tracking-[0.6em] mb-2">SYSTEM_RESOURCES</span>
                    <div className="flex items-center gap-6 md:gap-16">
                       <div className="flex flex-col items-center">
                          <span className="text-sm md:text-2xl font-black text-black tracking-extratight leading-none">{flowerCount}</span>
                          <span className="text-[7px] md:text-[8px] font-black text-black/30 uppercase tracking-widest mt-1">BLOOMS</span>
                       </div>
                       <div className="flex flex-col items-center">
                          <span className="text-sm md:text-2xl font-black text-black tracking-extratight leading-none">{loveStats.leaves?.toLocaleString()}</span>
                          <span className="text-[7px] md:text-[8px] font-black text-black/30 uppercase tracking-widest mt-1">ARTIFACTS</span>
                       </div>
                       <div className="flex flex-col items-center">
                          <span className="text-sm md:text-2xl font-black text-black tracking-extratight leading-none">{loveStats.level}</span>
                          <span className="text-[7px] md:text-[8px] font-black text-black/30 uppercase tracking-widest mt-1">INDEX</span>
                       </div>
                       <div className="flex flex-col items-center">
                          <span className="text-sm md:text-2xl font-black text-black tracking-extratight leading-none">{loveStats.points?.toLocaleString()}</span>
                          <span className="text-[7px] md:text-[8px] font-black text-black/30 uppercase tracking-widest mt-1">UNITS</span>
                       </div>
                    </div>
                  </div>
              </div>
              <div className="w-72 md:w-full h-[1px] bg-black/5 mt-4 relative overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (loveStats.xp / (loveStats.level * 100)) * 100)}%` }}
                    className="h-full bg-black group-hover:bg-zinc-400 transition-colors"
                  />
              </div>
            </div>
          )}

          {/* TOP LEFT: Auth Session Marker */}
          <div className="fixed top-8 left-8 md:left-14 flex flex-col items-start gap-2 z-[80]">
            <Logo size={isMobile ? 40 : 50} title={appConfig.appName} className="grayscale opacity-80" />
            <div className="h-[1px] w-12 bg-black/10"></div>
            <span className="text-[8px] font-black text-black/20 uppercase tracking-[0.4em]">AUTH_SESSION::ACTIVE</span>
          </div>

          {/* RIGHT CENTER: Quick Actions */}
          <div className="fixed right-8 top-1/2 -translate-y-1/2 z-[80] flex flex-col gap-6 items-end">
            <AnimatePresence>
              {showInstallPrompt && (
                <motion.button
                  initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
                  onClick={handleInstallApp}
                  className="flex items-center gap-4 bg-white border border-black/10 p-4 rounded-none shadow-2xl group transition-all"
                >
                  <div className="w-10 h-10 bg-black text-white flex items-center justify-center text-lg">
                    <i className="fas fa-terminal"></i>
                  </div>
                  <div className="text-left pr-4">
                     <p className="text-[9px] font-black text-black/30 uppercase tracking-widest leading-none mb-1">SYNC_DEVICE</p>
                     <p className="text-[11px] font-black text-black uppercase tracking-widest">DEPLOY_ARCHIVE</p>
                  </div>
                </motion.button>
              )}

              {loveStats.points >= 100 && activeTab === 'home' && (
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={handleAddLeaf}
                  className="w-16 h-16 bg-black text-white flex items-center justify-center text-2xl shadow-2xl relative group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                  <span className="relative z-10 transition-transform group-hover:rotate-12">🌱</span>
                  <div className="absolute -top-10 right-0 bg-black text-white text-[8px] font-black px-2 py-1 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Initialize_Growth
                  </div>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* GARDEN GUIDE MODAL - ARCHIVAL DOCUMENT STYLE */}
          <AnimatePresence>
            {isStatsGuideOpen && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-6"
                onClick={() => setIsStatsGuideOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="bg-white w-full max-w-2xl border border-black/10 shadow-[0_50px_100px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-10 md:p-14 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-12 border-b border-black/5 pb-10">
                       <div className="flex items-center gap-8">
                          <div className="w-20 h-20 bg-black flex items-center justify-center text-3xl font-black text-white">
                            {loveStats.level}
                          </div>
                          <div>
                             <h3 className="text-[9px] font-black text-black/30 uppercase tracking-[0.5em] mb-2">SYSTEM_DOCUMENTATION</h3>
                             <h4 className="text-4xl font-black text-black tracking-extratight uppercase leading-none">GARDEN_MANIFEST</h4>
                          </div>
                       </div>
                       <button onClick={() => setIsStatsGuideOpen(false)} className="w-14 h-14 border border-black/5 hover:bg-black hover:text-white transition-all flex items-center justify-center">
                          <i className="fas fa-times"></i>
                       </button>
                    </div>

                    <div className="space-y-12">
                       <div className="grid grid-cols-2 gap-10">
                          <div className="space-y-2">
                             <span className="text-[8px] font-black text-black/20 uppercase tracking-[0.4em]">EXP_BUFFER</span>
                             <div className="text-4xl font-black text-black flex items-baseline gap-2">
                                {loveStats.xp} <span className="text-xs text-black/30">/ {loveStats.level * 100}</span>
                             </div>
                             <div className="h-[2px] w-full bg-black/5 overflow-hidden">
                                <motion.div className="h-full bg-black" animate={{ width: `${(loveStats.xp / (loveStats.level * 100)) * 100}%` }} />
                             </div>
                          </div>
                          <div className="space-y-2 text-right">
                             <span className="text-[8px] font-black text-black/20 uppercase tracking-[0.4em]">SYSTEM_VERSION</span>
                             <div className="text-4xl font-black text-black">V_{loveStats.level}.0.ARCH</div>
                          </div>
                       </div>

                       <div className="grid grid-cols-3 gap-6">
                          {[
                            { label: 'BLOOMS', val: flowerCount, icon: '🌸' },
                            { label: 'ARTIFACTS', val: loveStats.leaves, icon: '🍃' },
                            { label: 'UNITS', val: loveStats.points, icon: '🪙' }
                          ].map(stat => (
                            <div key={stat.label} className="border border-black/5 p-6 space-y-3">
                               <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-black text-black/30 uppercase tracking-widest">{stat.label}</span>
                                  <span className="text-xl grayscale opacity-40">{stat.icon}</span>
                               </div>
                               <p className="text-3xl font-black text-black">{stat.val?.toLocaleString()}</p>
                            </div>
                          ))}
                       </div>

                       <div className="space-y-6 pt-10 border-t border-black/5">
                          <p className="text-[9px] font-black text-black uppercase tracking-[0.5em] mb-6">OPERATIONAL_GUIDELINES</p>
                          <div className="space-y-6">
                             {[
                               { h: 'AUTOMATED_BLOOMS', d: `System automatically initializes a new bloom every ${appConfig.daysPerFlower} cycles.` },
                               { h: 'MANUAL_GROWTH', d: 'Allocate 100 units to manually initialize a new artifact growth sequence.' },
                               { h: 'DATA_ACQUISITION', d: 'Sharing memories, logs, or records generates system XP and units.' }
                             ].map(item => (
                               <div key={item.h} className="group flex gap-6 items-start">
                                  <div className="w-1.5 h-1.5 bg-black mt-1.5" />
                                  <div>
                                     <h5 className="text-[10px] font-black text-black uppercase tracking-widest mb-1">{item.h}</h5>
                                     <p className="text-[12px] text-black/40 font-black uppercase tracking-[0.1em] leading-relaxed">{item.d}</p>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="mt-20 pt-10 border-t border-black/5 flex justify-between items-center text-[8px] font-black text-black/20 uppercase tracking-[0.4em]">
                        <span>REF_ID::GARDEN_{new Date().getTime().toString(16).toUpperCase()}</span>
                        <span>NEXT_BLOOM_EST::IN_{appConfig.daysPerFlower - (daysTogether % appConfig.daysPerFlower)}_CYCLES</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <LoveLetter 
            isOpen={isLetterOpen} onClose={() => setIsLetterOpen(false)} 
            messages={loveLetters} onSendMessage={handleSendMessage} onUpdateMessage={handleUpdateMessage}
            partners={appConfig.partners} folders={appConfig.mailFolders}
          />

          <EditDrawer 
            isOpen={isEditDrawerOpen} onClose={() => setIsEditDrawerOpen(false)} 
            config={appConfig} setConfig={handleSetAppConfig} 
            onSave={() => showToast("SYNC_COMPLETE :: CONFIG_SAVED")}
          />

          <TimelineSpreadsheet 
            isOpen={isSpreadsheetOpen} onClose={() => setIsSpreadsheetOpen(false)}
            interactions={appConfig.timeline} onSave={handleMassTimelineUpdate} onDelete={handleDeleteTimeline}
          />

          <UserProfileModal 
            isOpen={isUserProfileModalOpen} onClose={() => setIsUserProfileModalOpen(false)} 
          />

          <Toast 
            message={toast.message} isVisible={toast.isVisible} 
            onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
          />

          <SimplePlayer 
            playlist={appConfig.musicPlaylist || ["https://www.youtube.com/watch?v=igx8-BdblEI"]} 
            volume={musicVolume} setVolume={setMusicVolume}
            playing={isMusicPlaying} setPlaying={setIsMusicPlaying}
            muted={isMusicMuted} setMuted={setIsMusicMuted}
          />
        </motion.div>
      )}
    </div>
  );
};

export default Home;
