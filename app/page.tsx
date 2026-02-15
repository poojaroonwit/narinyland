"use client";

import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Timeline from '../components/Timeline';
import MemoryFrame from '../components/MemoryFrame';
import ProposalScreen from '../components/ProposalScreen';
import LoveCoupons from '../components/LoveCoupons';
import LoveLetter from '../components/LoveLetter';
import LoveTree from '../components/LoveTree';
import EditDrawer from '../components/EditDrawer';
import Logo from '../components/Logo';
import SimplePlayer from '../components/SimplePlayer';
import Toast from '../components/Toast';
import TimelineSpreadsheet from '../components/TimelineSpreadsheet';
import { Interaction, Emotion, LoveLetterMessage, LoveStats, MemoryItem, AppConfig } from '../types';
import { configAPI, lettersAPI, timelineAPI, memoriesAPI, statsAPI, couponsAPI } from '../services/api';

const INITIAL_MEMORIES: MemoryItem[] = [];

const INITIAL_TIMELINE: Interaction[] = [];

const INITIAL_COUPONS: any[] = [];

const Home: React.FC = () => {
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
  });

  const [galleryViewMode, setGalleryViewMode] = useState<'all' | 'public' | 'private'>('all');
  const [activeTab, setActiveTab] = useState<'home' | 'timeline' | 'coupons' | 'letters'>('home'); // Add activeTab state
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
      console.log('✅ PWA Install prompt deferred');
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
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
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

        console.log('✅ Data loaded from backend');

        // Transform Timeline Data
        const mappedTimeline = timelineData.map((t: any) => ({
           id: t.id,
           text: t.text,
           type: t.type,
           timestamp: new Date(t.timestamp),
           location: t.location, // Added location
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
          musicPlaylist: serverConfig.musicPlaylist || prev.musicPlaylist,
          proposal: serverConfig.proposal || prev.proposal,
          partners: serverConfig.partners || prev.partners,
          gallery: memories.length ? memories.map((m: any) => ({ url: m.url, privacy: m.privacy, caption: m.caption })) : prev.gallery,
          timeline: mappedTimeline.length ? mappedTimeline : prev.timeline,
          coupons: serverConfig.coupons?.length ? serverConfig.coupons : prev.coupons,
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
  }, []);

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
        musicPlaylist: next.musicPlaylist,
        proposal: next.proposal,
        isProposalAccepted: next.proposal.isAccepted,
        proposalProgress: next.proposal.progress,
        partners: next.partners,
        coupons: next.coupons,
        gallery: next.gallery,
      }).then(() => console.log('💾 Config saved to database'))
        .catch((err: any) => console.error('❌ Failed to save config:', err.message));
      return next;
    });
  };

  useEffect(() => {
    const isCompleted = !!appConfig.proposal?.isAccepted || 
                        ((appConfig.proposal?.progress || 0) >= (appConfig.proposal?.questions?.length || 0) && (appConfig.proposal?.questions?.length || 0) > 0);
    setHasAcceptedProposal(isCompleted);
  }, [appConfig.proposal?.isAccepted, appConfig.proposal?.progress, appConfig.proposal?.questions?.length]);

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
    console.log('💍 Proposal state saved');
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

  const handleTimelineConfigUpdate = (updates: { layoutMode?: 'vertical' | 'wave' | 'snake', zoomLevel?: number }) => {
    handleSetAppConfig(prev => ({
      ...prev,
      timelineLayoutMode: updates.layoutMode || prev.timelineLayoutMode,
      timelineZoomLevel: updates.zoomLevel !== undefined ? updates.zoomLevel : prev.timelineZoomLevel
    }));
  };

  const daysTogether = Math.max(0, Math.floor((new Date().getTime() - new Date(appConfig.anniversaryDate).getTime()) / (1000 * 60 * 60 * 24)));
  const flowerCount = Math.floor(daysTogether / appConfig.daysPerFlower);

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-2 md:p-6 relative overflow-x-hidden">
        {/* Fullscreen Background & Tree */}
        <div className="fixed inset-0 z-0">
           <LoveTree 
             anniversaryDate={appConfig.anniversaryDate} 
             treeStyle={appConfig.treeStyle} 
             petEmotion={petEmotion}
             petMessage={petMessage}
             level={loveStats.level}
             daysPerTree={appConfig.daysPerTree}
             daysPerFlower={appConfig.daysPerFlower}
             flowerType={appConfig.flowerType}
             mixedFlowers={appConfig.mixedFlowers}
             viewMode={appConfig.viewMode}
             leaves={loveStats.leaves}
             points={loveStats.points}
             skyMode={appConfig.skyMode}
             showQRCode={appConfig.showQRCode}
             petType={appConfig.petType}
             pets={appConfig.pets}
             graphicsQuality={appConfig.graphicsQuality}
             onAddLeaf={handleAddLeaf}
           />
        </div>

      
      <AnimatePresence>
        {configLoaded && !hasAcceptedProposal && (
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
                    style={appConfig.galleryStyle} 
                    source={appConfig.gallerySource}
                    username={appConfig.instagramUsername}
                    viewMode={galleryViewMode}
                    onViewModeChange={setGalleryViewMode}
                    variant="sky"
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
                    onOpenSettings={() => setIsEditDrawerOpen(true)}
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

          {/* Bottom Navigation Tab Bar */}
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-md border border-white/50 shadow-2xl rounded-full px-6 py-3 flex items-center gap-8 z-[70]">
             <button 
               onClick={() => setActiveTab('home')}
               className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'home' ? 'text-pink-500 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <i className="fas fa-home text-xl"></i>
               <span className="text-[10px] font-bold uppercase tracking-wide">Home</span>
             </button>

             <button 
               onClick={() => setActiveTab('timeline')}
               className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'timeline' ? 'text-blue-500 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <i className="fas fa-calendar-alt text-xl"></i>
               <span className="text-[10px] font-bold uppercase tracking-wide">Timeline</span>
             </button>

             <button 
               onClick={() => setActiveTab('coupons')}
               className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'coupons' ? 'text-purple-500 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <i className="fas fa-ticket-alt text-xl"></i>
               <span className="text-[10px] font-bold uppercase tracking-wide">Coupons</span>
             </button>

             <button 
               onClick={() => setActiveTab('letters')}
               className={`flex flex-col items-center gap-1 transition-all duration-300 relative ${activeTab === 'letters' ? 'text-rose-500 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <i className="fas fa-envelope text-xl"></i>
               <span className="text-[10px] font-bold uppercase tracking-wide">Letters</span>
               {loveLetters.filter(l => !l.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm animate-pulse">
                    {loveLetters.filter(l => !l.isRead).length}
                  </span>
               )}
             </button>
          </div>

        </motion.div>
      )}

      {hasAcceptedProposal && (
        <>
          {/* Fixed UI Overlays - Outside the scrollable content flow */}
          
          {/* Config & Garden Stats - Persistently Visible */}
          <div className="fixed top-4 right-4 md:right-6 flex items-center gap-2 md:gap-4 z-[60]">
             <button 
               onClick={() => setIsVolumeModalOpen(!isVolumeModalOpen)} 
               className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110 border backdrop-blur-md ${
                 isMusicMuted ? 'bg-gray-500/40 text-white border-gray-400/50' : 'bg-white/40 text-pink-500 border-white/50'
               }`}
             >
               <i className={`fas ${isMusicMuted ? 'fa-volume-mute' : 'fa-music'} text-xs`}></i>
             </button>
             <button onClick={() => setIsEditDrawerOpen(true)} className="w-10 h-10 bg-white/40 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-white transition-all transform hover:scale-110 border border-white/50"><i className="fas fa-cog text-sm"></i></button>
          </div>

          {/* Music Adjustment Modal */}
          <AnimatePresence>
            {isVolumeModalOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="fixed top-20 right-6 z-[70] bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-pink-100 flex flex-col items-center gap-4 w-12"
              >
                 <label className="text-[8px] font-black text-pink-500 uppercase tracking-tighter w-full text-center mb-2">VOL</label>
                 <div className="h-32 w-1.5 bg-gray-100 rounded-full relative overflow-hidden group">
                    <input 
                       type="range"
                       min="0"
                       max="1"
                       step="0.01"
                       value={isMusicMuted ? 0 : musicVolume}
                       onChange={(e) => {
                         setMusicVolume(parseFloat(e.target.value));
                         setIsMusicMuted(false);
                       }}
                       className="absolute inset-0 w-32 h-1.5 appearance-none bg-transparent cursor-pointer -rotate-90 origin-left translate-y-[128px] translate-x-[-1px] z-10"
                       style={{ width: '128px' }}
                    />
                    <div 
                       className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-pink-500 to-rose-400 transition-all duration-150"
                       style={{ height: `${(isMusicMuted ? 0 : musicVolume) * 100}%` }}
                    />
                 </div>
                 <button 
                   onClick={() => setIsMusicMuted(!isMusicMuted)}
                   className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isMusicMuted ? 'bg-gray-100 text-gray-400' : 'bg-pink-100 text-pink-500'}`}
                 >
                   <i className={`fas ${isMusicMuted ? 'fa-volume-mute' : 'fa-volume-up'} text-[10px]`}></i>
                 </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CENTERED STATUS BAR - HOME ONLY */}
          {activeTab === 'home' && (
            <div 
              className="fixed top-24 md:top-8 left-1/2 transform -translate-x-1/2 z-[60] flex flex-col items-center pointer-events-auto cursor-pointer"
              onClick={() => setIsStatsGuideOpen(true)}
            >
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center gap-4 md:gap-16 pb-1.5 md:pb-2"
              >
                  {/* Together Stat */}
                  <div className="flex flex-col items-center">
                    <span className="text-[7px] md:text-[10px] font-black text-pink-500 uppercase tracking-widest drop-shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">Together</span>
                    <span className="text-sm md:text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center gap-1 md:gap-2">
                       <i className="fas fa-heart text-red-500 animate-pulse text-[10px] md:text-xl"></i> {daysTogether} <span className="text-[10px] md:text-sm font-bold opacity-80">Days</span>
                    </span>
                  </div>

                  <div className="w-px h-6 md:h-10 bg-white/20 hidden md:block"></div>

                  {/* Garden Stats */}
                  <div className="flex flex-col items-center">
                    <span className="text-[7px] md:text-[10px] font-black text-pink-500 uppercase tracking-widest drop-shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">Garden</span>
                    <div className="flex items-center gap-2 md:gap-8">
                       <div className="flex flex-col items-center">
                          <span className="text-xs md:text-2xl font-bold text-white drop-shadow-[0_2px_4_rgba(0,0,0,0.3)] flex items-center gap-1 md:gap-1.5"><span className="text-sm md:text-2xl">🌸</span> {flowerCount}</span>
                          <span className="text-[6px] md:text-[8px] font-black text-white/50 uppercase tracking-tighter">Flowers</span>
                       </div>
                       <div className="flex flex-col items-center">
                          <span className="text-xs md:text-2xl font-bold text-white drop-shadow-[0_2px_4_rgba(0,0,0,0.3)] flex items-center gap-1 md:gap-1.5"><span className="text-sm md:text-2xl">🍃</span> {loveStats.leaves?.toLocaleString()}</span>
                          <span className="text-[6px] md:text-[8px] font-black text-white/50 uppercase tracking-tighter">Leaves</span>
                       </div>
                       <div className="flex flex-col items-center">
                          <span className="text-xs md:text-2xl font-black text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center gap-1 md:gap-1.5"><span className="text-[10px] md:text-base">⭐</span> {loveStats.level}</span>
                          <span className="text-[6px] md:text-[8px] font-black text-white/50 uppercase tracking-tighter">Level</span>
                       </div>
                       <div className="flex flex-col items-center">
                          <span className="text-xs md:text-2xl font-bold text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center gap-1 md:gap-1.5"><span className="text-[10px] md:text-base">🪙</span> {loveStats.points?.toLocaleString()}</span>
                          <span className="text-[6px] md:text-[8px] font-black text-white/50 uppercase tracking-tighter">Points</span>
                       </div>
                    </div>
                  </div>
              </motion.div>

              {/* Minimal XP Bar Underneath */}
              <div className="w-24 md:w-96 h-0.5 md:h-1 bg-white/10 rounded-full overflow-hidden mt-0.5 md:mt-1 border border-white/5 isolate relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (loveStats.xp / (loveStats.level * 100)) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-pink-500 via-rose-400 to-yellow-400 shadow-[0_0_8px_rgba(244,114,182,0.5)]"
                  />
                  

              </div>
            </div>
          )}

          {/* Logo - Fixed Top Left on Desktop, Centered on Mobile */}
          <div className="fixed top-4 md:top-6 left-1/2 md:left-6 transform -translate-x-1/2 md:translate-x-0 z-50">
            <Logo 
              size={isMobile ? 80 : 120} 
              title={appConfig.appName} 
              className="" 
            />
          </div>

            {/* PWA Install Button & Grow Leaf Button */}
            <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4 items-end">
              {/* PWA Install Notification */}
              <AnimatePresence>
                {showInstallPrompt && (
                  <motion.button
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 50, opacity: 0 }}
                    onClick={handleInstallApp}
                    className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border-2 border-pink-100 group hover:border-pink-300 transition-all"
                  >
                    <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-110 transition-transform">
                      <i className="fas fa-mobile-alt"></i>
                    </div>
                    <div className="text-left">
                       <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest leading-none mb-1">Install App</p>
                       <p className="text-sm font-bold text-gray-700 leading-none">Add to Home</p>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Grow Leaf Button (Visible only if points >= 100) */}
              <AnimatePresence>
                {loveStats.points >= 100 && activeTab === 'home' && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0, x: 20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ scale: 0, opacity: 0, x: 20 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleAddLeaf}
                    className="group relative flex flex-col items-center"
                    title="Grow a new leaf (Costs 100 points)"
                  >
                    <div className="absolute -top-12 right-0 bg-black/80 text-white text-[10px] font-black px-3 py-1.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity animate-bounce">
                       GROW LEAF! 🌱 -100 🪙
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full shadow-[0_20px_50px_rgba(16,185,129,0.4)] flex items-center justify-center text-3xl relative overflow-hidden group">
                       <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <motion.span 
                         animate={{ rotate: [0, 10, -10, 0] }}
                         transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                       >
                         🍃
                       </motion.span>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>

           </div>

          {/* STATS GUIDE MODAL/DRAWER */}
          <AnimatePresence>
            {isStatsGuideOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6"
                onClick={() => setIsStatsGuideOpen(false)}
              >
                <motion.div
                  initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 }}
                  animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
                  exit={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className={`bg-white w-full max-w-2xl overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.3)] flex flex-col ${
                    isMobile ? 'rounded-t-[3rem] max-h-[90vh]' : 'rounded-[3rem] max-h-[85vh]'
                  }`}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Handle for mobile */}
                  {isMobile && (
                    <div className="flex justify-center pt-4 pb-2 shrink-0">
                      <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                    </div>
                  )}

                  <div className="overflow-y-auto custom-scrollbar p-6 md:p-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                       <div className="flex items-center gap-5">
                          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-xl border-4 border-white rotate-3">
                            {loveStats.level}
                          </div>
                          <div>
                             <h3 className="font-pacifico text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-600">Garden Guide</h3>
                             <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.2em]">World Status & Progress</p>
                          </div>
                       </div>
                       <button onClick={() => setIsStatsGuideOpen(false)} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all">
                          <i className="fas fa-times text-xl"></i>
                       </button>
                    </div>

                    {/* XP Progress */}
                    <div className="bg-pink-50/30 rounded-[2rem] p-6 md:p-8 border border-pink-100 mb-8 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12 transition-transform group-hover:scale-[1.7]">
                           <i className="fas fa-chart-line text-pink-500 text-6xl"></i>
                        </div>
                        <div className="flex justify-between items-end mb-4 relative z-10">
                           <div>
                              <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest block mb-1">Experience Points</span>
                              <div className="flex items-baseline gap-2">
                                 <span className="text-4xl font-black text-gray-800">{loveStats.xp}</span>
                                 <span className="text-sm font-bold text-gray-400">/ {loveStats.level * 100} XP</span>
                              </div>
                           </div>
                           <div className="text-right">
                              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">World Level</span>
                              <span className="text-xl font-black text-amber-600">Level {loveStats.level}</span>
                           </div>
                        </div>
                        <div className="w-full h-4 bg-white/50 rounded-full overflow-hidden border border-pink-100 relative shadow-inner p-1">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (loveStats.xp / (loveStats.level * 100)) * 100)}%` }}
                              className="h-full bg-gradient-to-r from-pink-400 via-rose-500 to-yellow-400 rounded-full relative"
                            >
                               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 md:gap-6 mb-10">
                       <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-[2rem] border border-pink-100/50 flex flex-col items-center text-center gap-2 hover:shadow-lg transition-all group">
                          <span className="text-4xl group-hover:scale-125 transition-transform">🌸</span>
                          <span className="font-black text-gray-800 text-2xl drop-shadow-sm">{flowerCount}</span>
                          <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Flowers Bloomed</span>
                       </div>
                       <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-[2rem] border border-green-100/50 flex flex-col items-center text-center gap-2 hover:shadow-lg transition-all group">
                          <span className="text-4xl group-hover:scale-125 transition-transform">🍃</span>
                          <span className="font-black text-gray-800 text-2xl drop-shadow-sm">{loveStats.leaves?.toLocaleString()}</span>
                          <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Leaves Grown</span>
                       </div>
                    </div>

                    {/* Guide Section */}
                    <div className="space-y-6">
                       <h4 className="font-pacifico text-2xl text-gray-800 border-b border-gray-100 pb-4">How to grow our garden?</h4>
                       
                       <div className="space-y-4">
                          <div className="flex gap-4 items-start bg-gray-50/50 p-4 rounded-3xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                             <div className="w-12 h-12 shrink-0 bg-pink-100 rounded-2xl flex items-center justify-center text-2xl">🌸</div>
                             <div>
                                <h5 className="font-black text-gray-800 text-sm">Automated Blooms</h5>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed">A new flower blooms every <span className="text-pink-500 font-black">{appConfig.daysPerFlower} days</span> automatically to celebrate our journey together.</p>
                             </div>
                          </div>

                          <div className="flex gap-4 items-start bg-gray-50/50 p-4 rounded-3xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                             <div className="w-12 h-12 shrink-0 bg-green-100 rounded-2xl flex items-center justify-center text-2xl">🍃</div>
                             <div>
                                <h5 className="font-black text-gray-800 text-sm">Manual Growth</h5>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed">You can manually grow a leaf by spending <span className="text-green-600 font-black">100 points</span>. Use the button on the right of the home screen!</p>
                             </div>
                          </div>

                          <div className="flex gap-4 items-start bg-gray-50/50 p-4 rounded-3xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                             <div className="w-12 h-12 shrink-0 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl">⭐</div>
                             <div>
                                <h5 className="font-black text-gray-800 text-sm">Earning Points & XP</h5>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed">Every milestone, memory, or letter shared adds <span className="text-purple-600 font-black">Points and XP</span> to our joint account.</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Footer Stats Info */}
                    <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                           <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Relationship Length: {daysTogether} Days</span>
                        </div>
                        <div className="flex items-center gap-2 bg-pink-50/50 px-4 py-2 rounded-full border border-pink-100">
                           <i className="fas fa-clock text-pink-400 text-[10px]"></i>
                           <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest">Next Flower: {appConfig.daysPerFlower - (daysTogether % appConfig.daysPerFlower)} Days</span>
                        </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <LoveLetter 
            isOpen={isLetterOpen} 
            onClose={() => setIsLetterOpen(false)} 
            messages={loveLetters}
            onSendMessage={handleSendMessage}
            onUpdateMessage={handleUpdateMessage}
            partners={appConfig.partners}
            folders={appConfig.mailFolders}
          />

          <EditDrawer 
            isOpen={isEditDrawerOpen} 
            onClose={() => setIsEditDrawerOpen(false)} 
            config={appConfig} 
            setConfig={handleSetAppConfig} 
            onSave={() => showToast("Settings saved successfully! ✨")}
          />
          <Toast 
            message={toast.message} 
            isVisible={toast.isVisible} 
            onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
          />
          <SimplePlayer 
            playlist={appConfig.musicPlaylist || ["https://www.youtube.com/watch?v=igx8-BdblEI"]} 
            volume={musicVolume}
            setVolume={setMusicVolume}
            playing={isMusicPlaying}
            setPlaying={setIsMusicPlaying}
            muted={isMusicMuted}
            setMuted={setIsMusicMuted}
          />
          
          <TimelineSpreadsheet 
            isOpen={isSpreadsheetOpen}
            onClose={() => setIsSpreadsheetOpen(false)}
            interactions={appConfig.timeline}
            onSave={handleMassTimelineUpdate}
            onDelete={handleDeleteTimeline}
          />
        </>
      )}
    </div>
  );
};

export default Home;
