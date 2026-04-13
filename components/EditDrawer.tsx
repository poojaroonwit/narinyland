"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Interaction, MemoryItem, AppConfig, Emotion } from '../types';
import { uploadAPI } from '../services/api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { SHOP_ITEMS, ShopItem } from './Shop';
import { useAuth } from './AuthProvider';

interface EditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  onSave?: () => void;
}

interface CircleMember {
  userId: string | null;
  name: string;
  avatar: string;
  role: string;
  partnerId: string | null;
}

const EditDrawer: React.FC<EditDrawerProps> = ({ isOpen, onClose, config, setConfig, onSave }) => {
  const { circles, activeCircleId, setActiveCircle } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'proposal' | 'gallery' | 'timeline' | 'coupons' | 'world' | 'objects'>('general');
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [objectCategoryFilter, setObjectCategoryFilter] = useState<'all' | 'pet' | 'deco' | 'bldg' | 'custom'>('all');
  
  // Local draft state so changes only apply when "Save" is clicked
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);

  // Instagram Fetch State
  const [igToken, setIgToken] = useState('');
  const [isFetchingIG, setIsFetchingIG] = useState(false);
  const [igProfileResult, setIgProfileResult] = useState<string | null>(null);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<number | null>(null); // index of item being uploaded
  const [previewItem, setPreviewItem] = useState<{ url: string; type: 'image' | 'video' | 'audio' } | null>(null);
  const [expandedCouponId, setExpandedCouponId] = useState<string | null>(null);

  // Fetch posts from a public Instagram profile (username-based, no token)
  const fetchInstagramProfile = async () => {
    const username = localConfig.instagramUsername?.trim();
    if (!username) return;

    setIsFetchingIG(true);
    setIgProfileResult(null);
    try {
      const res = await fetch(`/api/instagram/profile/${encodeURIComponent(username)}`);
      const data = await res.json();
      
      if (!res.ok) {
        setIgProfileResult(`❌ ${data.error || 'Failed to fetch profile'}`);
        return;
      }

      if (data.posts?.length === 0) {
        setIgProfileResult(`⚠️ No public posts found for @${username}`);
        return;
      }

      // Add the found posts to the gallery (avoid duplicates)
      const existingUrls = new Set(localConfig.gallery.map((g: any) => g.url));
      const newItems = data.posts
        .filter((p: any) => !existingUrls.has(p.thumbnail || p.url))
        .map((p: any) => ({ url: p.thumbnail || p.url, privacy: 'public' as const }));

      if (newItems.length === 0) {
        setIgProfileResult(`✅ All ${data.postCount} posts from @${username} are already in gallery`);
        return;
      }

      updateLocal(prev => ({
        ...prev,
        gallery: [...prev.gallery, ...newItems],
      }));

      setIgProfileResult(`✅ Added ${newItems.length} posts from @${data.displayName || username}`);
    } catch (err: any) {
      setIgProfileResult(`❌ ${err.message}`);
    } finally {
      setIsFetchingIG(false);
    }
  };

  // Fetch feed using Instagram API token (bulk import)
  const fetchInstagramFeed = async () => {
    if (!igToken.trim()) return;
    setIsFetchingIG(true);
    try {
      const res = await fetch(`https://graph.instagram.com/me/media?fields=id,media_url,permalink,caption,timestamp&access_token=${igToken}`);
      const data = await res.json();

      if (data.error) {
        alert(`Instagram API Error: ${data.error.message}`);
        return;
      }

      if (!data.data?.length) {
        alert('No media found in your Instagram feed.');
        return;
      }

      const existingUrls = new Set(localConfig.gallery.map((g: any) => g.url));
      const newItems = data.data
        .filter((m: any) => m.media_url && !existingUrls.has(m.permalink))
        .map((m: any) => ({
          url: m.permalink || m.media_url,
          privacy: 'public' as const,
        }));

      updateLocal(prev => ({
        ...prev,
        gallery: [...prev.gallery, ...newItems],
      }));

      alert(`Added ${newItems.length} photos from Instagram!`);
    } catch (err: any) {
      alert(`Failed to fetch: ${err.message}`);
    } finally {
      setIsFetchingIG(false);
    }
  };

  // Re-sync local state when drawer opens
  useEffect(() => {
    if (isOpen) {
      const cloned = JSON.parse(JSON.stringify(config));
      // Re-hydrate Date objects that were serialized to strings
      if (cloned.timeline) {
        cloned.timeline = cloned.timeline.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
      setLocalConfig(cloned);
      setHasChanges(false);
    }
  }, [isOpen, config]);

  // Fetch circle members whenever the drawer opens or the active circle changes
  useEffect(() => {
    if (!isOpen || !activeCircleId) return;
    setMembersLoading(true);
    fetch(`/api/circles/${activeCircleId}/members`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(data => setCircleMembers(Array.isArray(data) ? data : []))
      .catch(() => setCircleMembers([]))
      .finally(() => setMembersLoading(false));
  }, [isOpen, activeCircleId]);

  if (!isOpen) return null;

  const handleSave = () => {
    setConfig(localConfig);
    if (onSave) onSave();
    setHasChanges(false);
    onClose();
  };

  const updateLocal = (updater: (prev: AppConfig) => AppConfig) => {
    setLocalConfig(updater);
    setHasChanges(true);
  };

  const handleInputChange = (field: string, value: any, nested?: string) => {
    updateLocal(prev => {
      const next = { ...prev };
      if (nested) {
        (next as any)[field] = { ...(next as any)[field], [nested]: value };
      } else {
        (next as any)[field] = value;
      }
      return next;
    });
  };

  const handlePartnerChange = (partnerId: string, field: 'name' | 'avatar', value: string) => {
    updateLocal(prev => ({
      ...prev,
      partners: {
        ...prev.partners,
        [partnerId]: { ...prev.partners[partnerId], [field]: value }
      }
    }));
  };

  const handleGalleryUrlChange = (index: number, value: string) => {
    updateLocal(prev => {
      const newGallery = [...prev.gallery];
      newGallery[index] = { ...newGallery[index], url: value };
      return { ...prev, gallery: newGallery };
    });
  };

  const toggleGalleryPrivacy = (index: number) => {
    updateLocal(prev => {
      const newGallery = [...prev.gallery];
      newGallery[index] = { 
        ...newGallery[index], 
        privacy: newGallery[index].privacy === 'public' ? 'private' : 'public' 
      };
      return { ...prev, gallery: newGallery };
    });
  };

  const addGalleryImage = () => {
    updateLocal(prev => ({
      ...prev,
      gallery: [...prev.gallery, { url: "", privacy: 'public' }]
    }));
  };

  const removeGalleryImage = (index: number) => {
    updateLocal(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
  };

  const handleTimelineChange = (id: string, field: keyof Interaction, value: any) => {
    updateLocal(prev => ({
      ...prev,
      timeline: prev.timeline.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleFileUpload = async (index: number, file: File) => {
    try {
      setIsUploading(index);
      const result = await uploadAPI.upload(file, 'gallery');
      handleGalleryUrlChange(index, result.url);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(null);
    }
  };

  const handleMultiFileUpload = async (files: FileList | File[]) => {
    const filesArray = Array.from(files);
    setIsFetchingIG(true); // Reusing fetch state for upload indicator if needed, or just let it be
    try {
      const uploadPromises = filesArray.map(file => uploadAPI.upload(file, 'gallery'));
      const results = await Promise.all(uploadPromises);
      
      const newItems = results.map(res => ({
        url: res.url,
        privacy: 'public' as const
      }));

      updateLocal(prev => ({
        ...prev,
        gallery: [...prev.gallery, ...newItems]
      }));
    } catch (err: any) {
      alert(`Some uploads failed: ${err.message}`);
    } finally {
      setIsFetchingIG(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleMultiFileUpload(e.dataTransfer.files);
    }
  };

  const handleTimelineFileUpload = async (id: string, file: File) => {
    try {
      const type = file.type.startsWith('audio') ? 'audio' : file.type.startsWith('video') ? 'video' : 'image';
      const result = await uploadAPI.upload(file, 'timeline');
      updateLocal(prev => ({
        ...prev,
        timeline: prev.timeline.map(item => item.id === id ? { ...item, media: { type: type as any, url: result.url } } : item)
      }));
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    }
  };

  const handlePwaIconUpload = async (file: File) => {
    try {
      setIsUploading(999);
      const result = await uploadAPI.upload(file, 'pwa-icon');
      handleInputChange('pwaIconUrl', result.url);
    } catch (err: any) {
      alert(`Icon Upload failed: ${err.message}`);
    } finally {
      setIsUploading(null);
    }
  };

  const isAudio = (url: string) => /\.(mp3|wav|ogg|m4a)$/i.test(url) || url.includes('audio');
  const isVideo = (url: string) => /\.(mp4|webm|mov)$/i.test(url) || url.includes('video');

  const addTimelineEvent = () => {
    const newEvent: Interaction = {
      id: Date.now().toString(),
      text: "New milestone...",
      type: 'system',
      timestamp: new Date()
    };
    updateLocal(prev => ({
      ...prev,
      timeline: [newEvent, ...prev.timeline]
    }));
  };

  const addAlbum = async (name: string) => {
    if (!name.trim()) return;
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const newAlbum = await res.json();
        updateLocal(prev => ({
          ...prev,
          albums: [newAlbum, ...(prev.albums || [])]
        }));
      }
    } catch (err) {
      console.error("Failed to add album:", err);
    }
  };

  const deleteAlbum = async (id: string) => {
    if (!confirm("Are you sure you want to delete this album? Memories inside will remain but unlinked.")) return;
    try {
      const res = await fetch(`/api/albums/${id}`, { method: 'DELETE' });
      if (res.ok) {
        updateLocal(prev => ({
          ...prev,
          albums: (prev.albums || []).filter(a => a.id !== id),
          gallery: prev.gallery.map(g => g.albumId === id ? { ...g, albumId: null } : g)
        }));
      }
    } catch (err) {
      console.error("Failed to delete album:", err);
    }
  };

  const addLand = async (name: string) => {
    if (!name.trim()) return;
    try {
      const isFirst = !(localConfig.lands && localConfig.lands.length > 0);
      const res = await fetch('/api/lands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isActive: isFirst })
      });
      if (res.ok) {
        const newLand = await res.json();
        updateLocal(prev => ({
          ...prev,
          lands: [newLand, ...(prev.lands || [])].map(l => l.id === newLand.id ? l : { ...l, isActive: isFirst ? false : l.isActive })
        }));
      }
    } catch (err) {
      console.error("Failed to add land:", err);
    }
  };

  const deleteLand = async (id: string) => {
    if (!confirm("Are you sure you want to delete this world? All objects inside will be destroyed.")) return;
    try {
      const res = await fetch(`/api/lands/${id}`, { method: 'DELETE' });
      if (res.ok) {
        updateLocal(prev => ({
          ...prev,
          lands: (prev.lands || []).filter(l => l.id !== id)
        }));
      }
    } catch (err) {
      console.error("Failed to delete land:", err);
    }
  };

  const toggleLandActive = async (id: string) => {
    if (localConfig.lands?.find(l => l.id === id)?.isActive) return; // Already active
    try {
      const res = await fetch(`/api/lands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });
      if (res.ok) {
        updateLocal(prev => ({
          ...prev,
          lands: (prev.lands || []).map(l => ({ ...l, isActive: l.id === id }))
        }));
      }
    } catch (err) {
      console.error("Failed to update land active status:", err);
    }
  };

  const handleGalleryAlbumChange = (index: number, albumId: string | null) => {
    updateLocal(prev => {
      const newGallery = [...prev.gallery];
      newGallery[index] = { ...newGallery[index], albumId };
      return { ...prev, gallery: newGallery };
    });
  };

  const handleCouponChange = (id: string, field: string, value: any) => {
    updateLocal(prev => ({
      ...prev,
      coupons: prev.coupons.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const addCoupon = () => {
    const newCoupon = {
      id: Date.now().toString(),
      title: "New Coupon",
      emoji: "🎁",
      desc: "Valid for one free hug",
      color: "from-pink-100 to-rose-100",
      for: 'partner1',
      points: 0
    };
    updateLocal(prev => ({ ...prev, coupons: [...prev.coupons, newCoupon] }));
  };

  const handlePetChange = (id: string, field: string, value: any) => {
    updateLocal(prev => ({
      ...prev,
      pets: (prev.pets || []).map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const addPet = () => {
    const newPet = {
      id: Date.now().toString(),
      type: 'dog',
      name: 'New Friend'
    };
    updateLocal(prev => ({
      ...prev,
      pets: [...(prev.pets || []), newPet]
    }));
  };

  const removePet = (id: string) => {
    updateLocal(prev => ({
      ...prev,
      pets: (prev.pets || []).filter(p => p.id !== id)
    }));
  };

  const updateProposalQuestion = (index: number, value: string) => {
    updateLocal(prev => {
      const newQuestions = [...prev.proposal.questions];
      newQuestions[index] = value;
      return { ...prev, proposal: { ...prev.proposal, questions: newQuestions } };
    });
  };

  const setProposalProgress = (index: number) => {
    updateLocal(prev => ({
      ...prev,
      proposal: { ...prev.proposal, progress: index }
    }));
  };

  const addProposalQuestion = () => {
    updateLocal(prev => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        questions: [...prev.proposal.questions, "New Question?"]
      }
    }));
  };

  const removeProposalQuestion = (index: number) => {
    updateLocal(prev => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        questions: prev.proposal.questions.filter((_, i) => i !== index)
      }
    }));
  };

  // Helper to transform Instagram URLs for the preview
  const getPreviewUrl = (url: string) => {
    if (!url) return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='12'%3EPaste Link%3C/text%3E%3C/svg%3E";
    // If it's an Instagram post URL or CDN URL, proxy through our backend
    if (/instagram\.com\/(p|reel|tv)\//.test(url) || /(cdninstagram|fbcdn)/.test(url)) {
      return `/api/instagram/image?url=${encodeURIComponent(url)}`;
    }
    // If it's a relative API URL, convert to full URL
    if (url.startsWith('/api/')) {
      return `${window.location.origin}${url}`;
    }
    return url;
  };

  const TAB_ICONS: Record<string, string> = {
    general: 'fa-cog',
    proposal: 'fa-ring',
    gallery: 'fa-images',
    timeline: 'fa-calendar-alt',
    coupons: 'fa-ticket-alt',
    world: 'fa-globe',
    objects: 'fa-cube',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          onClick={onClose}
        >
            <motion.div
            initial={{ scale: 0.99, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.99, opacity: 0 }}
            transition={{ type: "spring", damping: 35, stiffness: 300 }}
            className="archive-glass w-full max-w-6xl h-[92vh] rounded-none shadow-[0_60px_120px_rgba(0,0,0,0.5)] flex overflow-hidden border border-black/5"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Vertical Tabs Sidebar - ARCHIVE DESIGN */}
            <div className="w-72 bg-black/5 border-r border-black/5 flex flex-col shrink-0">
              {/* Header */}
              <div className="p-10">
                <h2 className="text-3xl font-black text-black tracking-extratight flex items-center gap-3">
                  SYSTEM
                  {hasChanges && <span className="w-2 h-2 bg-black rounded-none animate-pulse" />}
                </h2>
                <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.4em] mt-3">ARCHIVE_ACCESSOR_V1</p>
              </div>
 
              {/* Tab Buttons */}
              <div className="flex-1 overflow-y-auto mt-4 px-4 space-y-1">
                {['general', 'proposal', 'gallery', 'timeline', 'coupons', 'world', 'objects'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`w-full text-left px-6 py-4 flex items-center gap-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative group ${
                      activeTab === tab 
                        ? 'text-black bg-black/5' 
                        : 'text-black/20 hover:text-black/50 hover:bg-black/[0.02]'
                    }`}
                  >
                    {activeTab === tab && (
                      <motion.div layoutId="tab-active" className="absolute left-0 w-1 h-6 bg-black" />
                    )}
                    <i className={`fas ${TAB_ICONS[tab] || 'fa-circle'} text-[10px] transition-all ${activeTab === tab ? 'scale-125' : 'opacity-40'}`}></i>
                    {tab}
                  </button>
                ))}
              </div>         
            
              {/* Save Button in Sidebar */}
              <div className="p-6 border-t border-black/5 bg-black/5">
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className={`pill-button w-full text-[10px] tracking-[0.2em] ${
                    hasChanges
                      ? 'pill-button-primary'
                      : 'bg-black/10 text-black/20 cursor-not-allowed'
                  }`}
                >
                  {hasChanges ? 'SAVE CONFIG' : 'CONFIG SAVED'}
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#F7F5F2]/40 backdrop-blur-md">
              {/* Top Bar with Close */}
              <div className="px-10 py-10 border-b border-black/5 flex justify-between items-center shrink-0">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-black tracking-extratight uppercase flex items-center gap-4">
                    <span className="opacity-10 text-4xl">/</span>
                    {activeTab}
                  </h3>
                  <p className="text-[9px] font-black text-black/20 uppercase tracking-[0.3em]">Protocol Integration Active</p>
                </div>
                <button 
                  onClick={onClose} 
                  className="w-12 h-12 bg-black border border-black/5 hover:bg-neutral-800 flex items-center justify-center transition-all group shadow-2xl"
                >
                  <i className="fas fa-times text-white text-xs"></i>
                </button>
              </div>


              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-8 pb-32">
        {activeTab === 'general' && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
             <div className="bg-white p-10 border border-black/5">
               <h3 className="text-sm font-black text-black mb-10 flex items-center gap-4 uppercase tracking-[0.3em]">
                 <span className="w-6 h-[1px] bg-black"></span> CORE_SETUP
               </h3>
               
               <div className="space-y-8">
                 {/* World Name */}
                 <div className="flex justify-between items-center gap-8 group">
                   <div className="flex flex-col">
                     <label className="text-[10px] font-black text-black/40 uppercase tracking-[0.2em]">DESIGNATION_ID</label>
                     <p className="text-[9px] text-black/10">Primary system identifier</p>
                   </div>
                   <input 
                     type="text" 
                     value={localConfig.appName} 
                     onChange={(e) => handleInputChange('appName', e.target.value)}
                     className="w-1/2 bg-black/[0.02] border-b border-black/5 p-4 text-xs font-black outline-none focus:bg-white focus:border-black transition-all text-right uppercase tracking-[0.1em]"
                   />
                 </div>

                 {/* Proposal Toggle */}
                 <div className="flex justify-between items-center gap-8 pt-2">
                   <div className="flex flex-col">
                     <label className="text-[10px] font-black text-black/40 uppercase tracking-[0.2em]">INIT_PROPOSAL_PROTOCOL</label>
                     <p className="text-[9px] text-black/10">Enable sequential authentication journey</p>
                   </div>
                   <button
                     onClick={() => handleInputChange('showProposal', !localConfig.showProposal)}
                     className={`w-14 h-6 transition-all relative ${localConfig.showProposal ? 'bg-black' : 'bg-black/10'}`}
                   >
                     <motion.div 
                       animate={{ x: localConfig.showProposal ? 36 : 4 }}
                       className="absolute top-1 w-4 h-4 bg-white shadow-sm rounded-none"
                     />
                   </button>
                 </div>

                 {/* Anniversary */}
                 <div className="flex justify-between items-center gap-6 pt-2">
                   <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Anniversary</label>
                   <div className="w-1/2 text-right">
                     <DatePicker
                       selected={new Date(localConfig.anniversaryDate || Date.now())}
                       onChange={(date: Date | null) => date && handleInputChange('anniversaryDate', date.toISOString())}
                       className="w-full bg-black/5 border-b-2 border-transparent rounded-none p-4 text-xs font-bold outline-none focus:border-black transition-all text-right uppercase tracking-[0.2em]"
                     />
                   </div>
                 </div>

                 {/* PWA / App Identity */}
                 <div className="bg-black/5 p-8 rounded-none border border-black/5 space-y-6">
                   <h4 className="text-[10px] font-black text-black opacity-40 uppercase tracking-[0.2em] flex items-center gap-3">
                     <i className="fas fa-mobile-alt"></i> APP_IDENTITY_PWA
                   </h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[8px] font-black text-black/30 uppercase mb-2 tracking-[0.1em]">App Name (Long)</label>
                        <input 
                          type="text" 
                          value={localConfig.pwaName || localConfig.appName || ''} 
                          onChange={(e) => handleInputChange('pwaName', e.target.value)}
                          className="w-full bg-white border border-black/5 rounded-none p-3 text-xs font-bold outline-none focus:border-black transition-all"
                          placeholder="Narinyland"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-black/30 uppercase mb-2 tracking-[0.1em]">Short Name</label>
                        <input 
                          type="text" 
                          value={localConfig.pwaShortName || ''} 
                          onChange={(e) => handleInputChange('pwaShortName', e.target.value)}
                          className="w-full bg-white border border-black/5 rounded-none p-3 text-xs font-bold outline-none focus:border-black transition-all"
                          placeholder="Nariny"
                        />
                      </div>
                   </div>

                   <div>
                      <label className="block text-[8px] font-black text-black/30 uppercase mb-2 tracking-[0.1em]">Description</label>
                      <input 
                        type="text" 
                        value={localConfig.pwaDescription || ''} 
                        onChange={(e) => handleInputChange('pwaDescription', e.target.value)}
                        className="w-full bg-white border border-black/5 rounded-none p-3 text-xs font-bold outline-none focus:border-black transition-all"
                        placeholder="Our magical world..."
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[8px] font-black text-black/30 uppercase mb-2 tracking-[0.1em]">Theme Color</label>
                        <div className="flex items-center gap-3 bg-white border border-black/5 rounded-none p-2 pl-4">
                           <input 
                             type="color" 
                             value={localConfig.pwaThemeColor || '#000000'} 
                             onChange={(e) => handleInputChange('pwaThemeColor', e.target.value)}
                             className="w-8 h-8 rounded-none border-none cursor-pointer"
                           />
                           <span className="text-[10px] font-mono text-black/40">{localConfig.pwaThemeColor || '#000000'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-black/30 uppercase mb-2 tracking-[0.1em]">Background Color</label>
                        <div className="flex items-center gap-3 bg-white border border-black/5 rounded-none p-2 pl-4">
                           <input 
                             type="color" 
                             value={localConfig.pwaBackgroundColor || '#ffffff'} 
                             onChange={(e) => handleInputChange('pwaBackgroundColor', e.target.value)}
                             className="w-8 h-8 rounded-none border-none cursor-pointer"
                           />
                           <span className="text-[10px] font-mono text-black/40">{localConfig.pwaBackgroundColor || '#ffffff'}</span>
                        </div>
                      </div>
                   </div>

                   <div>
                     <label className="block text-[8px] font-black text-black/30 uppercase mb-3 tracking-[0.1em]">App Icon (512x512)</label>
                     <div className="flex items-center gap-8">
                        <div className="w-24 h-24 bg-white border border-black/5 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                           {localConfig.pwaIconUrl ? (
                             <img src={localConfig.pwaIconUrl} alt="App Icon" className="w-full h-full object-cover grayscale" />
                           ) : (
                             <i className="fas fa-mobile-alt text-3xl opacity-5"></i>
                           )}
                        </div>
                        <label className="flex-1 cursor-pointer bg-black text-white px-8 py-4 font-black text-[10px] uppercase tracking-[0.4em] text-center hover:bg-neutral-800 transition-all shadow-md">
                           UPLOAD_ASSET
                           <input 
                             type="file" 
                             className="hidden" 
                             accept="image/*"
                             onChange={async (e) => {
                               const file = e.target.files?.[0];
                               if (file) {
                                 const url = await uploadAPI.upload(file);
                                 handleInputChange('pwaIconUrl', url);
                               }
                             }}
                           />
                        </label>
                     </div>
                   </div>
                 </div>

                 {/* Dynamic Pets Management */}
                 <div className="space-y-6">
                    <div className="flex justify-between items-center mb-6">
                      <label className="text-[10px] font-black text-black opacity-30 uppercase tracking-[0.2em] ml-1">Dynamic Pets Management</label>
                      <button 
                        onClick={addPet}
                        className="bg-black text-white text-[9px] font-black px-4 py-2 rounded-none uppercase tracking-[0.2em] hover:bg-black/80 transition-all shadow-lg active:scale-95"
                      >
                        + ADD PET
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Legacy Pet Toggle */}
                      {(!localConfig.pets || localConfig.pets.length === 0) && (
                        <div className="p-6 bg-black/5 rounded-none border border-black/5 flex items-center gap-6">
                           <div className="flex-1">
                              <label className="block text-[8px] font-black text-black/30 uppercase mb-2 tracking-[0.1em]">Primary Pet Type</label>
                              <select 
                                value={localConfig.petType || 'cat'} 
                                onChange={(e) => handleInputChange('petType', e.target.value)}
                                className="w-full bg-white border border-black/5 rounded-none p-3 text-xs font-bold outline-none focus:border-black transition-all appearance-none"
                              >
                                <option value="cat">CAT_PROTO.EXE</option>
                                <option value="dog">DOG_PROTO.EXE</option>
                                <option value="rabbit">RABBIT_PROTO.EXE</option>
                                <option value="panda">PANDA_PROTO.EXE</option>
                                <option value="fox">FOX_PROTO.EXE</option>
                              </select>
                           </div>
                           <p className="text-[9px] text-black/20 italic max-w-[140px] leading-relaxed">This is your legacy pet. Add more to go dynamic! ✨</p>
                        </div>
                      )}

                      {/* Multiple Pets Grid */}
                      {(localConfig.pets || []).map((pet, idx) => (
                        <motion.div 
                          key={pet.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-6 bg-black/5 rounded-none border border-black/5 flex items-center gap-4"
                        >
                          <div className="w-12 h-12 bg-white rounded-none flex items-center justify-center text-xl shadow-sm border border-black/5">
                            {pet.type === 'cat' && 'C'}
                            {pet.type === 'dog' && 'D'}
                            {pet.type === 'rabbit' && 'R'}
                            {pet.type === 'panda' && 'P'}
                            {pet.type === 'fox' && 'F'}
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-[7px] font-black text-black/30 uppercase mb-1.5 tracking-[0.1em]">Pet Name</label>
                                <input 
                                  type="text"
                                  value={pet.name || ''}
                                  onChange={(e) => handlePetChange(pet.id, 'name', e.target.value)}
                                  className="w-full bg-white border border-black/5 rounded-none p-2.5 text-[10px] font-bold outline-none focus:border-black transition-all"
                                  placeholder="Name..."
                                />
                             </div>
                             <div>
                                <label className="block text-[7px] font-black text-black/30 uppercase mb-1.5 tracking-[0.1em]">Animal Type</label>
                                <select 
                                  value={pet.type}
                                  onChange={(e) => handlePetChange(pet.id, 'type', e.target.value)}
                                  className="w-full bg-white border border-black/5 rounded-none p-2.5 text-[10px] font-bold outline-none appearance-none"
                                >
                                  <option value="cat">CAT</option>
                                  <option value="dog">DOG</option>
                                  <option value="rabbit">RABBIT</option>
                                  <option value="panda">PANDA</option>
                                  <option value="fox">FOX</option>
                                </select>
                             </div>
                          </div>
                          <button onClick={onClose} className="w-12 h-12 border border-black/5 hover:bg-black hover:text-white transition-all duration-400 rounded-sm flex items-center justify-center">
                            <i className="fas fa-trash text-black/20 group-hover:text-black"></i>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                 </div>

                 {/* Sky Time */}
                 <div className="pt-4 border-t border-black/5">
                    <label className="block text-[10px] font-black text-black/30 uppercase mb-3 tracking-[0.2em] ml-1">Sky Time Appearance</label>
                    <select 
                      value={localConfig.skyMode || 'follow_timezone'} 
                      onChange={(e) => handleInputChange('skyMode', e.target.value)}
                      className="w-full bg-black/5 border-b-2 border-transparent rounded-sm p-4 text-xs font-bold outline-none focus:border-black transition-all duration-400 appearance-none"
                    >
                      <option value="follow_timezone">LOCAL_SYNC.EXE</option>
                      <option value="noon">NOON_PHASE.EXE</option>
                      <option value="night">NIGHT_PHASE.EXE</option>
                    </select>
            </div>

            </div>
            </div>

            <div className="bg-white/60 p-8 rounded-2xl shadow-sm border border-black/5">
              <h3 className="text-sm font-black text-black mb-8 flex items-center gap-3 uppercase tracking-[0.2em]">
                <i className="fas fa-stream opacity-30"></i> TIMELINE DISPLAY
              </h3>
              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-black/30 uppercase mb-4 tracking-[0.2em] ml-1">Default Rows Shown</label>
                  <div className="flex items-center gap-6">
                    <input 
                      type="range" 
                      min="1" max="20" 
                      value={localConfig.timelineDefaultRows || 5} 
                      onChange={(e) => handleInputChange('timelineDefaultRows', parseInt(e.target.value))}
                      className="flex-1 accent-black"
                    />
                    <span className="text-2xl font-black text-black w-12 text-center">{localConfig.timelineDefaultRows || 5}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-black/5 flex items-center justify-between">
                   <div>
                      <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Show Coupons in Story</p>
                   </div>
                   <button 
                      onClick={() => handleInputChange('showCouponsOnTimeline', !localConfig.showCouponsOnTimeline)}
                      className={`w-12 h-6 rounded-sm p-1 transition-all duration-400 flex items-center ${localConfig.showCouponsOnTimeline ? 'bg-black justify-end' : 'bg-black/10 justify-start'}`}
                   >
                      <motion.div layout className="w-4 h-4 bg-white rounded-sm shadow-sm" />
                   </button>
                </div>
              </div>
            </div>

            <div className="bg-white/60 p-8 rounded-2xl shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-black flex items-center gap-3 uppercase tracking-[0.2em]">
                  <i className="fas fa-user-friends opacity-30"></i> THE COUPLE
                </h3>
                  <span className="text-[10px] text-black/30 font-black uppercase tracking-[0.2em]">
                  CIRCLE MEMBERS
                </span>
              </div>

              {membersLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-sm animate-spin" />
                  <span className="text-xs font-bold">Loading members…</span>
                </div>
              ) : circleMembers.length > 0 ? (
                <div className="space-y-2">
                  {circleMembers.map((member, idx) => {
                    const partnerData = member.partnerId ? localConfig.partners[member.partnerId] : null;
                    const displayName = partnerData?.name || member.name;
                    const displayAvatar = partnerData?.avatar || member.avatar || '👤';
                    return (
                       <div key={member.userId ?? idx} className="flex items-center gap-3 p-3 bg-white rounded-sm border border-black/5">
                         <div className="w-10 h-10 rounded-sm bg-black/5 flex items-center justify-center text-sm flex-shrink-0 border border-black/5 shadow-sm grayscale">
                           {displayAvatar.startsWith('http') ? (
                             // eslint-disable-next-line @next/next/no-img-element
                             <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                           ) : (
                             displayAvatar
                           )}
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-xs font-black text-black truncate uppercase tracking-tight">{displayName}</p>
                          <p className="text-[10px] text-black/30 font-semibold uppercase tracking-widest">
                            {member.role}
                            {member.partnerId && (
                              <span className="ml-2 text-black/50">· {member.partnerId}</span>
                            )}
                          </p>
                        </div>
                        {member.partnerId && (
                          <div className="flex flex-col gap-1 w-28 flex-shrink-0">
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => handlePartnerChange(member.partnerId!, 'name', e.target.value)}
                              className="w-full border-b border-black/5 rounded-sm px-2 py-1 text-[10px] font-black text-black focus:outline-none focus:border-black transition-all duration-400 uppercase"
                              placeholder="NAME..."
                            />
                            <input
                              type="text"
                              value={partnerData?.avatar || ''}
                              onChange={(e) => handlePartnerChange(member.partnerId!, 'avatar', e.target.value)}
                              className="w-full border-b border-black/5 rounded-sm px-2 py-1 text-sm text-center focus:outline-none focus:border-black transition-all duration-400 grayscale"
                              placeholder="👤"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2 opacity-30">👥</div>
                  <p className="text-xs text-gray-400 font-bold">No members found for this circle.</p>
                  <p className="text-[10px] text-gray-300 mt-1">Members appear here once they join the world.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}


        {activeTab === 'proposal' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="bg-white p-10 border border-black/5 rounded-2xl">
              <div className="flex justify-between items-end mb-12">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-black flex items-center gap-4 uppercase tracking-[0.3em]">
                    <span className="w-6 h-[1px] bg-black"></span> PROPOSAL_ENGINE
                  </h3>
                  <p className="text-[9px] font-black text-black/10 uppercase tracking-widest pl-10">Sequential Authentication Flow</p>
                </div>
                <button 
                  onClick={addProposalQuestion}
                  className="bg-black text-white text-[10px] font-black px-6 py-3 uppercase tracking-[0.3em] hover:bg-neutral-800 transition-all duration-400 shadow-xl rounded-sm"
                >
                  + ADD_STEP
                </button>
              </div>
 
              <div className="space-y-6">
                {localConfig.proposal.questions.map((q, idx) => (
                  <div key={idx} className="relative group p-8 bg-black/[0.02] border border-black/5 rounded-2xl">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em]">
                        STEP_{String(idx + 1).padStart(2, '0')}
                      </label>
                      {localConfig.proposal.questions.length > 1 && (
                        <button 
                          onClick={() => removeProposalQuestion(idx)}
                          className="w-10 h-10 flex items-center justify-center text-black/10 hover:text-black hover:bg-black/5 transition-all duration-400 rounded-sm"
                        >
                          <i className="fas fa-trash-alt text-[10px]"></i>
                        </button>
                      )}
                    </div>
                    <textarea 
                      value={q} 
                      onChange={(e) => updateProposalQuestion(idx, e.target.value)}
                      className="w-full bg-white border border-black/5 p-5 text-[11px] font-black outline-none focus:border-black transition-all duration-400 resize-none shadow-sm rounded-sm"
                      rows={2}
                      placeholder={`INPUT DATA STEP ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
 
            <div className="bg-white p-10 border border-black/5 rounded-2xl">
              <h3 className="text-sm font-black text-black mb-10 flex items-center gap-4 uppercase tracking-[0.3em]">
                 <span className="w-6 h-[1px] bg-black"></span> FLOW_STATUS
              </h3>
              
              <div className="space-y-10">
                <div className="p-8 bg-black/[0.02] border border-black/5 rounded-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-[10px] font-black text-black uppercase tracking-[0.2em]">SYNCHRONIZATION</p>
                      <p className="text-[10px] text-black/20 font-black uppercase tracking-[0.3em] mt-1">
                        {localConfig.proposal.progress || 0} / {localConfig.proposal.questions.length} STEPS_COMPLETE
                      </p>
                    </div>
                    <div className="flex gap-4">
                       <button 
                         onClick={() => setProposalProgress(0)}
                         className="px-6 py-3 border border-black/5 text-black/30 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black/5 transition-all duration-400 rounded-sm"
                       >
                         RESET_ALL
                       </button>
                       <button 
                         onClick={() => setProposalProgress(localConfig.proposal.questions.length)}
                         className="px-6 h-12 bg-black text-white hover:bg-zinc-800 transition-all duration-400 text-xs font-black uppercase tracking-widest rounded-sm"
                       >
                         BYPASS_ALL
                       </button>
                    </div>
                  </div>
                  
                  {/* Step Indicators */}
                  <div className="flex gap-1">
                    {localConfig.proposal.questions.map((_, i) => {
                      const isRead = (localConfig.proposal.progress || 0) > i;
                      return (
                        <button 
                          key={i}
                          onClick={() => setProposalProgress(isRead ? i : i + 1)}
                          className={`flex-1 h-2 transition-all duration-400 ${isRead ? 'bg-black' : 'bg-black/10'}`}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between p-10 bg-black text-white shadow-2xl rounded-2xl">
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">FINAL_RESOLUTION</p>
                    <p className="text-[10px] opacity-30 font-black uppercase tracking-[0.3em]">
                      {localConfig.proposal.isAccepted ? 'PROTOCOL_AUTHORIZED' : 'PENDING_AUTHORIZATION'}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      updateLocal(prev => ({
                        ...prev,
                        proposal: { ...prev.proposal, isAccepted: !prev.proposal.isAccepted }
                      }));
                    }}
                    className={`px-10 py-4 font-black text-[10px] uppercase tracking-[0.4em] transition-all duration-400 rounded-sm ${
                      localConfig.proposal.isAccepted 
                        ? 'bg-white/10 text-white hover:bg-white/20' 
                        : 'bg-white text-black hover:bg-neutral-200 shadow-xl'
                    }`}
                  >
                    {localConfig.proposal.isAccepted ? 'REVOKE_AUTH' : 'GRANT_AUTH'}
                  </button>
                </div>
              </div>

              <p className="text-[9px] text-black/20 mt-6 ml-1 italic font-geist">
                * The proposal screen skips "Read" questions. If progress is reset to 0, it starts from Question 1.
              </p>
            </div>

            
            <div className="p-6 bg-black text-white rounded-2xl border-2 border-dashed border-white/20 shadow-lg">
              <p className="text-xs font-black leading-relaxed flex items-center gap-3 uppercase tracking-[0.1em]">
                <i className="fas fa-magic opacity-50"></i>
                The user can only accept your proposal. Each "YES" leads to the next question until the final acceptance!
              </p>
            </div>

          </motion.div>
        )}

        {activeTab === 'gallery' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
             <div className="bg-white p-10 border border-black/5 rounded-2xl">
                <label className="block text-[10px] font-black text-black/30 uppercase mb-8 tracking-[0.4em] ml-1">INVENTORY_SOURCE</label>
                <div className="flex bg-black/[0.04] p-1.5 mb-8 rounded-sm">
                   <button 
                     onClick={() => handleInputChange('gallerySource', 'manual')}
                     className={`flex-1 py-4 text-[10px] font-black transition-all duration-400 uppercase tracking-[0.3em] rounded-sm ${localConfig.gallerySource === 'manual' ? 'bg-white shadow-xl text-black' : 'text-black/20 hover:text-black/40'}`}
                   >
                     LOCAL_STORAGE
                   </button>
                   <button 
                     onClick={() => handleInputChange('gallerySource', 'instagram')}
                     className={`flex-1 py-4 text-[10px] font-black transition-all duration-400 uppercase tracking-[0.3em] rounded-sm flex items-center justify-center gap-3 ${localConfig.gallerySource === 'instagram' ? 'bg-black text-white shadow-xl' : 'text-black/20 hover:text-black/40'}`}
                   >
                     <i className="fab fa-instagram text-[11px]"></i> INSTA
                   </button>
                </div>


                <AnimatePresence mode="wait">
                  {localConfig.gallerySource === 'instagram' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
                       <div className="p-4 bg-black/[0.02] border border-black/5 rounded-sm">
                          <p className="text-[11px] text-black font-black uppercase tracking-tight leading-relaxed">
                             <i className="fab fa-instagram mr-1"></i> <strong>INSTA_SOURCE:</strong> Paste valid URLs below for automated integration.
                          </p>
                       </div>

                       {/* Public Profile Fetch */}
                       <div className="p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl border-2 border-dashed border-violet-200">
                          <p className="text-[11px] text-violet-600 font-bold leading-relaxed mb-3">
                             <i className="fas fa-user-circle mr-1"></i> <strong>Import from Profile:</strong> Enter any public Instagram username to pull their recent posts.
                          </p>
                          <div className="flex gap-2">
                             <div className="flex-1 relative">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-300 text-xs font-bold">@</span>
                               <input 
                                 type="text" 
                                 placeholder="username"
                                 value={localConfig.instagramUsername || ''}
                                 onChange={(e) => handleInputChange('instagramUsername', e.target.value)}
                                 className="w-full bg-white border border-violet-100 rounded-xl p-3 pl-7 text-xs focus:ring-2 focus:ring-violet-300 outline-none"
                               />
                             </div>
                             <button 
                               onClick={fetchInstagramProfile}
                               disabled={isFetchingIG || !localConfig.instagramUsername?.trim()}
                               className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold px-5 rounded-xl text-xs disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-400"
                             >
                               {isFetchingIG ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-download mr-1"></i> Fetch</>}
                             </button>
                          </div>
                          {igProfileResult && (
                            <p className={`text-[10px] mt-2 font-bold ${igProfileResult.startsWith('✅') ? 'text-green-600' : igProfileResult.startsWith('⚠') ? 'text-amber-600' : 'text-red-500'}`}>
                              {igProfileResult}
                            </p>
                          )}
                       </div>

                       {/* Token-based Bulk Import */}
                       <div className="p-4 bg-black/[0.02] border border-black/5 rounded-sm">
                          <p className="text-[11px] text-black font-black uppercase tracking-tight leading-relaxed mb-3">
                             <i className="fas fa-key mr-1"></i> <strong>API_TOKEN_ACCESS:</strong> FEED_INGESTION_PROTOCOL
                          </p>
                          <div className="flex gap-2">
                             <input 
                               type="text" 
                               placeholder="ACCESS_TOKEN_ID (IGQV...)"
                               value={igToken}
                               onChange={(e) => setIgToken(e.target.value)}
                               className="flex-1 bg-white border border-black/5 rounded-sm p-3 text-[10px] font-black focus:border-black outline-none font-mono"
                             />
                             <button 
                               onClick={fetchInstagramFeed}
                               disabled={isFetchingIG}
                               className="bg-black text-white font-black px-6 rounded-sm text-[10px] uppercase tracking-[0.2em] disabled:opacity-20 transition-all duration-400"
                             >
                               {isFetchingIG ? <i className="fas fa-spinner fa-spin"></i> : 'FETCH_FEED'}
                             </button>
                          </div>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>

             <div className="bg-white p-10 border border-black/5 rounded-2xl flex flex-col gap-8">
                <label className="block text-[10px] font-black text-black/30 uppercase tracking-[0.4em] ml-1">ARCHIVE_FOLDERS</label>
                
                <div className="flex gap-4">
                   <input 
                     type="text" 
                     id="newAlbumInput"
                     placeholder="DESIGNATE_NEW_FOLDER..."
                     className="flex-1 bg-black/[0.02] border border-black/5 p-5 text-[11px] font-black outline-none focus:bg-white focus:border-black transition-all duration-400 uppercase tracking-widest rounded-sm"
                   />
                   <button 
                     onClick={() => {
                       const input = document.getElementById('newAlbumInput') as HTMLInputElement;
                       if (input && input.value) {
                         addAlbum(input.value);
                         input.value = '';
                       }
                     }}
                     className="bg-black text-white px-8 font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:bg-neutral-800 transition-all duration-400 rounded-sm"
                   >
                     CREATE
                   </button>
                </div>

                <div className="flex flex-wrap gap-2">
                   {(localConfig.albums || []).map(album => (
                      <div key={album.id} className="bg-zinc-50 border border-black/5 p-6 rounded-2xl flex items-center gap-4 group">
                         <span className="text-[10px] font-black text-black/60 uppercase tracking-[0.2em] truncate max-w-[160px]">{album.name}</span>
                         <button onClick={() => deleteAlbum(album.id)} className="text-black/20 hover:text-black transition-colors duration-400">
                            <i className="fas fa-times text-[10px]"></i>
                         </button>
                      </div>
                   ))}
                </div>
             </div>


             <div className="flex justify-between items-center px-1 mb-4 mt-8">
               <h3 className="text-sm font-black text-black uppercase tracking-[0.2em] flex items-center gap-3">
                 <i className="fas fa-camera opacity-30"></i> MEMORIES & LINKS
               </h3>
             </div>

             {/* Drag & Drop Zone */}
             <div 
                 onDragOver={handleDragOver}
                 onDragLeave={handleDragLeave}
                 onDrop={handleDrop}
                 onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = 'image/*,video/*,audio/*';
                    input.onchange = (e) => {
                       const files = (e.target as HTMLInputElement).files;
                       if(files) handleMultiFileUpload(files);
                    };
                    input.click();
                 }}
                 className={`
                   relative group cursor-pointer transition-all duration-500
                   border-2 border-dashed rounded-2xl py-12 flex flex-col items-center justify-center gap-4 mb-8
                   ${isDraggingOver ? 'border-black bg-black/5' : 'border-black/5 hover:border-black/20 hover:bg-black/5'}
                 `}
              >
                 <div className={`p-6 rounded-2xl transition-all duration-500 ${isDraggingOver ? 'bg-black text-white scale-110 shadow-xl' : 'bg-black/5 text-black/20 group-hover:bg-black/10 group-hover:text-black'}`}>
                    <i className="fas fa-cloud-upload-alt text-3xl"></i>
                 </div>
                 <div className="text-center">
                    <p className="text-[10px] font-black text-black uppercase tracking-[0.2em]">
                       {isDraggingOver ? 'DROP FILES NOW' : 'SELECT OR DRAG FILES'}
                    </p>
                    <p className="text-[8px] text-black/30 font-black uppercase tracking-[0.1em] mt-2 font-geist">
                       JPG, PNG, MP4, MP3 SUPPORTED
                    </p>
                 </div>
              </div>

             
             {/* Gallery Grid */}
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {localConfig.gallery.map((item, idx) => {
                const isIG = item.url.includes('instagram.com') || item.url.includes('cdninstagram.com');
                const isVid = isVideo(item.url);
                const isAud = isAudio(item.url);
                
                return (
                   <motion.div key={idx} layout className="bg-white p-2 rounded-2xl shadow-sm border border-black/5 flex flex-col gap-2 group relative aspect-[4/5] hover:shadow-2xl transition-all duration-400">
                     <div 
                       className="flex-1 w-full rounded-xl bg-black/[0.02] overflow-hidden relative cursor-zoom-in group/thumb grayscale hover:grayscale-0 transition-all duration-400"
                       onClick={() => {
                         const type = isAud ? 'audio' : isVid ? 'video' : 'image';
                         setPreviewItem({ url: item.url, type });
                       }}
                     >
                         {isAud ? (
                             <div className="absolute inset-0 flex items-center justify-center text-3xl text-black/40">
                                 <i className="fas fa-microphone"></i>
                             </div>
                         ) : isVid ? (
                             <div className="absolute inset-0 flex items-center justify-center text-3xl text-black/40">
                                 <i className="fas fa-video"></i>
                             </div>
                         ) : (
                             <img 
                               src={getPreviewUrl(item.url)} 
                               referrerPolicy="no-referrer"
                               className="w-full h-full object-cover transition-transform duration-400 group-hover/thumb:scale-110" 
                               onError={(e) => (e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23fef2f2'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23000000' font-size='12'%3EERR_FILE%3C/text%3E%3C/svg%3E")} 
                             />
                         )}
                         <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/10 transition-colors duration-400 flex items-center justify-center">
                            <i className="fas fa-search-plus text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-400"></i>
                         </div>
                         {isIG && <div className="absolute inset-0 bg-black/10 pointer-events-none" />}
                         {isIG && <div className="absolute top-1 right-1 w-4 h-4 bg-black text-white flex items-center justify-center rounded-sm text-[6px] shadow-sm"><i className="fab fa-instagram"></i></div>}
                     </div>

                     {/* Compact Controls */}
                     <div className="flex flex-col gap-1.5 px-1 pb-1">
                         <div className="flex items-center gap-1.5">
                             <div className="flex-1 min-w-0">
                                {/* Privacy Toggle as a tiny dot/icon */}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleGalleryPrivacy(idx); }}
                                  className={`w-full text-xs font-black py-1 px-2 rounded-sm flex items-center justify-center gap-2 transition-colors duration-400 border ${item.privacy === 'public' ? 'bg-black text-white border-black' : 'bg-transparent text-black border-black/10'}`}
                                >
                                  <i className={`fas fa-${item.privacy === 'public' ? 'globe' : 'lock'} text-[8px]`}></i>
                                  <span className="text-[8px] uppercase tracking-widest">{item.privacy === 'public' ? 'PUBLIC' : 'PRIVATE'}</span>
                                </button>
                             </div>
                             <button 
                               onClick={(e) => { e.stopPropagation(); removeGalleryImage(idx); }}
                               className="w-6 h-6 flex items-center justify-center text-black/10 hover:text-black hover:bg-black/5 transition-all duration-400 rounded-sm"
                             >
                               <i className="fas fa-trash-alt text-[9px]"></i>
                             </button>
                         </div>
                         
                         {(localConfig.albums && localConfig.albums.length > 0) && (
                             <select
                                value={item.albumId || ''}
                                onChange={(e) => handleGalleryAlbumChange(idx, e.target.value || null)}
                                className="w-full text-[8px] font-black text-black/40 bg-black/[0.02] border border-black/5 rounded-sm p-1.5 outline-none focus:border-black transition-all duration-400 uppercase tracking-tight"
                             >
                                <option value="">NO_ALBUM</option>
                                {localConfig.albums.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                             </select>
                         )}
                     </div>
                   </motion.div>
                 );
               })}
             </div>
          </motion.div>
        )}

        {/* Other tabs follow the same pattern, simplified for brevity here */}
        {activeTab === 'timeline' && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex justify-between items-center px-2">
                 <h3 className="text-sm font-black text-black uppercase tracking-[0.2em] flex items-center gap-3">
                   <i className="fas fa-stream opacity-30"></i> OUR STORY
                 </h3>
                 <button 
                   onClick={addTimelineEvent} 
                   className="bg-black text-white text-[9px] font-black px-6 py-2 rounded-sm uppercase tracking-[0.2em] shadow-lg hover:bg-neutral-800 transition-all duration-400 font-geist"
                 >
                   + NEW EVENT
                 </button>
              </div>


               {/* View Settings (Moved from Timeline Toolbar) */}
               <div className="bg-white p-10 border border-black/5 rounded-2xl">
                  <h3 className="text-[11px] font-black text-black mb-10 flex items-center gap-4 uppercase tracking-[0.4em]">
                    <span className="w-4 h-[1px] bg-black/20"></span> VIEWPORT_CONFIG
                  </h3>
                  
                  <label className="block text-[10px] font-black text-black/30 uppercase mb-6 tracking-[0.4em] ml-1">PROJECTION_MODE</label>
                  <div className="flex bg-black/[0.02] p-1.5 mb-10 rounded-sm">
                        {([
                           { id: 'wave', label: 'WAVE_AXIS', icon: 'fa-water' },
                           { id: 'vertical', label: 'LINEAR_AXIS', icon: 'fa-arrows-alt-v' }
                        ] as const).map((mode) => (
                           <button
                               key={mode.id}
                               onClick={() => handleInputChange('timelineLayoutMode', mode.id)}
                               className={`flex-1 py-4 px-2 text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-400 flex items-center justify-center gap-3 rounded-sm ${
                                     (localConfig.timelineLayoutMode || 'wave') === mode.id 
                                     ? 'bg-white text-black shadow-xl' 
                                     : 'text-black/20 hover:text-black/40'
                               }`}
                           >
                               <i className={`fas ${mode.icon} text-[11px]`}></i> {mode.label}
                           </button>
                        ))}
                  </div>
 
                  <label className="block text-[10px] font-black text-black/30 uppercase mb-6 tracking-[0.4em] ml-1">OPTICAL_ZOOM</label>
                  <input 
                        type="range"
                        min="0"
                        max="7"
                        step="1"
                        value={localConfig.timelineZoomLevel || 0}
                        onChange={(e) => handleInputChange('timelineZoomLevel', parseInt(e.target.value))}
                        className="w-full h-1.5 bg-black/5 appearance-none cursor-pointer accent-black"
                  />
                  <div className="flex justify-between text-[9px] font-black text-black/[0.15] mt-4 uppercase tracking-[0.3em]">
                        <span>MACRO</span>
                        <span>TELEPHOTO</span>
                  </div>
               </div>


              {/* Timeline Display Settings */}
               <div className="bg-black/5 p-8 rounded-2xl border border-black/5 space-y-8">
                 <div className="space-y-4">
                     <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.4em]">CARD SCALING</p>
                        <span className="text-black font-black text-[10px]">
                           {Math.round((localConfig.timelineCardScale || 1.0) * 100)}%
                        </span>
                     </div>
                     <input 
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={localConfig.timelineCardScale || 1.0}
                        onChange={(e) => handleInputChange('timelineCardScale', parseFloat(e.target.value))}
                        className="w-full h-1 bg-black/10 appearance-none cursor-pointer accent-black"
                     />
                 </div>

                 <div className="space-y-4 pt-4 border-t border-black/5">
                     <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.4em]">MEDIA DENSITY</p>
                        <span className="text-black font-black text-[10px]">
                           {localConfig.timelineThumbnailHeight || 150}PX
                        </span>
                     </div>
                     <input 
                         type="range"
                         min="50"
                         max="400"
                         step="10"
                         value={localConfig.timelineThumbnailHeight || 150}
                         onChange={(e) => handleInputChange('timelineThumbnailHeight', parseInt(e.target.value))}
                         className="w-full h-1 bg-black/10 appearance-none cursor-pointer accent-black"
                      />
                  </div>
               </div>

              {/* Event List */}
              <div className="space-y-4">
                 {localConfig.timeline.map((item, idx) => (
                    <motion.div 
                       key={item.id} 
                       initial={{ opacity: 0, x: -10 }} 
                       animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.05 } }}
                       className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 flex items-center gap-6 group hover:shadow-2xl transition-all duration-500"
                    >
                       <div className="w-14 h-14 shrink-0 bg-black/5 rounded-sm overflow-hidden flex items-center justify-center border border-black/5 relative grayscale group-hover:grayscale-0 transition-all duration-700">
                           {item.media?.type === 'image' && <img src={item.media.url} className="w-full h-full object-cover" />}
                           {item.media?.type === 'video' && <i className="fas fa-video opacity-20"></i>}
                           {item.media?.type === 'audio' && <i className="fas fa-microphone opacity-20"></i>}
                           {!item.media && <i className="fas fa-sticky-note opacity-10"></i>}
                           
                           <label className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-400 z-10">
                              <i className="fas fa-camera text-white text-[10px]"></i>
                              <input 
                                 type="file" 
                                 className="hidden" 
                                 accept="image/*,video/*"
                                 onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleTimelineFileUpload(item.id, file);
                                 }}
                              />
                           </label>
                       </div>

                       <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="flex items-center gap-4">
                             <DatePicker
                                selected={item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp as any)}
                                onChange={(date: Date | null) => date && handleTimelineChange(item.id, 'timestamp', date)}
                                showTimeSelect
                                dateFormat="MM/dd/yy"
                                className="w-24 text-[10px] font-black text-black/20 bg-transparent outline-none p-0 cursor-pointer hover:text-black uppercase tracking-widest transition-colors duration-400"
                             />
                             <input 
                                type="text"
                                value={item.text}
                                onChange={(e) => handleTimelineChange(item.id, 'text', e.target.value)}
                                className="flex-1 text-[11px] font-black text-black bg-transparent outline-none truncate uppercase tracking-tight focus:bg-black/5 px-3 py-2 border-b border-transparent focus:border-black transition-all duration-400"
                              />
                          </div>
                       </div>

                       <button 
                          onClick={() => {
                             if(confirm('REMOVE RECORD?')) updateLocal(prev => ({ 
                                ...prev, 
                                timeline: prev.timeline.filter(t => t.id !== item.id) 
                             }));
                          }}
                          className="w-10 h-10 flex items-center justify-center text-black/5 hover:text-black hover:bg-black/5 rounded-full transition-all duration-400 shrink-0"
                       >
                          <i className="fas fa-trash-alt text-[10px]"></i>
                       </button>
                    </motion.div>
                 ))}
              </div>
           </motion.div>
        )}

        {activeTab === 'coupons' && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="bg-white p-10 border border-black/5 flex items-center justify-between shadow-sm rounded-2xl">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.4em]">STORY_NODE_INTEGRATION</p>
                    <p className="text-[11px] font-black text-black uppercase tracking-widest">MAP_REDEEMED_TO_TIMELINE</p>
                 </div>
                 <button 
                    onClick={() => handleInputChange('showCouponsOnTimeline', !localConfig.showCouponsOnTimeline)}
                    className={`w-14 h-7 p-1 transition-all duration-400 flex items-center ${localConfig.showCouponsOnTimeline ? 'bg-black justify-end' : 'bg-black/10 justify-start'} rounded-sm`}
                  >
                     <motion.div layout className="w-5 h-5 bg-white shadow-xl rounded-sm" />
                  </button>
              </div>
 
              <div className="flex justify-between items-end mb-10 px-4">
                 <div className="space-y-1">
                    <h3 className="text-sm font-black text-black uppercase tracking-[0.4em] flex items-center gap-4">
                       <span className="w-6 h-[1px] bg-black"></span> VOUCHER_REGISTRY
                    </h3>
                    <p className="text-[9px] font-black text-black/10 uppercase tracking-widest pl-10">Active Perk Modulation</p>
                 </div>
                 <button 
                    onClick={addCoupon} 
                    className="bg-black text-white text-[10px] font-black px-8 py-3 uppercase tracking-[0.3em] shadow-2xl hover:bg-neutral-800 transition-all duration-400 rounded-sm"
                 >
                    + INITIALIZE_VOUCHER
                 </button>
              </div>
              
              <div className="space-y-4">
                {localConfig.coupons.map(coupon => {
                   const isExpanded = expandedCouponId === coupon.id;
                   return (
                    <div 
                       key={coupon.id} 
                       className={`bg-white border rounded-2xl transition-all duration-400 ${isExpanded ? 'p-8 border-black shadow-2xl' : 'p-6 border-black/5 hover:bg-black/[0.02] cursor-pointer'}`}
                       onClick={() => !isExpanded && setExpandedCouponId(coupon.id)}
                    >
                       <div className="flex items-center gap-8">
                          <div className="w-16 h-16 bg-black/[0.02] border border-black/5 flex items-center justify-center text-3xl grayscale rounded-sm">
                             {coupon.emoji}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                             <h4 className="text-xs font-black text-black uppercase tracking-widest truncate">{coupon.title}</h4>
                             <div className="flex items-center gap-4 text-[10px] text-black/20 font-black uppercase tracking-widest">
                                <span className="text-black/60">{coupon.points || 0} UNITS</span>
                                <span>/</span>
                                <span>{localConfig.partners[coupon.for || '']?.name || coupon.for || 'UNASSIGNED'}</span>
                                {coupon.isRedeemed && <span className="text-black px-2 bg-black/[0.04]">REDEEMED</span>}
                             </div>
                          </div>
                          <button 
                             onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCouponId(isExpanded ? null : coupon.id);
                             }}
                             className="w-10 h-10 flex items-center justify-center text-black/10 hover:text-black transition-all duration-400"
                          >
                             <i className={`fas fa-${isExpanded ? 'minus' : 'plus'} text-xs`}></i>
                          </button>
                       </div>

                     <AnimatePresence>
                        {isExpanded && (
                           <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                           >
                              <div className="pt-4 mt-2 border-t border-gray-50 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                                 <div className="flex gap-3">
                                    <div className="flex flex-col gap-1">
                                       <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest pl-1">Emoji</label>
                                       <input 
                                           type="text" 
                                           value={coupon.emoji} 
                                           onChange={(e) => handleCouponChange(coupon.id, 'emoji', e.target.value)}
                                           className="w-16 text-center border-b border-black/10 p-2 text-2xl bg-black/[0.02] rounded-sm focus:border-black outline-none transition-all duration-400 grayscale"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1">
                                       <label className="text-[9px] uppercase font-black text-black/20 tracking-[0.3em] pl-1">TITLE_LABEL</label>
                                       <input 
                                           type="text" 
                                           value={coupon.title} 
                                           onChange={(e) => handleCouponChange(coupon.id, 'title', e.target.value)}
                                           className="w-full border-b border-black/5 bg-black/[0.02] p-3 font-black text-[11px] uppercase tracking-widest focus:border-black outline-none transition-all duration-400"
                                        />
                                    </div>
                                 </div>
                                 
                                 <div className="flex flex-col gap-1">
                                     <label className="text-[9px] uppercase font-black text-black/20 tracking-[0.3em] pl-1">DESC_INDICES</label>
                                     <input 
                                        type="text" 
                                        value={coupon.desc} 
                                        onChange={(e) => handleCouponChange(coupon.id, 'desc', e.target.value)}
                                        className="w-full border-b border-black/5 bg-black/[0.02] p-3 text-[10px] font-black uppercase tracking-tight focus:border-black outline-none transition-all duration-400"
                                        placeholder="DATA_INPUT..."
                                     />
                                  </div>

                                 <div className="flex gap-3">
                                     <div className="flex flex-col gap-1">
                                        <label className="text-[9px] uppercase font-black text-black/20 tracking-[0.3em] pl-1">VAL_UNIT</label>
                                        <input
                                           type="number"
                                           min="0"
                                           step="100"
                                           value={coupon.points || 0}
                                           onChange={(e) => handleCouponChange(coupon.id, 'points', parseInt(e.target.value))}
                                           className="w-24 border-b border-black/5 bg-black/[0.02] p-3 text-[10px] font-black focus:border-black outline-none transition-all duration-400"
                                        />
                                     </div>
                                     <div className="flex-1 flex flex-col gap-1">
                                        <label className="text-[9px] uppercase font-black text-black/20 tracking-[0.3em] pl-1">ASSIGNED_TO</label>
                                        <select 
                                           value={coupon.for} 
                                           onChange={(e) => handleCouponChange(coupon.id, 'for', e.target.value)}
                                           className="w-full text-[10px] font-black border-b border-black/5 p-3 bg-black/[0.02] uppercase tracking-widest rounded-sm"
                                        >
                                          {Object.entries(localConfig.partners || {}).map(([key, data]) => (
                                            <option key={key} value={key}>{data.name}</option>
                                          ))}
                                       </select>
                                    </div>
                                 </div>

                                 <div className="flex justify-between items-center pt-6 border-t border-black/5 mt-4">
                                     <label className="flex items-center gap-4 cursor-pointer select-none group/toggle">
                                        <div 
                                           onClick={() => handleCouponChange(coupon.id, 'isRedeemed', !coupon.isRedeemed)}
                                           className={`w-10 h-5 rounded-sm transition-all duration-400 relative ${coupon.isRedeemed ? 'bg-black' : 'bg-black/10'}`}
                                        >
                                           <div className={`absolute top-1 w-3 h-3 bg-white rounded-sm transition-all duration-400 ${coupon.isRedeemed ? 'left-6' : 'left-1'}`} />
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${coupon.isRedeemed ? 'text-black' : 'text-black/20'}`}>
                                           {coupon.isRedeemed ? 'REDEEMED' : 'PENDING'}
                                        </span>
                                     </label>

                                     <button 
                                        onClick={(e) => {
                                           if (window.confirm("PURGE_RECORD?")) {
                                              updateLocal(prev => ({ ...prev, coupons: prev.coupons.filter(c => c.id !== coupon.id) }));
                                           }
                                        }}
                                        className="text-[9px] font-black text-black/20 uppercase tracking-[0.4em] px-5 py-2 hover:bg-black hover:text-white transition-all duration-400 shadow-sm"
                                     >
                                        PURGE_RECORD
                                     </button>
                                  </div>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </div>
                );
               })}
              </div>
           </motion.div>
        )}

        {activeTab === 'world' && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
 
             {/* AppKit Circles / World Selector */}
             {circles.length > 0 && (
               <div className="bg-white p-10 border border-black/5 flex flex-col gap-6 shadow-sm">
                 <h3 className="text-[11px] font-black text-black/50 uppercase tracking-[0.4em] flex items-center gap-4 mb-4">
                   <span className="w-4 h-[1px] bg-black/20"></span> CLUSTER_INDEX
                 </h3>
                 {circles.map(circle => (
                   <div key={circle.id} className={`flex items-center justify-between p-6 border transition-all ${circle.id === activeCircleId ? 'border-black bg-black/[0.02]' : 'border-black/5 bg-transparent'}`}>
                     <div className="space-y-1">
                       <p className="text-xs font-black text-black uppercase tracking-widest">{circle.name}</p>
                       <p className="text-[9px] text-black/20 font-black uppercase tracking-[0.2em] truncate max-w-[160px]">{circle.id}</p>
                     </div>
                     <div className="flex items-center gap-4">
                       <button
                         onClick={() => { navigator.clipboard.writeText(circle.id); }}
                         className="text-black/20 hover:text-black transition-colors"
                       >
                         <i className="fas fa-copy text-[10px]"></i>
                       </button>
                       {circle.id !== activeCircleId ? (
                         <button
                           onClick={() => setActiveCircle(circle.id)}
                           className="text-[10px] bg-black text-white px-6 py-2 font-black uppercase tracking-[0.3em] hover:bg-neutral-800 transition-all shadow-lg"
                         >
                           CONNECT
                         </button>
                       ) : (
                         <span className="text-[10px] text-black font-black px-6 py-2 bg-black/5 uppercase tracking-[0.3em] flex items-center gap-2">
                           <span className="w-1.5 h-1.5 bg-black rounded-none animate-pulse"></span>
                           ACTIVE
                         </span>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             )}
              <div className="bg-white p-10 border border-black/5 flex flex-col gap-8 shadow-sm">
                <div className="flex justify-between items-end mb-4">
                   <div className="space-y-1">
                     <h3 className="text-sm font-black text-black uppercase tracking-[0.4em] flex items-center gap-4">
                        <span className="w-6 h-[1px] bg-black"></span> TERRAIN_INSTANCES
                     </h3>
                     <p className="text-[9px] font-black text-black/10 uppercase tracking-widest pl-10">Active Simulation Environments</p>
                   </div>
                   <div className="bg-black/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em]">{localConfig.lands?.length || 0}_ENV</div>
                </div>
 
                <div className="flex gap-4">
                   <input 
                     type="text" 
                     id="newLandInput"
                     placeholder="DESIGNATE_NEW_TERRAIN..."
                     className="flex-1 bg-black/[0.02] border border-black/5 p-5 text-[11px] font-black outline-none focus:bg-white focus:border-black transition-all uppercase tracking-widest"
                   />
                   <button 
                     onClick={() => {
                       const input = document.getElementById('newLandInput') as HTMLInputElement;
                       if (input && input.value) {
                         addLand(input.value);
                         input.value = '';
                       }
                     }}
                     className="bg-black text-white px-8 font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:bg-neutral-800 transition-all"
                   >
                     EXECUTE
                   </button>
                </div>
 
                <div className="flex flex-col gap-3 mt-2">
                   {(localConfig.lands || []).map(land => (
                      <div key={land.id} className={`p-6 border flex items-center justify-between gap-4 transition-all duration-500 ${land.isActive ? 'border-black bg-black/[0.02]' : 'border-black/5 bg-transparent opacity-40 hover:opacity-100'}`}>
                         <div className="flex items-center gap-6">
                            <button 
                               onClick={() => toggleLandActive(land.id)}
                               className={`w-6 h-6 flex items-center justify-center transition-all ${land.isActive ? 'bg-black text-white' : 'border border-black/10 text-transparent hover:border-black/30'}`}
                            >
                               <i className="fas fa-check text-[10px]"></i>
                            </button>
                            <span className={`text-xs font-black uppercase tracking-widest ${land.isActive ? 'text-black' : 'text-black/30'}`}>{land.name}</span>
                         </div>
                         <button onClick={() => deleteLand(land.id)} className="text-black/10 hover:text-black transition-colors w-10 h-10 flex items-center justify-center">
                            <i className="fas fa-trash-alt text-[10px]"></i>
                         </button>
                      </div>
                   ))}
                </div>
             </div>
           </motion.div>
        )}

        {activeTab === 'objects' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="bg-white p-10 border border-black/5 space-y-10 shadow-sm">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                   <h3 className="text-sm font-black text-black uppercase tracking-[0.4em] flex items-center gap-4">
                      <span className="w-6 h-[1px] bg-black"></span> ENTITY_ARCHIVE
                   </h3>
                   <p className="text-[9px] font-black text-black/10 uppercase tracking-widest pl-10">Geometric Asset Management</p>
                </div>
                <label className="cursor-pointer bg-black text-white hover:bg-neutral-800 px-8 py-4 font-black text-[10px] uppercase tracking-[0.4em] transition-all shadow-2xl flex items-center gap-4">
                  UPLOAD_ASSET
                  <input 
                    type="file" 
                    accept=".glb,.gltf" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      try {
                        const url = await uploadAPI.upload(file);
                        alert(`Successfully uploaded ${file.name}! Asset added to registry.`);
                      } catch (err) {
                        alert('Transfer failed.');
                      }
                    }} 
                  />
                </label>
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-black/5">
                {([
                  { id: 'all', label: 'ROOT_ALL', icon: 'fa-border-all' },
                  { id: 'pet', label: 'ENTITIES', icon: 'fa-paw' },
                  { id: 'deco', label: 'MODULAR_DECO', icon: 'fa-palette' },
                  { id: 'bldg', label: 'STRUCTURES', icon: 'fa-home' },
                  { id: 'custom', label: 'INTERNAL_UX', icon: 'fa-box-open' },
                ] as const).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setObjectCategoryFilter(cat.id)}
                    className={`px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${
                      objectCategoryFilter === cat.id
                        ? 'bg-black text-white shadow-xl'
                        : 'bg-black/[0.02] text-black/20 hover:text-black/40'
                    }`}
                  >
                    <i className={`fas ${cat.icon} text-[10px]`}></i>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Object Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {SHOP_ITEMS.filter(item => 
                  objectCategoryFilter === 'all' || 
                  item.type.startsWith(objectCategoryFilter) ||
                  (objectCategoryFilter === 'custom' && item.type === 'custom_3d')
                ).map((item) => (
                  <div key={item.id} className="bg-black/[0.02] border border-black/5 p-6 flex flex-col items-center text-center gap-4 group hover:bg-white hover:border-black transition-all duration-500">
                    <div className="text-4xl grayscale group-hover:grayscale-0 transition-all group-hover:scale-110">
                      {item.icon}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-black text-black uppercase tracking-widest">{item.name}</h4>
                      <div className="flex items-center justify-center gap-2 text-black/20 font-black text-[8px] uppercase tracking-widest">
                        {item.price} UNITS
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* FULLSCREEN PREVIEW OVERLAY */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
            onClick={() => setPreviewItem(null)}
          >
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-10 right-10 w-16 h-16 bg-white/5 border border-white/10 hover:bg-white hover:text-black text-white flex items-center justify-center text-xl transition-all shadow-2xl"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewItem(null);
              }}
            >
              <i className="fas fa-times"></i>
            </motion.button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
               {previewItem.type === 'image' && (
                 <img 
                   src={getPreviewUrl(previewItem.url)} 
                   className="max-w-full max-h-[85vh] object-contain rounded-none shadow-2xl grayscale"
                   alt="Preview"
                 />
               )}
               {previewItem.type === 'video' && (
                 <video 
                   src={previewItem.url} 
                   className="max-w-full max-h-[85vh] rounded-none shadow-2xl grayscale"
                   controls
                   autoPlay
                 />
               )}
               {previewItem.type === 'audio' && (
                 <div className="bg-white p-12 rounded-none shadow-2xl flex flex-col items-center gap-10 min-w-[400px]">
                    <div className="w-24 h-24 bg-black/[0.02] text-black border border-black/5 flex items-center justify-center text-4xl shadow-inner">
                      <i className="fas fa-microphone"></i>
                    </div>
                    <audio src={previewItem.url} controls className="w-full h-12 accent-black" />
                    <p className="text-black/20 text-[10px] font-black uppercase tracking-[0.6em]">AUDIO_ARCHIVE_DATA</p>
                 </div>
               )}
               
               <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-4">
                  <a 
                    href={previewItem.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-external-link-alt"></i> Open Original
                  </a>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditDrawer;
