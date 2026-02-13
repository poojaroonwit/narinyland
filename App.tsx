
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Timeline from './components/Timeline';
import MemoryFrame from './components/MemoryFrame';
import ProposalScreen from './components/ProposalScreen';
import LoveCoupons from './components/LoveCoupons';
import LoveLetter from './components/LoveLetter';
import LoveTree from './components/LoveTree';
import EditDrawer from './components/EditDrawer';
import Logo from './components/Logo';
import MusicPlayer from './components/MusicPlayer';
import TimelineSpreadsheet from './components/TimelineSpreadsheet';
import { Interaction, Emotion, LoveLetterMessage, LoveStats, MemoryItem } from './types';
import { configAPI, lettersAPI, timelineAPI, memoriesAPI, statsAPI, couponsAPI } from './services/api';

const INITIAL_MEMORIES: MemoryItem[] = [];

const INITIAL_TIMELINE: Interaction[] = [];

const INITIAL_COUPONS: any[] = [];

const App: React.FC = () => {
  const [hasAcceptedProposal, setHasAcceptedProposal] = useState(false);
  const [isLetterOpen, setIsLetterOpen] = useState(false); 
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  
  const [petEmotion, setPetEmotion] = useState<Emotion>('neutral');
  const [petMessage, setPetMessage] = useState("Hello! Welcome back to our world! 🐾");
  const [loveStats, setLoveStats] = useState<LoveStats & { leaves: number; points: number }>({ 
    xp: 0, 
    level: 1, 
    questsCompleted: 0,
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

  const [appConfig, setAppConfig] = useState({
    appName: "Our Story",
    anniversaryDate: new Date().toISOString(),
    treeStyle: "oak",
    viewMode: "3d" as "2d" | "3d",
    galleryStyle: "carousel",
    gallerySource: "manual" as "manual" | "instagram",
    instagramUsername: "",
    daysPerTree: 100,
    daysPerFlower: 7,
    flowerType: 'cherry',
    mixedFlowers: ['sunflower', 'tulip', 'rose', 'cherry', 'lavender', 'heart'],
    timelineDefaultRows: 5,
    skyMode: "follow_timezone",
    musicUrl: "",
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
  const [configLoaded, setConfigLoaded] = useState(false);

  // ─── Load config & data from database on mount ─────────────────────────────
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
          statsAPI.get().catch(() => ({ xp: 0, level: 1, questsCompleted: 0, leaves: 0, points: 0 }))
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
          timelineDefaultRows: serverConfig.timelineDefaultRows ?? prev.timelineDefaultRows,
          musicUrl: serverConfig.musicUrl || prev.musicUrl,
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
          timestamp: new Date(l.createdAt),
          unlockDate: new Date(l.unlockDate),
          isRead: l.isRead,
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
        timelineDefaultRows: next.timelineDefaultRows,
        musicUrl: next.musicUrl,
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
        questsCompleted: res.questsCompleted,
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

    try {
      const res = await statsAPI.addLeaf();
      if (res.success) {
         setLoveStats(prev => ({
           ...prev,
           leaves: res.leaves,
           points: res.points,
           xp: res.xp,
           level: res.level,
           questsCompleted: prev.questsCompleted
         }));

         if (res.leveledUp) {
            setPetEmotion('excited');
            setPetMessage(`Level Up! Our garden is growing! Level ${res.level} 🌟`);
         } else {
            setPetEmotion('happy');
            setPetMessage("A new memory planted! 🌱");
            setTimeout(() => setPetEmotion('neutral'), 3000);
         }
      }
    } catch (e) {
      console.error("Failed to add leaf:", e);
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



  const daysTogether = Math.max(0, Math.floor((new Date().getTime() - new Date(appConfig.anniversaryDate).getTime()) / (1000 * 60 * 60 * 24)));
  const flowerCount = Math.floor(daysTogether / appConfig.daysPerFlower);

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-6 relative overflow-x-hidden">
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
             onAddLeaf={handleAddLeaf}
           />
        </div>

        {/* Floating Add Leaf Button */}
        <div className="fixed bottom-24 right-4 z-50 flex flex-col items-center gap-2 group pointer-events-auto">
             <span className={`text-xs font-black uppercase tracking-widest bg-black/50 text-white px-2 py-1 rounded backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap`}>
                {loveStats.points >= 100 ? "Grow a leaf (-100 pts)" : "Need 100 points"}
             </span>
             <button 
               onClick={handleAddLeaf}
               disabled={loveStats.points < 100}
               className={`
                 w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-xl border-4 border-white transition-all transform hover:scale-110 active:scale-95
                 ${loveStats.points >= 100 ? 'bg-gradient-to-br from-green-400 to-green-600 text-white cursor-pointer animate-bounce-slight' : 'bg-gray-300 text-gray-400 cursor-not-allowed grayscale'}
               `}
             >
               🌱
             </button>
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-5xl flex flex-col items-center z-10">
          
          <div className="relative w-full mb-12 flex flex-col items-center justify-center">
             
             {/* Love Forest & Pet Container */}


             

          </div>


          
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
          
          <div className="h-[65vh]"></div>

          {/* Timeline Section */}
          <Timeline 
             interactions={appConfig.timeline} 
             anniversaryDate={appConfig.anniversaryDate} 
             defaultRows={appConfig.timelineDefaultRows}
             onUpdateInteraction={handleUpdateTimeline}
             onDeleteInteraction={handleDeleteTimeline}
             onAddInteraction={handleAddTimeline}
             onOpenSpreadsheet={() => setIsSpreadsheetOpen(true)}
          />
          
          <div className="h-24"></div>



          <LoveCoupons 
            coupons={appConfig.coupons} 
            partners={appConfig.partners} 
            onRedeem={handleRedeemCoupon}
          />

        </motion.div>
      )}

      {hasAcceptedProposal && (
        <>
          {/* Fixed UI Overlays - Outside the scrollable content flow */}
          
          {/* Config & Garden Stats - Top Left */}
          <div className="fixed top-28 left-6 flex flex-col gap-4 z-[60]">
            <button onClick={() => setIsEditDrawerOpen(true)} className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-white transition-all transform hover:scale-110 border-2 border-white"><i className="fas fa-cog text-sm"></i></button>
            
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/60 backdrop-blur-md p-4 rounded-3xl shadow-sm border-2 border-white/60 w-48 space-y-3"
            >
              <h4 className="text-[10px] font-black text-pink-500 uppercase tracking-[0.2em] border-b border-pink-100 pb-1">Garden Status</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500 font-bold">Relationship</span>
                  <span className="font-black text-gray-800">{daysTogether} Days</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500 font-bold">Flowers</span>
                    <span className="font-black text-pink-500">{flowerCount} 🌸</span>
                  </div>
                  <div className="text-[8px] font-black text-pink-300 uppercase leading-tight">
                    1 flower every {appConfig.daysPerFlower} days of love
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500 font-bold">Leaves</span>
                    <span className="font-black text-green-600">{loveStats.leaves} 🍃</span>
                  </div>
                  <div className="text-[8px] font-black text-green-300 uppercase leading-tight">
                    Grown from coupon points
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Logo - Fixed Top Left */}
          <div className="fixed top-6 left-6 z-50">
            <Logo size={80} title={appConfig.appName} className="" />
          </div>

          {/* Enhanced XP Progress Display - Fixed Top Right */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed top-6 right-6 w-full max-w-sm z-50"
          >
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-3 shadow-sm border-2 border-white/60 flex items-center gap-4 hover:shadow-md transition-shadow">
              {/* Level Badge */}
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-amber-400 rounded-full flex items-center justify-center shadow-md border-2 border-white shrink-0 relative group">
                <span className="font-pacifico text-white text-xl drop-shadow-sm pt-1">{loveStats.level}</span>
                <div className="absolute -top-1 -right-1 bg-pink-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide shadow-sm">Lvl</div>
                <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
              </div>
              
              {/* Progress Info */}
              <div className="flex-1 flex flex-col justify-center gap-1.5">
                  <div className="flex justify-between items-end text-pink-600">
                      <span className="text-[10px] font-black uppercase tracking-widest text-pink-400 flex flex-col gap-0.5">
                        <span className="opacity-70">Growth Status</span>
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                           <span className="flex items-center gap-1 bg-green-100/80 px-1.5 py-0.5 rounded-md text-green-700" title="Total Leaves">🍃 {loveStats.leaves}</span>
                           <span className="flex items-center gap-1 bg-yellow-100/80 px-1.5 py-0.5 rounded-md text-yellow-700 font-black" title="Total Combined Points">🪙 {loveStats.points}</span>
                           <span className="flex items-center gap-1 bg-pink-100/80 px-1.5 py-0.5 rounded-md text-pink-600" title={`${appConfig.partners.partner1.name}'s Points`}>{appConfig.partners.partner1.avatar} {loveStats.partnerPoints?.partner1 || 0}</span>
                           <span className="flex items-center gap-1 bg-blue-100/80 px-1.5 py-0.5 rounded-md text-blue-600" title={`${appConfig.partners.partner2.name}'s Points`}>{appConfig.partners.partner2.avatar} {loveStats.partnerPoints?.partner2 || 0}</span>
                        </div>
                      </span>
                     <span className="text-[10px] font-black opacity-60 bg-white/50 px-2 py-1 rounded-full">{loveStats.xp} / {loveStats.level * 100} XP</span>
                  </div>
                 <div className="w-full h-3 bg-pink-50 rounded-full overflow-hidden border border-pink-100 relative shadow-inner">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, #fbcfe8 5px, #fbcfe8 10px)' }}></div>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, loveStats.xp)}%` }}
                      transition={{ type: "spring", stiffness: 40, damping: 15 }}
                      className="h-full bg-gradient-to-r from-pink-400 via-rose-400 to-yellow-400 relative"
                    >
                      <div className="absolute top-0 right-0 bottom-0 w-2 bg-white/40 blur-[2px]"></div>
                    </motion.div>
                 </div>
              </div>
            </div>
          </motion.div>

          {/* Mailbox Button */}
          <motion.div className="fixed bottom-6 right-6 z-[60]" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <button onClick={() => setIsLetterOpen(true)} className="bg-white p-5 rounded-full shadow-2xl text-4xl border-2 border-pink-50 flex items-center justify-center hover:bg-pink-50 transition-colors">
              <span className="relative">
                💌
                {loveLetters.length > 0 && (
                   <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                     {loveLetters.length}
                   </span>
                )}
              </span>
            </button>
          </motion.div>



          <LoveLetter 
            isOpen={isLetterOpen} 
            onClose={() => setIsLetterOpen(false)} 
            messages={loveLetters}
            onSendMessage={handleSendMessage}
            partners={appConfig.partners}
          />

          <EditDrawer 
            isOpen={isEditDrawerOpen} 
            onClose={() => setIsEditDrawerOpen(false)} 
            config={appConfig} 
            setConfig={handleSetAppConfig} 
          />
          <MusicPlayer url={appConfig.musicUrl} />
          
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

export default App;
