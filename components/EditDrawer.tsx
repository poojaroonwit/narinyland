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
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="glass-morphism w-full max-w-5xl h-[90vh] rounded-clay shadow-[0_40px_100px_rgba(0,0,0,0.4)] flex overflow-hidden border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Vertical Tabs Sidebar */}
            <div className="w-64 bg-black/5 border-r border-white/10 flex flex-col shrink-0">
              {/* Header */}
              <div className="p-8">
                <h2 className="text-2xl font-black text-black tracking-tighter flex items-center gap-2">
                  SETTINGS
                  {hasChanges && <span className="w-2 h-2 bg-black rounded-full animate-pulse" />}
                </h2>
                <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em] mt-2">Narinyland OS</p>
              </div>


              {/* Tab Buttons */}
              <div className="flex-1 overflow-y-auto pt-4">
                {['general', 'proposal', 'gallery', 'timeline', 'coupons', 'world', 'objects'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`w-full text-left px-8 py-5 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                      activeTab === tab 
                        ? 'text-black' 
                        : 'text-black/30 hover:text-black/60'
                    }`}
                  >
                    {activeTab === tab && (
                      <motion.div layoutId="tab-active" className="absolute left-0 w-1.5 h-6 bg-black rounded-r-full" />
                    )}
                    <i className={`fas ${TAB_ICONS[tab] || 'fa-circle'} text-[10px]`}></i>
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
            <div className="flex-1 flex flex-col min-w-0 bg-white/40">
              {/* Top Bar with Close */}
              <div className="p-8 border-b border-black/5 flex justify-between items-center shrink-0">
                <h3 className="text-2xl font-black text-black tracking-tighter uppercase flex items-center gap-3">
                  <i className={`fas ${TAB_ICONS[activeTab] || 'fa-circle'} opacity-30`}></i>
                  {activeTab}
                </h3>
                <button onClick={onClose} className="w-12 h-12 bg-black/5 hover:bg-black/10 rounded-full flex items-center justify-center transition-all group">
                  <i className="fas fa-times text-black/40 group-hover:text-black"></i>
                </button>
              </div>


              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-8 pb-32">
        {activeTab === 'general' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="bg-white/60 p-8 rounded-clay shadow-sm border border-white/20">
              <h3 className="text-sm font-black text-black mb-8 flex items-center gap-3 uppercase tracking-[0.2em]">
                <i className="fas fa-info-circle opacity-30"></i> CORE SETUP
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center gap-6">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">World Name</label>
                    <p className="text-[8px] text-black/20 ml-1">The title of your magical space</p>
                  </div>
                  <input 
                    type="text" 
                    value={localConfig.appName} 
                    onChange={(e) => handleInputChange('appName', e.target.value)}
                    className="w-1/2 bg-black/5 border-b-2 border-transparent rounded-t-xl p-4 text-xs font-bold outline-none focus:border-black transition-all text-right uppercase tracking-[0.1em]"
                  />
                </div>
                  <input 
                    type="text" 
                    value={localConfig.appName} 
                    onChange={(e) => handleInputChange('appName', e.target.value)}
                    className="w-1/2 bg-black/5 border-b-2 border-transparent rounded-t-xl p-4 text-xs font-bold outline-none focus:border-black transition-all text-right"
                  />
                </div>
                <div className="flex justify-between items-center gap-6 pt-2">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Proposal Feature</label>
                    <p className="text-[8px] text-black/20 ml-1">Show or hide the proposal screen</p>
                  </div>
                  <button
                    onClick={() => handleInputChange('showProposal', !localConfig.showProposal)}
                    className={`w-12 h-6 rounded-full transition-all relative ${localConfig.showProposal ? 'bg-black' : 'bg-black/10'}`}
                  >
                    <motion.div 
                      animate={{ x: localConfig.showProposal ? 24 : 4 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                <div className="flex justify-between items-center gap-6 pt-2">
                  <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Anniversary</label>
                  <div className="w-1/2 text-right">
                    <DatePicker
                      selected={new Date(localConfig.anniversaryDate || Date.now())}
                      onChange={(date: Date | null) => date && handleInputChange('anniversaryDate', date.toISOString())}
                      className="w-full bg-black/5 border-b-2 border-transparent rounded-t-xl p-4 text-xs font-bold outline-none focus:border-black transition-all text-right"
                    />
                  </div>
                </div>

                
                {/* PWA / App Identity */}
                <div className="bg-black/5 p-8 rounded-clay border border-black/5 space-y-6">
                  <h4 className="text-[10px] font-black text-black opacity-40 uppercase tracking-[0.2em] flex items-center gap-3">
                    <i className="fas fa-mobile-alt"></i> APP IDENTITY & PWA
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[8px] font-black text-black/30 uppercase mb-2 tracking-[0.1em]">App Name (Long)</label>
                       <input 
                         type="text" 
                         value={localConfig.pwaName || localConfig.appName || ''} 
                         onChange={(e) => handleInputChange('pwaName', e.target.value)}
                         className="w-full bg-white/50 border border-black/5 rounded-xl p-3 text-xs font-bold outline-none focus:border-black transition-all"
                         placeholder="Narinyland"
                       />
                     </div>
                     <div>
                       <label className="block text-[8px] font-black text-black/30 uppercase mb-2 tracking-[0.1em]">Short Name</label>
                       <input 
                         type="text" 
                         value={localConfig.pwaShortName || ''} 
                         onChange={(e) => handleInputChange('pwaShortName', e.target.value)}
                         className="w-full bg-white/50 border border-black/5 rounded-xl p-3 text-xs font-bold outline-none focus:border-black transition-all"
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
                       className="w-full bg-white/50 border border-black/5 rounded-xl p-3 text-xs font-bold outline-none focus:border-black transition-all"
                       placeholder="Our magical world..."
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[8px] font-black text-black/30 uppercase mb-2 tracking-[0.1em]">Theme Color</label>
                       <div className="flex items-center gap-3 bg-white/50 border border-black/5 rounded-xl p-2 pl-4">
                          <input 
                            type="color" 
                            value={localConfig.pwaThemeColor || '#000000'} 
                            onChange={(e) => handleInputChange('pwaThemeColor', e.target.value)}
                            className="w-8 h-8 rounded-full border-none cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-black/40">{localConfig.pwaThemeColor || '#000000'}</span>
                       </div>
                     </div>

                     <div>
                       <label className="block text-[8px] font-black text-black/30 uppercase mb-2 tracking-[0.1em]">Background Color</label>
                       <div className="flex items-center gap-3 bg-white/50 border border-black/5 rounded-xl p-2 pl-4">
                          <input 
                            type="color" 
                            value={localConfig.pwaBackgroundColor || '#ffffff'} 
                            onChange={(e) => handleInputChange('pwaBackgroundColor', e.target.value)}
                            className="w-8 h-8 rounded-full border-none cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-black/40">{localConfig.pwaBackgroundColor || '#ffffff'}</span>
                       </div>
                     </div>
                  </div>

                  <div>
                    <label className="block text-[8px] font-black text-black/30 uppercase mb-3 tracking-[0.1em]">App Icon (512x512)</label>
                    <div className="flex items-center gap-6">
                       <div className="w-20 h-20 rounded-clay bg-black/5 border border-black/5 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                          {localConfig.pwaIconUrl ? (
                            <img src={localConfig.pwaIconUrl} alt="App Icon" className="w-full h-full object-cover" />
                          ) : (
                            <i className="fas fa-mobile text-3xl opacity-10"></i>
                          )}
                       </div>
                       <label className="cursor-pointer bg-black text-white hover:bg-black/80 px-5 py-3 rounded-pill text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95">
                          {isUploading === 999 ? 'UPLOADING...' : 'UPLOAD ICON'}
                          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && handlePwaIconUpload(e.target.files[0])} />
                       </label>
                       {localConfig.pwaIconUrl && (
                          <button onClick={() => handleInputChange('pwaIconUrl', null)} className="text-black/30 hover:text-black text-xs px-2 transition-colors">
                             <i className="fas fa-trash"></i>
                          </button>
                       )}
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                    <label className="block text-[10px] font-black text-black/30 uppercase mb-3 tracking-[0.2em] ml-1">Music Playlist</label>
                    <textarea 
                      value={(localConfig.musicPlaylist || []).join('\n')} 
                      onChange={(e) => handleInputChange('musicPlaylist', e.target.value.split('\n'))}
                      className="w-full bg-black/5 border-2 border-transparent rounded-clay p-6 text-xs font-bold text-black focus:border-black outline-none transition-all h-32 resize-none"
                      placeholder="https://youtube.com/watch?v=..." 
                    />
                  </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-black/30 uppercase mb-3 tracking-[0.2em] ml-1">Anniversary</label>
                    <DatePicker
                      selected={localConfig.anniversaryDate ? new Date(localConfig.anniversaryDate) : null}
                      onChange={(date: Date | null) => handleInputChange('anniversaryDate', date ? date.toISOString() : '')}
                      dateFormat="MMMM d, yyyy"
                      className="w-full bg-black/5 border-b-2 border-transparent rounded-t-xl p-4 text-xs font-bold outline-none focus:border-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-black/30 uppercase mb-3 tracking-[0.2em] ml-1">Forest Style</label>
                    <select 
                      value={localConfig.treeStyle} 
                      onChange={(e) => handleInputChange('treeStyle', e.target.value)}
                      className="w-full bg-black/5 border-b-2 border-transparent rounded-t-xl p-4 text-xs font-bold outline-none focus:border-black transition-all appearance-none"
                    >
                      <option value="oak">CLASSIC OAK 🌳</option>
                      <option value="sakura">SAKURA 🌸</option>
                      <option value="neon">NEON 🔮</option>
                      <option value="midnight">MIDNIGHT MAGIC ✨</option>
                      <option value="frozen">FROZEN ❄️</option>
                      <option value="golden">GOLDEN ☀️</option>
                    </select>
                  </div>

                  <div className="col-span-2 border-t border-black/5 pt-8 mt-4">
                    <div className="flex justify-between items-center mb-6">
                      <label className="text-[10px] font-black text-black opacity-30 uppercase tracking-[0.2em] ml-1">Dynamic Pets Management</label>
                      <button 
                        onClick={addPet}
                        className="bg-black text-white text-[9px] font-black px-4 py-2 rounded-pill uppercase tracking-[0.2em] hover:bg-black/80 transition-all shadow-lg active:scale-95"
                      >
                        + ADD PET
                      </button>
                    </div>

                    
                    <div className="space-y-4">
                      {/* Show old single pet if pets array is empty */}
                      {(!localConfig.pets || localConfig.pets.length === 0) && (
                        <div className="p-6 bg-black/5 rounded-clay border border-black/5 flex items-center gap-6">
                           <div className="flex-1">
                              <label className="block text-[8px] font-black text-black/30 uppercase mb-2 tracking-[0.1em]">Primary Pet Type</label>
                              <select 
                                value={localConfig.petType || 'cat'} 
                                onChange={(e) => handleInputChange('petType', e.target.value)}
                                className="w-full bg-white/50 border border-black/5 rounded-xl p-3 text-xs font-bold outline-none focus:border-black transition-all appearance-none"
                              >
                                <option value="cat">FLUFFY CAT 🐱</option>
                                <option value="dog">LOYAL DOG 🐶</option>
                                <option value="rabbit">SOFT RABBIT 🐰</option>
                                <option value="panda">CHUBBY PANDA 🐼</option>
                                <option value="fox">RED FOX 🦊</option>
                              </select>
                           </div>
                           <p className="text-[9px] text-black/20 italic max-w-[140px] leading-relaxed">This is your legacy pet. Add more to go dynamic! ✨</p>
                         </div>
                       )}
                      {/* Render Multiple Pets */}
                      {(localConfig.pets || []).map((pet, idx) => (
                        <motion.div 
                          key={pet.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-6 bg-black/5 rounded-clay border border-black/5 flex items-center gap-4"
                        >
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm border border-black/5">
                            {pet.type === 'cat' && '🐱'}
                            {pet.type === 'dog' && '🐶'}
                            {pet.type === 'rabbit' && '🐰'}
                            {pet.type === 'panda' && '🐼'}
                            {pet.type === 'fox' && '🦊'}
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-[7px] font-black text-black/30 uppercase mb-1.5 tracking-[0.1em]">Pet Name</label>
                                <input 
                                  type="text"
                                  value={pet.name || ''}
                                  onChange={(e) => handlePetChange(pet.id, 'name', e.target.value)}
                                  className="w-full bg-white/50 border border-black/5 rounded-xl p-2.5 text-[10px] font-bold outline-none focus:border-black transition-all"
                                  placeholder="Name..."
                                />
                             </div>
                             <div>
                                <label className="block text-[7px] font-black text-black/30 uppercase mb-1.5 tracking-[0.1em]">Animal Type</label>
                                <select 
                                  value={pet.type}
                                  onChange={(e) => handlePetChange(pet.id, 'type', e.target.value)}
                                  className="w-full bg-white/50 border border-black/5 rounded-xl p-2.5 text-[10px] font-bold outline-none appearance-none"
                                >
                                  <option value="cat">CAT</option>
                                  <option value="dog">DOG</option>
                                  <option value="rabbit">RABBIT</option>
                                  <option value="panda">PANDA</option>
                                  <option value="fox">FOX</option>
                                </select>
                             </div>
                          </div>
                          <button onClick={() => removePet(pet.id)} className="w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors group">
                            <i className="fas fa-trash text-black/20 group-hover:text-black"></i>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-black/30 uppercase mb-3 tracking-[0.2em] ml-1">Sky Time</label>
                    <select 
                      value={localConfig.skyMode || 'follow_timezone'} 
                      onChange={(e) => handleInputChange('skyMode', e.target.value)}
                      className="w-full bg-black/5 border-b-2 border-transparent rounded-t-xl p-4 text-xs font-bold outline-none focus:border-black transition-all appearance-none"
                    >
                      <option value="follow_timezone">DEVICE TIMEZONE 🕒</option>
                      <option value="noon">ALWAYS NOON ☀️</option>
                      <option value="night">ALWAYS NIGHT 🌙</option>
                    </select>
                  </div>

                  <div className="col-span-2 bg-black/5 p-6 rounded-clay flex items-center justify-between border border-black/5">
                     <div>
                        <p className="text-[10px] font-black text-black flex items-center gap-3 uppercase tracking-[0.2em]">
                           <i className="fas fa-qrcode opacity-30"></i> MOBILE QR UPLOADER
                        </p>
                        <p className="text-[9px] text-black/30 font-bold uppercase tracking-[0.1em] mt-1 ml-7">Floating QR code at bottom-left</p>
                     </div>
                     <button 
                       onClick={() => handleInputChange('showQRCode', !localConfig.showQRCode)}
                       className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${localConfig.showQRCode ? 'bg-black justify-end' : 'bg-black/10 justify-start'}`}
                     >
                        <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                     </button>
                  </div>


                  <div className="col-span-2 mt-4">
                     <label className="block text-[10px] font-black text-black/30 uppercase mb-3 tracking-[0.2em] ml-1">Graphics Quality</label>
                     <select 
                       value={localConfig.graphicsQuality || 'medium'} 
                       onChange={(e) => handleInputChange('graphicsQuality', e.target.value)}
                       className="w-full bg-black/5 border-b-2 border-transparent rounded-t-xl p-4 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-black transition-all appearance-none"
                     >
                       <option value="low">LOW (FASTEST) ⚡</option>
                       <option value="medium">MEDIUM (BALANCED) ⚖️</option>
                       <option value="high">HIGH (BEST VISUALS) ✨</option>
                     </select>
                  </div>

                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fas fa-seedling text-green-400"></i> Garden & Quality
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Graphics Quality</label>
                      <select 
                         value={localConfig.graphicsQuality || 'medium'} 
                         onChange={(e) => handleInputChange('graphicsQuality', e.target.value)}
                         className="w-full border-2 border-gray-50 rounded-2xl p-4 focus:border-pink-200 outline-none bg-white font-bold text-xs"
                      >
                         <option value="low">Low (Faster)</option>
                         <option value="medium">Medium</option>
                         <option value="high">High (Prettier)</option>
                      </select>
                   </div>
                   <div className="flex flex-col justify-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Show QR Code</p>
                      <button 
                         onClick={() => handleInputChange('showQRCode', !localConfig.showQRCode)}
                         className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${localConfig.showQRCode ? 'bg-green-500 justify-end' : 'bg-gray-200 justify-start'}`}
                      >
                         <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </button>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Days per Tree</label>
                    <input 
                      type="number" 
                      value={localConfig.daysPerTree} 
                      onChange={(e) => handleInputChange('daysPerTree', parseInt(e.target.value))}
                      className="w-full border-2 border-gray-50 rounded-2xl p-4 focus:border-pink-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Days per Flower</label>
                    <input 
                      type="number" 
                      value={localConfig.daysPerFlower || 7} 
                      onChange={(e) => handleInputChange('daysPerFlower', parseInt(e.target.value))}
                      className="w-full border-2 border-gray-50 rounded-2xl p-4 focus:border-pink-200 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Flower Species</label>
                  <select 
                    value={localConfig.flowerType || 'sunflower'} 
                    onChange={(e) => handleInputChange('flowerType', e.target.value)}
                    className="w-full border-2 border-gray-50 rounded-2xl p-4 focus:border-pink-200 outline-none bg-white font-bold"
                  >
                    <option value="sunflower">🌻 Sunflower</option>
                    <option value="tulip">🌷 Tulip</option>
                    <option value="rose">🌹 Rose</option>
                    <option value="cherry">🌸 Cherry Blossom</option>
                    <option value="lavender">🪻 Lavender</option>
                    <option value="cactus">🌵 Cactus (Rare)</option>
                    <option value="heart">💖 Heart Bloom</option>
                    <option value="mixed">🌈 Mixed Garden</option>
                  </select>

                  {localConfig.flowerType === 'mixed' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 flex flex-wrap gap-2"
                    >
                      <p className="w-full text-[9px] font-black text-pink-400 uppercase tracking-widest mb-1 ml-1">Include in Mix:</p>
                      {[
                        { id: 'sunflower', label: '🌻' },
                        { id: 'tulip', label: '🌷' },
                        { id: 'rose', label: '🌹' },
                        { id: 'cherry', label: '🌸' },
                        { id: 'lavender', label: '🪻' },
                        { id: 'cactus', label: '🌵' },
                        { id: 'heart', label: '💖' }
                      ].map(f => {
                        const isSelected = localConfig.mixedFlowers?.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              const current = localConfig.mixedFlowers || [];
                              const next = isSelected 
                                ? current.filter(id => id !== f.id)
                                : [...current, f.id];
                              handleInputChange('mixedFlowers', next);
                            }}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all border-2 ${
                              isSelected 
                                ? 'bg-white border-pink-400 shadow-sm scale-110' 
                                : 'bg-gray-50 border-transparent opacity-40 grayscale hover:grayscale-0 hover:opacity-100'
                            }`}
                            title={f.id}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/60 p-8 rounded-clay shadow-sm border border-white/20">
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
                      className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${localConfig.showCouponsOnTimeline ? 'bg-black justify-end' : 'bg-black/10 justify-start'}`}
                   >
                      <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                   </button>
                </div>
              </div>
            </div>

            <div className="bg-white/60 p-8 rounded-clay shadow-sm border border-white/20">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-black flex items-center gap-3 uppercase tracking-[0.2em]">
                  <i className="fas fa-user-friends opacity-30"></i> THE COUPLE
                </h3>
                  <span className="text-[10px] text-black/30 font-black uppercase tracking-[0.2em]">
                  CIRCLE MEMBERS
                </span>
              </div>
              </div>

              {membersLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                  <div className="w-4 h-4 border-2 border-pink-300 border-t-pink-500 rounded-full animate-spin" />
                  <span className="text-xs font-bold">Loading members…</span>
                </div>
              ) : circleMembers.length > 0 ? (
                <div className="space-y-2">
                  {circleMembers.map((member, idx) => {
                    const partnerData = member.partnerId ? localConfig.partners[member.partnerId] : null;
                    const displayName = partnerData?.name || member.name;
                    const displayAvatar = partnerData?.avatar || member.avatar || '👤';
                    return (
                      <div key={member.userId ?? idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-blue-100 flex items-center justify-center text-xl flex-shrink-0 border border-white shadow-sm">
                          {displayAvatar.startsWith('http') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={displayAvatar} alt={displayName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            displayAvatar
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{displayName}</p>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                            {member.role}
                            {member.partnerId && (
                              <span className="ml-2 text-pink-400">· {member.partnerId}</span>
                            )}
                          </p>
                        </div>
                        {member.partnerId && (
                          <div className="flex flex-col gap-1 w-28 flex-shrink-0">
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => handlePartnerChange(member.partnerId!, 'name', e.target.value)}
                              className="w-full border rounded-lg px-2 py-1 text-xs font-bold text-gray-700 focus:outline-none focus:border-pink-300"
                              placeholder="Display name"
                            />
                            <input
                              type="text"
                              value={partnerData?.avatar || ''}
                              onChange={(e) => handlePartnerChange(member.partnerId!, 'avatar', e.target.value)}
                              className="w-full border rounded-lg px-2 py-1 text-lg text-center focus:outline-none focus:border-pink-300"
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
            <div className="bg-white/60 p-8 rounded-clay shadow-sm border border-white/20">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black text-black flex items-center gap-3 uppercase tracking-[0.2em]">
                  <i className="fas fa-heart opacity-30"></i> PROPOSAL FLOW
                </h3>
                <button 
                  onClick={addProposalQuestion}
                  className="bg-black text-white text-[9px] font-black px-4 py-2 rounded-pill uppercase tracking-[0.2em] hover:bg-black/80 transition-all shadow-lg"
                >
                  + ADD STEP
                </button>
              </div>

              
              <div className="space-y-6">
                {localConfig.proposal.questions.map((q, idx) => (
                  <div key={idx} className="relative group p-6 bg-black/5 rounded-clay border border-black/5">
                    <label className="block text-[8px] font-black text-black/30 uppercase mb-3 tracking-[0.2em] ml-1">
                      STEP {idx + 1}
                    </label>
                    <div className="flex gap-4">
                      <textarea 
                        value={q} 
                        onChange={(e) => updateProposalQuestion(idx, e.target.value)}
                        className="w-full bg-white/50 border border-black/5 rounded-xl p-4 text-[11px] font-bold outline-none focus:border-black transition-all resize-none"
                        rows={2}
                        placeholder={`QUESTION ${idx + 1}`}
                      />
                      {localConfig.proposal.questions.length > 1 && (
                        <button 
                          onClick={() => removeProposalQuestion(idx)}
                          className="w-12 h-12 flex items-center justify-center text-black/20 hover:text-black hover:bg-black/5 rounded-full transition-all"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>

            <div className="bg-white/60 p-8 rounded-clay shadow-sm border border-white/20">
              <h3 className="text-sm font-black text-black mb-8 flex items-center gap-3 uppercase tracking-[0.2em]">
                <i className="fas fa-check-circle opacity-30"></i> PROPOSAL STATUS
              </h3>
              
              <div className="space-y-8">
                <div className="flex flex-col gap-6 p-6 bg-black/5 rounded-clay border border-black/5">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-black uppercase tracking-[0.1em]">COMPLETION</p>
                      <p className="text-[10px] text-black/30 font-black uppercase tracking-[0.2em] mt-1">
                        {localConfig.proposal.progress || 0} / {localConfig.proposal.questions.length} QUESTIONS READ
                      </p>
                    </div>
                    <div className="flex gap-3">
                       <button 
                         onClick={() => setProposalProgress(0)}
                         className="px-4 py-2 bg-black/5 text-black/40 rounded-pill text-[9px] font-black uppercase tracking-[0.2em] hover:bg-black/10 transition-all font-geist"
                       >
                         RESET
                       </button>
                       <button 
                         onClick={() => setProposalProgress(localConfig.proposal.questions.length)}
                         className="px-4 py-2 bg-black text-white rounded-pill text-[9px] font-black uppercase tracking-[0.2em] hover:bg-black/80 transition-all font-geist shadow-lg"
                       >
                         FINISH ALL
                       </button>
                    </div>
                  </div>
                  
                  {/* Step Indicators */}
                  <div className="flex gap-2">
                    {localConfig.proposal.questions.map((_, i) => {
                      const isRead = (localConfig.proposal.progress || 0) > i;
                      return (
                        <button 
                          key={i}
                          onClick={() => setProposalProgress(isRead ? i : i + 1)}
                          className={`flex-1 h-3 rounded-full transition-all ${isRead ? 'bg-black shadow-[0_0_10px_rgba(0,0,0,0.1)]' : 'bg-black/5'}`}
                          title={`Question ${i+1}: ${isRead ? 'Read' : 'Unread'}`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-black text-white rounded-clay shadow-xl">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.1em]">OUTCOME</p>
                    <p className="text-[10px] opacity-50 font-black uppercase tracking-[0.2em] mt-1">
                      {localConfig.proposal.isAccepted ? '✨ FINAL YES RECEIVED' : '❌ OUTCOME PENDING'}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      updateLocal(prev => ({
                        ...prev,
                        proposal: { ...prev.proposal, isAccepted: !prev.proposal.isAccepted }
                      }));
                    }}
                    className={`px-6 py-3 rounded-pill text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                      localConfig.proposal.isAccepted 
                        ? 'bg-white/10 text-white hover:bg-white/20' 
                        : 'bg-white text-black hover:bg-white/90 shadow-lg scale-105 active:scale-95'
                    }`}
                  >
                    {localConfig.proposal.isAccepted ? 'RESET ACCEPTANCE' : 'MARK AS ACCEPTED'}
                  </button>
                </div>
              </div>

              <p className="text-[9px] text-black/20 mt-6 ml-1 italic font-geist">
                * The proposal screen skips "Read" questions. If progress is reset to 0, it starts from Question 1.
              </p>
            </div>

            
            <div className="p-6 bg-black text-white rounded-clay border-2 border-dashed border-white/20 shadow-lg">
              <p className="text-xs font-black leading-relaxed flex items-center gap-3 uppercase tracking-[0.1em]">
                <i className="fas fa-magic opacity-50"></i>
                The user can only accept your proposal. Each "YES" leads to the next question until the final acceptance!
              </p>
            </div>

          </motion.div>
        )}

        {activeTab === 'gallery' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
             <div className="bg-white/60 p-8 rounded-clay shadow-sm border border-white/20">
                <label className="block text-[10px] font-black text-black/30 uppercase mb-4 tracking-[0.2em] ml-1">GALLERY INTERACTION</label>
                <div className="flex bg-black/5 rounded-clay p-2 mb-6">
                   <button 
                     onClick={() => handleInputChange('gallerySource', 'manual')}
                     className={`flex-1 py-4 text-[10px] font-black rounded-xl transition-all uppercase tracking-[0.2em] ${localConfig.gallerySource === 'manual' ? 'bg-white shadow-xl text-black scale-105' : 'text-black/30'}`}
                   >
                     MANUAL UPLOADS
                   </button>
                   <button 
                     onClick={() => handleInputChange('gallerySource', 'instagram')}
                     className={`flex-1 py-4 text-[10px] font-black rounded-xl transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3 ${localConfig.gallerySource === 'instagram' ? 'bg-black text-white shadow-xl scale-105' : 'text-black/30'}`}
                   >
                     <i className="fab fa-instagram"></i> INSTAGRAM MODE
                   </button>
                </div>


                <AnimatePresence mode="wait">
                  {localConfig.gallerySource === 'instagram' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
                       <div className="p-4 bg-purple-50 rounded-2xl border-2 border-dashed border-purple-200">
                          <p className="text-[11px] text-purple-600 font-bold leading-relaxed">
                             <i className="fab fa-instagram mr-1"></i> <strong>Paste URLs:</strong> Add any public Instagram post link below and the photo will display automatically!
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
                               className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold px-5 rounded-xl text-xs disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
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
                       <div className="p-4 bg-pink-50 rounded-2xl border-2 border-dashed border-pink-200">
                          <p className="text-[11px] text-pink-600 font-bold leading-relaxed mb-3">
                             <i className="fas fa-key mr-1"></i> <strong>API Token:</strong> Or use an Access Token to fetch your feed.
                          </p>
                          <div className="flex gap-2">
                             <input 
                               type="text" 
                               placeholder="Paste Access Token (e.g. IGQV...)"
                               value={igToken}
                               onChange={(e) => setIgToken(e.target.value)}
                               className="flex-1 bg-white border border-pink-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-pink-300 outline-none font-mono"
                             />
                             <button 
                               onClick={fetchInstagramFeed}
                               disabled={isFetchingIG}
                               className="bg-pink-500 text-white font-bold px-4 rounded-xl text-xs disabled:opacity-50"
                             >
                               {isFetchingIG ? <i className="fas fa-spinner fa-spin"></i> : 'Fetch'}
                             </button>
                          </div>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>

             <div className="bg-white/60 p-8 rounded-clay shadow-sm border border-white/20 flex flex-col gap-6">
                <label className="block text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">PHOTO ALBUMS</label>
                
                <div className="flex gap-3">
                   <input 
                     type="text" 
                     id="newAlbumInput"
                     placeholder="NEW ALBUM NAME..."
                     className="flex-1 bg-black/5 border border-transparent rounded-xl p-4 text-[11px] font-bold outline-none focus:border-black transition-all"
                   />
                   <button 
                     onClick={() => {
                       const input = document.getElementById('newAlbumInput') as HTMLInputElement;
                       if (input && input.value) {
                         addAlbum(input.value);
                         input.value = '';
                       }
                     }}
                     className="bg-black text-white px-6 rounded-pill font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-black/80 transition-all font-geist"
                   >
                     CREATE
                   </button>
                </div>

                <div className="flex flex-wrap gap-2">
                   {(localConfig.albums || []).map(album => (
                      <div key={album.id} className="bg-black/5 border border-black/5 rounded-pill px-4 py-2 flex items-center gap-3">
                         <span className="text-[10px] font-black text-black uppercase tracking-[0.1em] truncate max-w-[140px]">{album.name}</span>
                         <button onClick={() => deleteAlbum(album.id)} className="text-black/20 hover:text-black transition-colors bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                            <i className="fas fa-times text-[8px]"></i>
                         </button>
                      </div>
                   ))}
                   {(!localConfig.albums || localConfig.albums.length === 0) && (
                      <p className="text-[9px] text-black/20 font-black uppercase tracking-[0.1em] italic">No albums created yet.</p>
                   )}
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
                  border-2 border-dashed rounded-clay py-12 flex flex-col items-center justify-center gap-4 mb-8
                  ${isDraggingOver ? 'border-black bg-black/5' : 'border-black/5 hover:border-black/20 hover:bg-black/5'}
                `}
             >
                <div className={`p-6 rounded-full transition-all duration-500 ${isDraggingOver ? 'bg-black text-white scale-110 shadow-xl' : 'bg-black/5 text-black/20 group-hover:bg-black/10 group-hover:text-black'}`}>
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
                  <motion.div key={idx} layout className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 group relative aspect-[4/5] hover:shadow-md transition-shadow">
                    <div 
                      className="flex-1 w-full rounded-xl bg-gray-100 overflow-hidden relative cursor-zoom-in group/thumb"
                      onClick={() => {
                        const type = isAud ? 'audio' : isVid ? 'video' : 'image';
                        setPreviewItem({ url: item.url, type });
                      }}
                    >
                        {isAud ? (
                            <div className="absolute inset-0 flex items-center justify-center text-3xl text-orange-400">
                                <i className="fas fa-microphone"></i>
                            </div>
                        ) : isVid ? (
                            <div className="absolute inset-0 flex items-center justify-center text-3xl text-blue-400">
                                <i className="fas fa-video"></i>
                            </div>
                        ) : (
                            <img 
                              src={getPreviewUrl(item.url)} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" 
                              onError={(e) => (e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23fef2f2'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23f87171' font-size='12'%3EInvalid%3C/text%3E%3C/svg%3E")} 
                            />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
                           <i className="fas fa-search-plus text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity"></i>
                        </div>
                        {isIG && <div className="absolute inset-0 bg-pink-500/10 pointer-events-none" />}
                        {isIG && <div className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-tr from-yellow-400 to-purple-600 text-white flex items-center justify-center rounded-full text-[6px] shadow-sm"><i className="fab fa-instagram"></i></div>}
                    </div>

                    {/* Compact Controls */}
                    <div className="flex flex-col gap-1.5 px-1 pb-1">
                        <div className="flex items-center gap-1.5">
                            <div className="flex-1 min-w-0">
                               {/* Privacy Toggle as a tiny dot/icon */}
                               <button 
                                 onClick={(e) => { e.stopPropagation(); toggleGalleryPrivacy(idx); }}
                                 className={`w-full text-xs font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors ${item.privacy === 'public' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}
                               >
                                 <i className={`fas fa-${item.privacy === 'public' ? 'globe' : 'lock'} text-[9px]`}></i>
                                 <span className="text-[9px] uppercase tracking-wider">{item.privacy === 'public' ? 'Public' : 'Private'}</span>
                               </button>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeGalleryImage(idx); }}
                              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shrink-0"
                            >
                              <i className="fas fa-trash-alt text-[10px]"></i>
                            </button>
                        </div>
                        
                        {(localConfig.albums && localConfig.albums.length > 0) && (
                            <select
                               value={item.albumId || ''}
                               onChange={(e) => handleGalleryAlbumChange(idx, e.target.value || null)}
                               className="w-full text-[9px] font-bold text-gray-600 bg-gray-50 border border-gray-100 rounded-md p-1 outline-none focus:border-pink-200 truncate"
                            >
                               <option value="">No Album</option>
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
                   className="bg-black text-white text-[9px] font-black px-6 py-2 rounded-pill uppercase tracking-[0.2em] shadow-lg hover:bg-black/80 transition-all font-geist"
                 >
                   + NEW EVENT
                 </button>
              </div>


               {/* View Settings (Moved from Timeline Toolbar) */}
               <div className="bg-white/60 p-8 rounded-clay shadow-sm border border-white/20">
                  <h3 className="text-[10px] font-black text-black mb-8 flex items-center gap-3 uppercase tracking-[0.2em]">
                    <i className="fas fa-eye opacity-30"></i> VIEW SETTINGS
                  </h3>
                  
                  <label className="block text-[8px] font-black text-black/30 uppercase mb-4 tracking-[0.2em] ml-1">LAYOUT MODE</label>
                  <div className="flex bg-black/5 p-2 rounded-clay mb-8">
                        {([
                           { id: 'wave', label: 'WAVE', icon: 'fa-water' },
                           { id: 'vertical', label: 'VERTICAL', icon: 'fa-arrows-alt-v' }
                        ] as const).map((mode) => (
                           <button
                              key={mode.id}
                              onClick={() => handleInputChange('timelineLayoutMode', mode.id)}
                              className={`flex-1 py-4 px-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                                    (localConfig.timelineLayoutMode || 'wave') === mode.id 
                                    ? 'bg-white text-black shadow-xl scale-105' 
                                    : 'text-black/20 hover:text-black/40'
                              }`}
                           >
                              <i className={`fas ${mode.icon}`}></i> {mode.label}
                           </button>
                        ))}
                  </div>

                  <label className="block text-[8px] font-black text-black/30 uppercase mb-4 tracking-[0.2em] ml-1">ZOOM LEVEL</label>
                  <input 
                        type="range"
                        min="0"
                        max="7"
                        step="1"
                        value={localConfig.timelineZoomLevel || 0}
                        onChange={(e) => handleInputChange('timelineZoomLevel', parseInt(e.target.value))}
                        className="w-full h-2 bg-black/5 rounded-full appearance-none cursor-pointer accent-black"
                  />
                  <div className="flex justify-between text-[8px] font-black text-black/20 mt-3 uppercase tracking-[0.2em]">
                        <span>CLOSE</span>
                        <span>FAR</span>
                  </div>
               </div>


              {/* Timeline Display Settings */}
              <div className="bg-white/40 backdrop-blur-md p-8 rounded-clay border border-white/20 space-y-8">
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
                        className="w-full h-2 bg-black/5 rounded-full appearance-none cursor-pointer accent-black"
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
                        className="w-full h-2 bg-black/5 rounded-full appearance-none cursor-pointer accent-black"
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
                       className="bg-white p-4 rounded-clay shadow-sm border border-black/5 flex items-center gap-6 group hover:shadow-xl transition-all duration-500"
                    >
                       <div className="w-14 h-14 shrink-0 bg-black/5 rounded-xl overflow-hidden flex items-center justify-center border border-black/5 relative grayscale group-hover:grayscale-0 transition-all duration-700">
                           {item.media?.type === 'image' && <img src={item.media.url} className="w-full h-full object-cover" />}
                           {item.media?.type === 'video' && <i className="fas fa-video opacity-20"></i>}
                           {item.media?.type === 'audio' && <i className="fas fa-microphone opacity-20"></i>}
                           {!item.media && <i className="fas fa-sticky-note opacity-10"></i>}
                           
                           <label className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity z-10">
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
                                className="w-24 text-[10px] font-black text-black/20 bg-transparent outline-none p-0 cursor-pointer hover:text-black uppercase tracking-widest transition-colors"
                             />
                             <input 
                               type="text"
                               value={item.text}
                               onChange={(e) => handleTimelineChange(item.id, 'text', e.target.value)}
                               className="flex-1 text-[11px] font-black text-black bg-transparent outline-none truncate uppercase tracking-tight focus:bg-black/5 rounded-pill px-3 py-1"
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
                          className="w-10 h-10 flex items-center justify-center text-black/5 hover:text-black hover:bg-black/5 rounded-full transition-all shrink-0"
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
              <div className="bg-black/5 p-6 rounded-clay flex items-center justify-between border border-black/5 mb-8">
                 <div>
                    <p className="text-[10px] font-black text-black opacity-30 uppercase tracking-[0.2em] mb-1">STORY INTEGRATION</p>
                    <p className="text-[11px] font-black text-black uppercase tracking-tight">Show Redeemed on Timeline</p>
                 </div>
                 <button 
                   onClick={() => handleInputChange('showCouponsOnTimeline', !localConfig.showCouponsOnTimeline)}
                   className={`w-14 h-7 rounded-pill p-1.5 transition-all flex items-center ${localConfig.showCouponsOnTimeline ? 'bg-black justify-end' : 'bg-black/10 justify-start'}`}
                 >
                    <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-xl" />
                 </button>
              </div>

              <div className="flex justify-between items-center px-2">
                 <h3 className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.5em]">VOUCHERS & PERKS</h3>
                 <button 
                   onClick={addCoupon} 
                   className="bg-black text-white text-[9px] font-black px-6 py-2 rounded-pill uppercase tracking-[0.2em] shadow-lg hover:bg-black/80 transition-all"
                 >
                   + NEW VOUCHER
                 </button>
              </div>
              {localConfig.coupons.map(coupon => {
                 const isExpanded = expandedCouponId === coupon.id;
                 return (
                  <div 
                     key={coupon.id} 
                     className={`bg-white rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 ${isExpanded ? 'p-4 ring-2 ring-pink-100' : 'p-3 hover:shadow-md cursor-pointer'}`}
                     onClick={() => !isExpanded && setExpandedCouponId(coupon.id)}
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                           {coupon.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="font-black text-gray-800 truncate">{coupon.title}</h4>
                           <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                              <span className="bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded text-[10px] uppercase">{coupon.points || 0} PTS</span>
                              <span>•</span>
                              <span>{localConfig.partners[coupon.for || '']?.name || coupon.for || 'Partner'}</span>
                              {coupon.isRedeemed && <span className="text-red-400">• Redeemed</span>}
                           </div>
                        </div>
                        <button 
                           onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCouponId(isExpanded ? null : coupon.id);
                           }}
                           className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-pink-500 transition-colors"
                        >
                           <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
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
                                          className="w-16 text-center border rounded-xl p-2 text-2xl"
                                       />
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1">
                                       <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest pl-1">Title</label>
                                       <input 
                                          type="text" 
                                          value={coupon.title} 
                                          onChange={(e) => handleCouponChange(coupon.id, 'title', e.target.value)}
                                          className="w-full border-2 border-gray-100 rounded-xl p-3 font-black text-sm focus:border-purple-200 outline-none transition-all"
                                       />
                                    </div>
                                 </div>
                                 
                                 <div className="flex flex-col gap-1">
                                    <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest pl-1">Description</label>
                                    <input 
                                       type="text" 
                                       value={coupon.desc} 
                                       onChange={(e) => handleCouponChange(coupon.id, 'desc', e.target.value)}
                                       className="w-full border-2 border-gray-100 rounded-xl p-3 text-xs font-bold focus:border-purple-200 outline-none transition-all"
                                       placeholder="Coupon description..."
                                    />
                                 </div>

                                 <div className="flex gap-3">
                                    <div className="flex flex-col gap-1">
                                       <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest pl-1">Points</label>
                                       <input
                                          type="number"
                                          min="0"
                                          step="100"
                                          value={coupon.points || 0}
                                          onChange={(e) => handleCouponChange(coupon.id, 'points', parseInt(e.target.value))}
                                          className="w-24 border-2 border-gray-100 rounded-xl p-3 text-xs font-bold focus:border-purple-200 outline-none transition-all"
                                       />
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1">
                                       <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest pl-1">For Who?</label>
                                       <select 
                                          value={coupon.for} 
                                          onChange={(e) => handleCouponChange(coupon.id, 'for', e.target.value)}
                                          className="w-full text-xs font-black border rounded-xl p-3 bg-gray-50 uppercase"
                                       >
                                          {Object.entries(localConfig.partners || {}).map(([key, data]) => (
                                            <option key={key} value={key}>{data.name}</option>
                                          ))}
                                       </select>
                                    </div>
                                 </div>

                                 <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none group/toggle">
                                       <div 
                                          onClick={() => handleCouponChange(coupon.id, 'isRedeemed', !coupon.isRedeemed)}
                                          className={`w-8 h-4 rounded-full transition-all relative ${coupon.isRedeemed ? 'bg-red-500' : 'bg-gray-200'}`}
                                       >
                                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${coupon.isRedeemed ? 'left-4.5' : 'left-0.5'}`} />
                                       </div>
                                       <span className={`text-[9px] font-black uppercase tracking-widest ${coupon.isRedeemed ? 'text-red-500' : 'text-gray-400'}`}>
                                          {coupon.isRedeemed ? 'Redeemed' : 'Unused'}
                                       </span>
                                    </label>

                                    <button 
                                       onClick={(e) => {
                                          if (window.confirm("Delete this coupon?")) {
                                             updateLocal(prev => ({ ...prev, coupons: prev.coupons.filter(c => c.id !== coupon.id) }));
                                          }
                                       }}
                                       className="text-[9px] font-black text-red-400 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                    >
                                       Delete Coupon
                                    </button>
                                 </div>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </div>
                 );
              })}
            </motion.div>
        )}

        {activeTab === 'world' && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

             {/* AppKit Circles / World Selector */}
             {circles.length > 0 && (
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                 <h3 className="font-black text-gray-700 uppercase text-[11px] tracking-widest">
                   <i className="fas fa-globe text-pink-500 mr-2"></i>Your Circles (Worlds)
                 </h3>
                 {circles.map(circle => (
                   <div key={circle.id} className={`flex items-center justify-between p-3 rounded-xl border ${circle.id === activeCircleId ? 'border-pink-300 bg-pink-50' : 'border-gray-100 bg-white'}`}>
                     <div>
                       <p className="text-xs font-bold text-gray-700">{circle.name}</p>
                       <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-[160px]">{circle.id}</p>
                     </div>
                     <div className="flex items-center gap-2">
                       <button
                         onClick={() => { navigator.clipboard.writeText(circle.id); }}
                         title="Copy world code"
                         className="text-gray-300 hover:text-pink-400 transition-colors"
                       >
                         <i className="fas fa-copy text-xs"></i>
                       </button>
                       {circle.id !== activeCircleId && (
                         <button
                           onClick={() => setActiveCircle(circle.id)}
                           className="text-xs bg-pink-500 text-white px-2 py-1 rounded-lg font-bold hover:bg-pink-600 transition-colors"
                         >
                           Switch
                         </button>
                       )}
                       {circle.id === activeCircleId && (
                         <span className="text-xs bg-pink-100 text-pink-500 px-2 py-1 rounded-lg font-bold">Active</span>
                       )}
                     </div>
                   </div>
                 ))}
                 <p className="text-[10px] text-gray-400 mt-1">
                   Share your World Code with your partner so they can join the same world.
                 </p>
               </div>
             )}

             <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex justify-between items-center px-1 mb-2">
                   <h3 className="font-black text-gray-700 uppercase text-[11px] tracking-widest"><i className="fas fa-globe-asia text-emerald-500 mr-2"></i>My Lands</h3>
                   <div className="bg-emerald-50 text-emerald-500 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">{localConfig.lands?.length || 0} Lands</div>
                </div>

                <div className="flex gap-2">
                   <input 
                     type="text" 
                     id="newLandInput"
                     placeholder="New World Name..."
                     className="flex-1 border-2 border-gray-50 rounded-2xl p-3 text-xs font-bold outline-none focus:border-emerald-200"
                   />
                   <button 
                     onClick={() => {
                       const input = document.getElementById('newLandInput') as HTMLInputElement;
                       if (input && input.value) {
                         addLand(input.value);
                         input.value = '';
                       }
                     }}
                     className="bg-emerald-500 text-white px-4 rounded-2xl font-black text-xs shadow-md hover:bg-emerald-600 transition-colors"
                   >
                     Create
                   </button>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                   {(localConfig.lands || []).map(land => (
                      <div key={land.id} className={`border rounded-xl p-3 flex items-center justify-between gap-2 transition-all ${land.isActive ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-gray-100 bg-white'}`}>
                         <div className="flex items-center gap-3">
                           <button 
                              onClick={() => toggleLandActive(land.id)}
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${land.isActive ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-transparent hover:bg-emerald-100'}`}
                           >
                              <i className="fas fa-check text-[10px]"></i>
                           </button>
                           <span className={`text-xs font-bold ${land.isActive ? 'text-emerald-700' : 'text-gray-600'}`}>{land.name}</span>
                         </div>
                         <button onClick={() => deleteLand(land.id)} className="text-gray-300 hover:text-red-500 transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50">
                            <i className="fas fa-trash-alt text-[10px]"></i>
                         </button>
                      </div>
                   ))}
                   {(!localConfig.lands || localConfig.lands.length === 0) && (
                      <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                         <i className="fas fa-globe-americas text-2xl text-gray-300 mb-2"></i>
                         <p className="text-xs font-bold text-gray-400">No worlds created yet.</p>
                      </div>
                   )}
                </div>
             </div>
           </motion.div>
        )}

        {activeTab === 'objects' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <i className="fas fa-cube text-pink-400"></i> Object Library
                </h3>
                <label className="cursor-pointer bg-pink-500 text-white hover:bg-pink-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md">
                  <i className="fas fa-upload mr-2"></i> Upload Model
                  <input 
                    type="file" 
                    accept=".glb,.gltf" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      try {
                        const url = await uploadAPI.upload(file);
                        // Add to a "Custom Models" inventory or similar logic
                        alert(`Successfully uploaded ${file.name}! It is now available in your Custom models.`);
                      } catch (err) {
                        alert('Upload failed. Please try again.');
                      }
                    }} 
                  />
                </label>
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'all', label: 'All', icon: 'fa-border-all' },
                  { id: 'pet', label: 'Pets', icon: 'fa-paw' },
                  { id: 'deco', label: 'Decor', icon: 'fa-palette' },
                  { id: 'bldg', label: 'Buildings', icon: 'fa-home' },
                  { id: 'custom', label: 'Custom', icon: 'fa-box-open' },
                ] as const).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setObjectCategoryFilter(cat.id)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
                      objectCategoryFilter === cat.id
                        ? 'bg-pink-500 text-white border-pink-500 shadow-md'
                        : 'bg-white text-gray-400 border-gray-100 hover:border-pink-200'
                    }`}
                  >
                    <i className={`fas ${cat.icon}`}></i>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Object Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {SHOP_ITEMS.filter(item => 
                  objectCategoryFilter === 'all' || 
                  item.type.startsWith(objectCategoryFilter) ||
                  (objectCategoryFilter === 'custom' && item.type === 'custom_3d')
                ).map((item) => (
                  <div key={item.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center gap-3 group hover:border-pink-200 transition-all">
                    <div className="text-3xl bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-800">{item.name}</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{item.type}</p>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-[10px]">
                      <i className="fas fa-coins text-[8px]"></i>
                      {item.price}
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
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-2xl transition-all"
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
                   className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                   alt="Preview"
                 />
               )}
               {previewItem.type === 'video' && (
                 <video 
                   src={previewItem.url} 
                   className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                   controls
                   autoPlay
                 />
               )}
               {previewItem.type === 'audio' && (
                 <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 min-w-[300px]">
                    <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-4xl">
                      <i className="fas fa-microphone"></i>
                    </div>
                    <audio src={previewItem.url} controls className="w-full" />
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Audio Memory</p>
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
