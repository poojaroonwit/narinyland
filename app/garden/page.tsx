"use client";

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Interaction, Emotion, LoveLetterMessage, LoveStats, MemoryItem, AppConfig } from '../../types';
import { configAPI, lettersAPI, timelineAPI, memoriesAPI, statsAPI, circlesAPI } from '../../services/api';
import { useAuth } from '../../components/AuthProvider';
import { getErrorMessage } from '../../lib/errors';
import { GardenAcceptedContent } from './_components/GardenAcceptedContent';
import { GardenGlobalModals } from './_components/GardenGlobalModals';
import { GardenPageProvider } from './_components/context';
import { GardenStatusOverlays } from './_components/GardenStatusOverlays';
import { GardenTopControls } from './_components/GardenTopControls';
import { GardenWorldStage } from './_components/GardenWorldStage';
import { useGardenActions } from './_components/useGardenActions';

const INITIAL_MEMORIES: MemoryItem[] = [];
const INITIAL_TIMELINE: Interaction[] = [];
const INITIAL_COUPONS: AppConfig['coupons'] = [];

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
};

type CircleMemberProfile = {
  id?: string;
  userId?: string;
  name?: string;
  avatar?: string;
  role?: string;
};

const Home: React.FC = () => {
  const { user, logout, loading: authLoading, circles, activeCircleId, setActiveCircle } = useAuth();
  const [hasAcceptedProposal, setHasAcceptedProposal] = useState(false);
  const [isLetterOpen, setIsLetterOpen] = useState(false); 
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [isStatsGuideOpen, setIsStatsGuideOpen] = useState(false);
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  const [isMusicMuted, setIsMusicMuted] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
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

  const [circleMembers, setCircleMembers] = useState<CircleMemberProfile[]>([]);

  // Compute activePartners from circle members with placeholder support
  const activePartners = useMemo(() => {
    const members = circleMembers || [];
    const p1 = members[0];
    const p2 = members[1];

    return {
      partner1: {
        name: p1?.name || (user?.name ? user.name : 'Partner 1'),
        avatar: p1?.avatar || user?.picture || '❤️'
      },
      partner2: {
        name: p2?.name || 'Waiting for Partner...',
        avatar: p2?.avatar || '💖'
      }
    };
  }, [circleMembers, user]);

  const [galleryViewMode, setGalleryViewMode] = useState<'all' | 'public' | 'private'>('all');
  const [activeTab, setActiveTab] = useState<'home' | 'timeline' | 'coupons' | 'letters' | 'shop'>('home'); // Add activeTab state
  const [worldMode, setWorldMode] = useState<'tree' | 'globe'>('tree');
  const [isLandDropdownOpen, setIsLandDropdownOpen] = useState(false);
  const [isCircleDropdownOpen, setIsCircleDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [selectedFlagItem, setSelectedFlagItem] = useState<Interaction | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  const closeFloatingPanels = (except?: 'volume' | 'circle' | 'land' | 'user') => {
    if (except !== 'volume') setIsVolumeModalOpen(false);
    if (except !== 'circle') setIsCircleDropdownOpen(false);
    if (except !== 'land') setIsLandDropdownOpen(false);
    if (except !== 'user') setIsUserDropdownOpen(false);
  };

  const toggleVolumePanel = () => {
    setIsVolumeModalOpen(prev => {
      const next = !prev;
      if (next) closeFloatingPanels('volume');
      return next;
    });
  };

  const toggleCircleDropdown = () => {
    setIsCircleDropdownOpen(prev => {
      const next = !prev;
      if (next) closeFloatingPanels('circle');
      return next;
    });
  };

  const toggleLandDropdown = () => {
    setIsLandDropdownOpen(prev => {
      const next = !prev;
      if (next) closeFloatingPanels('land');
      return next;
    });
  };

  const switchTab = (tab: 'home' | 'timeline' | 'coupons' | 'letters' | 'shop') => {
    closeFloatingPanels();
    setActiveTab(tab);
  };
  // ─── Load config & data from database on mount ─────────────────────────────
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    // PWA Install Prompt Logic
    const handleBeforeInstallPrompt = (e: Event) => {
      const promptEvent = e as BeforeInstallPromptEvent;
      e.preventDefault();
      setDeferredPrompt(promptEvent);
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

  const handleSelectLand = (landId: string) => {
    setAppConfig(prev => ({
      ...prev,
      lands: prev.lands?.map(l => ({
        ...l,
        isActive: l.id === landId
      }))
    }));
    setIsLandDropdownOpen(false);
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
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
          stats,
          membersData
        ] = await Promise.all([
          configAPI.get(),
          lettersAPI.list().catch(() => []),
          timelineAPI.list().catch(() => []), 
          memoriesAPI.list().catch(() => []),
          statsAPI.get().catch(() => ({ xp: 0, level: 1, leaves: 0, points: 0 })),
          activeCircleId ? circlesAPI.listMembers(activeCircleId).catch(() => ({ members: [] })) : Promise.resolve({ members: [] })
        ]);

        if (membersData?.members) {
          setCircleMembers(membersData.members);
        }

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
          timestamp: new Date(l.timestamp),
          unlockDate: new Date(l.unlockDate),
          isRead: l.isRead,
          readAt: l.readAt ? new Date(l.readAt) : undefined,
          media: l.media
        })));

        // Set Proposal State
        if (serverConfig.proposal?.isAccepted) {
          setHasAcceptedProposal(true);
        }

        // Set Stats
        setLoveStats(stats);
        
        setConfigLoaded(true);
      } catch (err: unknown) {
        console.warn('⚠️ Could not load data from API, using defaults:', getErrorMessage(err));
        setConfigLoaded(true);
      }
    };

    fetchData();
  }, [activeCircleId]);

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
        .catch((err: unknown) => console.error('❌ Failed to save config:', getErrorMessage(err)));
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

  const actionContext = { appConfig, setAppConfig, handleSetAppConfig, loveStats, setLoveStats, activePartners, setPetEmotion, setPetMessage, setLoveLetters, showToast, setHasAcceptedProposal };
  const { addXP, handleAddLeaf, handleProposalStepChange, handleProposalAccepted, handleRedeemCoupon, handleAddCoupon, handleDeleteCoupon, handleSendMessage, handleUpdateMessage, handleUpdateTimeline, handleAddTimeline, handleDeleteTimeline, handleMassTimelineUpdate } = useGardenActions(actionContext);

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

  const gardenContext = { user, logout, authLoading, circles, activeCircleId, setActiveCircle, hasAcceptedProposal, setHasAcceptedProposal, isLetterOpen, setIsLetterOpen, isEditDrawerOpen, setIsEditDrawerOpen, isSpreadsheetOpen, setIsSpreadsheetOpen, isStatsGuideOpen, setIsStatsGuideOpen, isVolumeModalOpen, setIsVolumeModalOpen, musicVolume, setMusicVolume, isMusicPlaying, setIsMusicPlaying, isMusicMuted, setIsMusicMuted, isMobile, deferredPrompt, setDeferredPrompt, isUserProfileModalOpen, setIsUserProfileModalOpen, showInstallPrompt, setShowInstallPrompt, toast, setToast, showToast, petEmotion, setPetEmotion, petMessage, setPetMessage, loveStats, setLoveStats, loveLetters, setLoveLetters, appConfig, setAppConfig, handleSetAppConfig, circleMembers, setCircleMembers, activePartners, galleryViewMode, setGalleryViewMode, activeTab, setActiveTab, worldMode, setWorldMode, isLandDropdownOpen, setIsLandDropdownOpen, isCircleDropdownOpen, setIsCircleDropdownOpen, isUserDropdownOpen, setIsUserDropdownOpen, selectedFlagItem, setSelectedFlagItem, isEditMode, setIsEditMode, configLoaded, setConfigLoaded, closeFloatingPanels, toggleVolumePanel, toggleCircleDropdown, toggleLandDropdown, switchTab, handleSelectLand, handleInstallApp, addXP, handleAddLeaf, handleProposalStepChange, handleProposalAccepted, handleRedeemCoupon, handleAddCoupon, handleDeleteCoupon, handleSendMessage, handleUpdateMessage, handleUpdateTimeline, handleAddTimeline, handleDeleteTimeline, handleMassTimelineUpdate, combinedInteractions, handleTimelineConfigUpdate, daysTogether, flowerCount };

  return (
    <GardenPageProvider value={gardenContext}>
      <div className="min-h-screen w-full flex flex-col items-center p-2 md:p-6 relative overflow-x-hidden">
        <GardenWorldStage />
        <GardenAcceptedContent />
        <GardenTopControls />
        <GardenStatusOverlays />
        <GardenGlobalModals />
      </div>
    </GardenPageProvider>
  );
};

export default Home;

