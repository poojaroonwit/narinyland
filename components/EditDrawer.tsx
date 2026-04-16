"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Interaction, MemoryItem, AppConfig, Emotion } from '../types';
import { uploadAPI, circlesAPI } from '../services/api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { SHOP_ITEMS, ShopItem } from './Shop';
import { useAuth } from './AuthProvider';

interface EditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  partners?: {
    partner1: { name: string; avatar: string };
    partner2: { name: string; avatar: string };
  };
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  onSave?: () => void;
}

const EditDrawer: React.FC<EditDrawerProps> = ({ isOpen, onClose, config, partners, setConfig, onSave }) => {
  const { circles, activeCircleId, setActiveCircle } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'proposal' | 'gallery' | 'timeline' | 'coupons' | 'world' | 'objects'>('general');
  const [isMobile, setIsMobile] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>('general');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // World (Circle) management state
  const [newWorldName, setNewWorldName] = useState('');
  const [editingCircleId, setEditingCircleId] = useState<string | null>(null);
  const [editingCircleName, setEditingCircleName] = useState('');
  const [isCircleUpdating, setIsCircleUpdating] = useState(false);

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

  const handlePartnerChange = (partnerId: 'partner1' | 'partner2', field: 'name' | 'avatar', value: string) => {
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

  const handleCreateWorld = async () => {
    if (!newWorldName.trim()) return;
    setIsCircleUpdating(true);
    try {
      const res = await circlesAPI.create({ name: newWorldName.trim() });
      setNewWorldName('');
      await refreshUser();
      alert('World created successfully!');
    } catch (err: any) {
      alert(`Failed to create world: ${err.message}`);
    } finally {
      setIsCircleUpdating(false);
    }
  };

  const handleUpdateWorld = async (id: string) => {
    if (!editingCircleName.trim()) return;
    setIsCircleUpdating(true);
    try {
      await circlesAPI.update(id, { name: editingCircleName.trim() });
      setEditingCircleId(null);
      await refreshUser();
    } catch (err: any) {
      alert(`Failed to update world: ${err.message}`);
    } finally {
      setIsCircleUpdating(false);
    }
  };

  const handleDeleteWorld = async (id: string, name: string) => {
    if (!id || id === 'undefined') {
      alert('Cannot delete this world: Invalid ID.');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${name}"? This will permanently remove all associated Narinyland data (memories, letters, etc.) for this world.`)) return;
    
    setIsCircleUpdating(true);
    try {
      await circlesAPI.delete(id);
      await refreshUser();
      if (id === activeCircleId) {
        // We'll be redirected or switched by refreshUser logic if remaining circles exist
        window.location.reload(); 
      }
    } catch (err: any) {
      alert(`Failed to delete world: ${err.message}`);
    } finally {
      setIsCircleUpdating(false);
    }
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

  const renderTabContent = (tab: 'general' | 'proposal' | 'gallery' | 'timeline' | 'coupons' | 'world' | 'objects') => {
    switch (tab) {
      case 'general':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fas fa-info-circle text-pink-400"></i> Core Setup
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">World Name</label>
                    <p className="text-[8px] text-gray-400 ml-1">The title of your magical space</p>
                  </div>
                  <input 
                    type="text" 
                    value={localConfig.appName} 
                    onChange={(e) => handleInputChange('appName', e.target.value)}
                    className="w-1/2 bg-gray-50 border-2 border-gray-100 rounded-md p-3 text-xs font-bold outline-none focus:border-pink-200 transition-all text-right"
                  />
                </div>

                <div className="flex justify-between items-center gap-4 pt-2">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Proposal Feature</label>
                    <p className="text-[8px] text-gray-400 ml-1">Show or hide the proposal screen</p>
                  </div>
                  <button
                    onClick={() => handleInputChange('showProposal', !localConfig.showProposal)}
                    className={`w-12 h-6 rounded-full transition-all relative ${localConfig.showProposal ? 'bg-pink-500' : 'bg-gray-200'}`}
                  >
                    <motion.div 
                      animate={{ x: localConfig.showProposal ? 24 : 4 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
                <div className="flex justify-between items-center gap-4 pt-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Anniversary</label>
                  <div className="w-1/2 text-right">
                    <DatePicker
                      selected={new Date(localConfig.anniversaryDate || Date.now())}
                      onChange={(date: Date | null) => date && handleInputChange('anniversaryDate', date.toISOString())}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-md p-3 text-xs font-bold outline-none focus:border-pink-200 transition-all text-right"
                    />
                  </div>
                </div>
                
                {/* PWA / App Identity */}
                <div className="bg-pink-50/30 p-4 rounded-md border border-pink-100 space-y-4">
                  <h4 className="text-xs font-black text-pink-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-mobile-alt"></i> App Identity & PWA
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">App Name (Long)</label>
                       <input 
                         type="text" 
                         value={localConfig.pwaName || localConfig.appName || ''} 
                         onChange={(e) => handleInputChange('pwaName', e.target.value)}
                         className="w-full border border-gray-200 rounded-md p-2 text-xs font-bold outline-none focus:border-pink-300"
                         placeholder="Narinyland"
                       />
                     </div>
                     <div>
                       <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Short Name</label>
                       <input 
                         type="text" 
                         value={localConfig.pwaShortName || ''} 
                         onChange={(e) => handleInputChange('pwaShortName', e.target.value)}
                         className="w-full border border-gray-200 rounded-md p-2 text-xs font-bold outline-none focus:border-pink-300"
                         placeholder="Nariny"
                       />
                     </div>
                  </div>
                  <div>
                     <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Description</label>
                     <input 
                       type="text" 
                       value={localConfig.pwaDescription || ''} 
                       onChange={(e) => handleInputChange('pwaDescription', e.target.value)}
                       className="w-full border border-gray-200 rounded-md p-2 text-xs font-bold outline-none focus:border-pink-300"
                       placeholder="Our magical world..."
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Theme Color</label>
                       <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md p-1.5 pl-3">
                          <input 
                            type="color" 
                            value={localConfig.pwaThemeColor || '#ec4899'} 
                            onChange={(e) => handleInputChange('pwaThemeColor', e.target.value)}
                            className="w-6 h-6 rounded-full border-none cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-gray-500">{localConfig.pwaThemeColor || '#ec4899'}</span>
                       </div>
                     </div>
                     <div>
                       <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Background Color</label>
                       <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md p-1.5 pl-3">
                          <input 
                            type="color" 
                            value={localConfig.pwaBackgroundColor || '#ffffff'} 
                            onChange={(e) => handleInputChange('pwaBackgroundColor', e.target.value)}
                            className="w-6 h-6 rounded-full border-none cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-gray-500">{localConfig.pwaBackgroundColor || '#ffffff'}</span>
                       </div>
                     </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">App Icon (512x512)</label>
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                          {localConfig.pwaIconUrl ? (
                            <img src={localConfig.pwaIconUrl} alt="App Icon" className="w-full h-full object-cover" />
                          ) : (
                            <i className="fas fa-mobile text-2xl text-gray-300"></i>
                          )}
                       </div>
                       <label className="cursor-pointer bg-white border border-pink-200 text-pink-500 hover:bg-pink-50 px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all shadow-sm">
                          {isUploading === 999 ? 'Uploading...' : 'Upload Icon'}
                          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && handlePwaIconUpload(e.target.files[0])} />
                       </label>
                       {localConfig.pwaIconUrl && (
                          <button onClick={() => handleInputChange('pwaIconUrl', null)} className="text-red-400 hover:text-red-500 text-xs px-2">
                             <i className="fas fa-trash"></i>
                          </button>
                       )}
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Music Playlist (One URL per line) 🎵</label>
                    <textarea 
                      value={(localConfig.musicPlaylist || []).join('\n')} 
                      onChange={(e) => handleInputChange('musicPlaylist', e.target.value.split('\n'))}
                      className="w-full border-2 border-gray-50 rounded-md p-4 text-xs font-bold text-gray-600 focus:border-pink-200 outline-none transition-colors h-24 resize-none"
                      placeholder="https://youtube.com/watch?v=...&#10;https://youtube.com/watch?v=..." 
                    />
                  </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Anniversary</label>
                    <DatePicker
                      selected={localConfig.anniversaryDate ? new Date(localConfig.anniversaryDate) : null}
                      onChange={(date: Date | null) => handleInputChange('anniversaryDate', date ? date.toISOString() : '')}
                      dateFormat="MMMM d, yyyy"
                      className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Forest Style</label>
                    <select 
                      value={localConfig.treeStyle} 
                      onChange={(e) => handleInputChange('treeStyle', e.target.value)}
                      className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none bg-white"
                    >
                      <option value="oak">Classic Oak 🌳</option>
                      <option value="sakura">Sakura 🌸</option>
                      <option value="neon">Neon 🔮</option>
                      <option value="midnight">Midnight Magic ✨</option>
                      <option value="frozen">Frozen ❄️</option>
                      <option value="golden">Golden ☀️</option>
                    </select>
                  </div>
                  <div className="col-span-2 border-t pt-4 mt-2">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] font-black text-pink-500 uppercase tracking-widest ml-1">Dynamic Pets Management</label>
                      <button 
                        onClick={addPet}
                        className="bg-pink-100 text-pink-600 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest hover:bg-pink-200 transition-all"
                      >
                        + Add Pet
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Show old single pet if pets array is empty */}
                      {(!localConfig.pets || localConfig.pets.length === 0) && (
                        <div className="p-4 bg-gray-50 rounded-md border border-gray-100 flex items-center gap-4">
                           <div className="flex-1">
                              <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Primary Pet Type</label>
                              <select 
                                value={localConfig.petType || 'cat'} 
                                onChange={(e) => handleInputChange('petType', e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-md p-2 text-xs font-bold outline-none"
                              >
                                <option value="cat">Fluffy Cat 🐱</option>
                                <option value="dog">Loyal Dog 🐶</option>
                                <option value="rabbit">Soft Rabbit 🐰</option>
                                <option value="panda">Chubby Panda 🐼</option>
                                <option value="fox">Red Fox 🦊</option>
                              </select>
                           </div>
                           <p className="text-[9px] text-gray-400 italic max-w-[120px]">This is your legacy pet. Add more to go dynamic! ✨</p>
                        </div>
                      )}

                      {/* Render Multiple Pets */}
                      {(localConfig.pets || []).map((pet, idx) => (
                        <motion.div 
                          key={pet.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-4 bg-pink-50/30 rounded-md border border-pink-100 flex items-center gap-3"
                        >
                          <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center text-xl shadow-sm border border-pink-50">
                            {pet.type === 'cat' && '🐱'}
                            {pet.type === 'dog' && '🐶'}
                            {pet.type === 'rabbit' && '🐰'}
                            {pet.type === 'panda' && '🐼'}
                            {pet.type === 'fox' && '🦊'}
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-2">
                             <div>
                                <label className="block text-[7px] font-black text-pink-400 uppercase mb-0.5">Pet Name</label>
                                <input 
                                  type="text"
                                  value={pet.name || ''}
                                  onChange={(e) => handlePetChange(pet.id, 'name', e.target.value)}
                                  className="w-full bg-white border border-pink-50 rounded-md p-1.5 text-[10px] font-bold outline-none"
                                  placeholder="Name..."
                                />
                             </div>
                             <div>
                                <label className="block text-[7px] font-black text-pink-400 uppercase mb-0.5">Animal Type</label>
                                <select 
                                  value={pet.type} 
                                  onChange={(e) => handlePetChange(pet.id, 'type', e.target.value)}
                                  className="w-full bg-white border border-pink-50 rounded-md p-1.5 text-[10px] font-bold outline-none"
                                >
                                  <option value="cat">Cat 🐱</option>
                                  <option value="dog">Dog 🐶</option>
                                  <option value="rabbit">Rabbit 🐰</option>
                                  <option value="panda">Panda 🐼</option>
                                  <option value="fox">Fox 🦊</option>
                                </select>
                             </div>
                          </div>
                          <button 
                            onClick={() => removePet(pet.id)}
                            className="w-8 h-8 flex items-center justify-center text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                          >
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Sky Time</label>
                    <select 
                      value={localConfig.skyMode || 'follow_timezone'} 
                      onChange={(e) => handleInputChange('skyMode', e.target.value)}
                      className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none bg-white"
                    >
                      <option value="follow_timezone">Device Timezone 🕒</option>
                      <option value="noon">Always Noon ☀️</option>
                      <option value="night">Always Night 🌙</option>
                    </select>
                  </div>
                  <div className="col-span-2 bg-pink-50/30 p-4 rounded-md flex items-center justify-between border border-pink-50">
                     <div>
                        <p className="text-xs font-bold text-gray-800 flex items-center gap-2 italic">
                           <i className="fas fa-qrcode text-pink-500"></i> Show Mobile Upload QR
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 ml-6">Floating QR code at bottom-left</p>
                     </div>
                     <button 
                       onClick={() => handleInputChange('showQRCode', !localConfig.showQRCode)}
                       className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${localConfig.showQRCode ? 'bg-pink-500 justify-end' : 'bg-gray-200 justify-start'}`}
                     >
                        <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                     </button>
                  </div>

                  <div className="col-span-2 mt-2">
                     <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Graphics Quality</label>
                     <select 
                       value={localConfig.graphicsQuality || 'medium'} 
                       onChange={(e) => handleInputChange('graphicsQuality', e.target.value)}
                       className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none bg-white font-bold text-sm"
                     >
                       <option value="low">Low (Fastest) ⚡</option>
                       <option value="medium">Medium (Balanced) ⚖️</option>
                       <option value="high">High (Best Visuals) ✨</option>
                     </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100">
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
                         className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none bg-white font-bold text-xs"
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
                      className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Days per Flower</label>
                    <input 
                      type="number" 
                      value={localConfig.daysPerFlower || 7} 
                      onChange={(e) => handleInputChange('daysPerFlower', parseInt(e.target.value))}
                      className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <i className="fas fa-user-friends text-blue-400"></i> The Couple
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                 <i className="fas fa-sync-alt animate-spin-slow text-green-500"></i> Synchronized with World Members
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 opacity-80">
                   <h4 className="text-[10px] font-black text-pink-500 uppercase border-b pb-1">Profile 1</h4>
                   <div className="w-full border rounded-md p-3 text-sm bg-gray-50 flex items-center gap-2">
                      <span className="text-lg">{partners?.partner1.avatar}</span>
                      <span className="font-bold text-gray-700">{partners?.partner1.name}</span>
                   </div>
                </div>
                <div className="space-y-3 opacity-80">
                   <h4 className="text-[10px] font-black text-blue-500 uppercase border-b pb-1">Profile 2</h4>
                   <div className="w-full border rounded-md p-3 text-sm bg-gray-50 flex items-center gap-2">
                      <span className="text-lg">{partners?.partner2.avatar}</span>
                      <span className="font-bold text-gray-700">{partners?.partner2.name}</span>
                   </div>
                </div>
               </div>
               <p className="text-[9px] text-gray-400 mt-4 leading-relaxed italic">
                 * Names and avatars are pulled directly from the Circle members. If you are alone, a placeholder is shown.
               </p>
             </div>
           </motion.div>
         );
       case 'proposal':
         return (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                   <i className="fas fa-heart text-red-400"></i> Proposal Flow
                 </h3>
                 <button 
                   onClick={addProposalQuestion}
                   className="bg-red-50 text-red-500 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                 >
                   + Add Step
                 </button>
               </div>
               
               <div className="space-y-4">
                 {localConfig.proposal.questions.map((q, idx) => (
                   <div key={idx} className="relative group">
                     <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">
                       Step {idx + 1}
                     </label>
                     <div className="flex gap-2">
                       <input 
                         type="text"
                         value={q}
                         onChange={(e) => updateProposalQuestion(idx, e.target.value)}
                         className={`flex-1 bg-gray-50 border-2 rounded-md p-3 text-xs font-bold outline-none transition-all ${localConfig.proposal.progress === idx ? 'border-red-200 bg-red-50/30' : 'border-gray-100 focus:border-red-100'}`}
                         placeholder="Question text..."
                       />
                       <button 
                         onClick={() => setProposalProgress(idx)}
                         className={`w-10 h-10 rounded-md flex items-center justify-center transition-all ${localConfig.proposal.progress === idx ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:text-red-400 hover:bg-red-50'}`}
                         title="Set as current active step"
                       >
                         <i className="fas fa-flag-checkered text-xs"></i>
                       </button>
                       <button 
                         onClick={() => removeProposalQuestion(idx)}
                         className="w-10 h-10 bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                       >
                          <i className="fas fa-trash-alt text-xs"></i>
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
 
               <div className="mt-6 p-4 bg-red-50 rounded-md border border-red-100">
                 <h4 className="text-[10px] font-black text-red-500 uppercase flex items-center gap-2 mb-2">
                   <i className="fas fa-info-circle"></i> Final Confirmation
                 </h4>
                 <div className="space-y-3">
                   <div>
                     <label className="block text-[8px] font-black text-gray-400 uppercase mb-1 ml-1">Wording (e.g. Will you marry me?)</label>
                     <input 
                       type="text"
                       value={localConfig.proposal.finalWording}
                       onChange={(e) => handleInputChange('proposal', { ...localConfig.proposal, finalWording: e.target.value })}
                       className="w-full bg-white border border-red-100 rounded-md p-2 text-xs font-bold outline-none"
                     />
                   </div>
                   <div className="flex items-center gap-3 pt-1">
                     <label className="text-[8px] font-black text-gray-400 uppercase">Is Accepted?</label>
                     <button 
                       onClick={() => handleInputChange('proposal', { ...localConfig.proposal, isAccepted: !localConfig.proposal.isAccepted })}
                       className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${localConfig.proposal.isAccepted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}
                     >
                       {localConfig.proposal.isAccepted ? 'Yes! 🎉' : 'No'}
                     </button>
                   </div>
                 </div>
               </div>
               <p className="text-[9px] text-gray-400 mt-4 leading-relaxed italic">
                 The user can only accept your proposal. Each "Yes" leads to the next question until the final acceptance!
               </p>
             </div>
           </motion.div>
         );
       case 'gallery':
         return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Gallery Interaction</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-pink-50/50 p-4 rounded-md border border-pink-100 flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black text-gray-700 uppercase">3D Physics Flow</p>
                        <p className="text-[8px] text-gray-400">Apply floating effect</p>
                     </div>
                     <button 
                        onClick={() => handleInputChange('galleryPhysicsEnabled', !localConfig.galleryPhysicsEnabled)}
                        className={`w-10 h-5 rounded-full p-1 transition-all flex items-center ${localConfig.galleryPhysicsEnabled ? 'bg-pink-500 justify-end' : 'bg-gray-200 justify-start'}`}
                     >
                        <motion.div layout className="w-3 h-3 bg-white rounded-full shadow-sm" />
                     </button>
                  </div>
                  <div className="bg-amber-50/50 p-4 rounded-md border border-amber-100 flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black text-gray-700 uppercase">Auto-Slide Time</p>
                        <p className="text-[8px] text-gray-400">Interval in seconds</p>
                     </div>
                     <input 
                        type="number" 
                        min="2" 
                        max="30"
                        value={localConfig.galleryInterval || 5} 
                        onChange={(e) => handleInputChange('galleryInterval', parseInt(e.target.value))}
                        className="w-12 bg-white border border-amber-200 rounded-md p-1.5 text-xs font-bold outline-none text-center"
                     />
                  </div>
                </div>
             </div>

             <div className="space-y-4">
               {/* Albums Management */}
               <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <i className="fas fa-folder-open text-amber-400"></i> Photo Albums
                    </h3>
                    <button 
                      onClick={() => {
                        const name = prompt("Enter album name:");
                        if (name) addAlbum(name);
                      }}
                      className="bg-amber-50 text-amber-600 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-amber-100 hover:bg-amber-100"
                    >
                      + Create Album
                    </button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {localConfig.albums?.map(album => (
                      <div key={album.id} className="bg-amber-50/30 px-3 py-2 rounded-md border border-amber-100 flex items-center gap-3">
                         <span className="text-xs font-bold text-gray-700">{album.name}</span>
                         <span className="text-[8px] bg-amber-100 text-amber-600 px-1 rounded-full font-black">
                           {localConfig.gallery.filter(item => item.albumId === album.id).length}
                         </span>
                         <button onClick={() => deleteAlbum(album.id)} className="text-red-300 hover:text-red-500 transition-colors">
                           <i className="fas fa-times text-[10px]"></i>
                         </button>
                      </div>
                    ))}
                    {(localConfig.albums?.length || 0) === 0 && <p className="text-[10px] text-gray-400 italic">No albums created yet</p>}
                 </div>
               </div>

               {/* Instagram Import */}
               <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-6 rounded-md shadow-lg text-white space-y-4">
                 <div className="flex items-center gap-3">
                    <i className="fab fa-instagram text-3xl"></i>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wider">Instagram Import</h4>
                      <p className="text-[9px] text-white/70 uppercase font-bold tracking-widest">Connect your digital life</p>
                    </div>
                 </div>
                 
                 <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                       <label className="text-[9px] font-black text-white/60 uppercase tracking-widest ml-1">Method A: Public Profile (No Login)</label>
                       <div className="flex gap-2">
                         <div className="flex-1 bg-white/20 rounded-md flex items-center px-3 gap-2 border border-white/30 focus-within:bg-white/30 transition-all">
                           <span className="text-white/40 text-sm">@</span>
                           <input 
                             type="text" 
                             value={localConfig.instagramUsername || ''} 
                             onChange={(e) => handleInputChange('instagramUsername', e.target.value)}
                             className="flex-1 bg-transparent py-3 text-xs font-bold placeholder:text-white/40 outline-none"
                             placeholder="username"
                           />
                         </div>
                         <button 
                           onClick={fetchInstagramProfile}
                           disabled={isFetchingIG || !localConfig.instagramUsername}
                           className="bg-white text-purple-600 px-4 rounded-md font-black text-[10px] uppercase shadow-md disabled:opacity-50 hover:bg-purple-50 transition-all"
                         >
                           {isFetchingIG ? '...' : 'Fetch'}
                         </button>
                       </div>
                    </div>

                    <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
                       <label className="text-[9px] font-black text-white/60 uppercase tracking-widest ml-1">Method B: Access Token (Bulk)</label>
                       <div className="flex gap-2">
                         <input 
                           type="password" 
                           value={igToken} 
                           onChange={(e) => setIgToken(e.target.value)}
                           className="flex-1 bg-white/20 border border-white/30 rounded-md p-3 text-xs font-bold placeholder:text-white/40 outline-none focus:bg-white/30"
                           placeholder="IG Access Token..."
                         />
                         <button 
                           onClick={fetchInstagramFeed}
                           disabled={isFetchingIG || !igToken}
                           className="bg-white text-pink-600 px-4 rounded-md font-black text-[10px] uppercase shadow-md disabled:opacity-50 hover:bg-pink-50 transition-all"
                         >
                           Import
                         </button>
                       </div>
                    </div>
                    {igProfileResult && <p className={`text-[10px] font-bold p-2 rounded-md ${igProfileResult.startsWith('❌') ? 'bg-red-500/20' : 'bg-green-500/20'}`}>{igProfileResult}</p>}
                 </div>
               </div>

               <div className="flex justify-between items-center px-1">
                 <h3 className="font-black text-gray-700 uppercase text-[11px] tracking-widest">Memory Grid</h3>
                 <div className="flex gap-2">
                   <button onClick={addGalleryImage} className="bg-pink-500 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-md">+ Add Image</button>
                   <label className="cursor-pointer bg-white text-pink-500 border border-pink-200 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-sm hover:bg-pink-50 transition-all">
                      Upload Files
                      <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files && handleMultiFileUpload(e.target.files)} />
                   </label>
                 </div>
               </div>

               {/* Bulk Drop Zone */}
               <div 
                 onDragOver={handleDragOver}
                 onDragLeave={handleDragLeave}
                 onDrop={handleDrop}
                 className={`w-full py-10 rounded-md border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${isDraggingOver ? 'bg-pink-50 border-pink-400 text-pink-500' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
               >
                  <i className={`fas fa-cloud-upload-alt text-4xl ${isDraggingOver ? 'animate-bounce' : 'opacity-20'}`}></i>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em]">Drop many photos to upload in bulk</p>
                  <p className="text-[9px] opacity-60">or click the button above</p>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                 {localConfig.gallery.map((item, idx) => (
                   <motion.div 
                     layout
                     key={idx} 
                     initial={{ opacity: 0, scale: 0.9 }} 
                     animate={{ opacity: 1, scale: 1 }}
                     className="bg-white p-3 rounded-md shadow-sm border border-gray-100 space-y-3 relative group"
                   >
                     <div className="w-full aspect-square bg-gray-50 rounded-md overflow-hidden relative border border-gray-100">
                        {isVideo(item.url) ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50/30">
                             <i className="fas fa-video text-2xl text-blue-300"></i>
                             <p className="text-[8px] font-black text-blue-400 uppercase mt-1">Video File</p>
                          </div>
                        ) : (
                          <img 
                            src={getPreviewUrl(item.url)} 
                            alt={`Gallery ${idx}`} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-110 cursor-zoom-in" 
                            onClick={() => setPreviewItem({ url: getPreviewUrl(item.url), type: 'image' })}
                          />
                        )}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button 
                             onClick={() => toggleGalleryPrivacy(idx)}
                             title={item.privacy === 'public' ? 'Public' : 'Private'}
                             className={`w-6 h-6 rounded-md backdrop-blur-md flex items-center justify-center text-[10px] transition-all ${item.privacy === 'public' ? 'bg-emerald-500/80 text-white' : 'bg-red-500/80 text-white'}`}
                          >
                             <i className={`fas ${item.privacy === 'public' ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                          </button>
                        </div>

                        {/* Hover Tools Overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform flex justify-between gap-1 items-center">
                           <label className="cursor-pointer bg-white/20 hover:bg-white/40 text-white p-1.5 rounded-md transition-all flex-1 text-center">
                              <i className="fas fa-camera text-[10px]"></i>
                              <input type="file" className="hidden" accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(idx, e.target.files[0])} />
                           </label>
                           <button onClick={() => removeGalleryImage(idx)} className="bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-md transition-all flex-1">
                              <i className="fas fa-trash text-[10px]"></i>
                           </button>
                        </div>

                        {isUploading === idx && (
                          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                             <i className="fas fa-circle-notch animate-spin text-pink-500"></i>
                          </div>
                        )}
                     </div>
                     <div className="space-y-2">
                        <input 
                           type="text" 
                           value={item.url} 
                           onChange={(e) => handleGalleryUrlChange(idx, e.target.value)}
                           className="w-full bg-gray-50 border border-gray-100 rounded-md p-2 text-[8px] font-mono text-gray-500 outline-none focus:border-pink-200"
                           placeholder="Direct image/video URL..."
                        />
                        <div>
                           <label className="block text-[8px] font-black text-gray-400 uppercase mb-1 ml-0.5">Assign to Album</label>
                           <select
                             value={item.albumId || ''}
                             onChange={(e) => handleGalleryAlbumChange(idx, e.target.value || null)}
                             className="w-full bg-white border border-gray-200 rounded-md p-1.5 text-[9px] font-bold outline-none"
                           >
                             <option value="">No Album</option>
                             {localConfig.albums?.map(album => (
                               <option key={album.id} value={album.id}>{album.name}</option>
                             ))}
                           </select>
                        </div>
                     </div>
                   </motion.div>
                 ))}
               </div>
             </div>
          </motion.div>
        );
      case 'timeline':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex justify-between items-center px-1">
                 <h3 className="font-black text-gray-700 uppercase text-[11px] tracking-widest">Our Story</h3>
                 <button onClick={addTimelineEvent} className="bg-pink-500 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-md">+ New Event</button>
              </div>

               {/* View Settings (Moved from Timeline Toolbar) */}
               <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <i className="fas fa-eye text-blue-400"></i> View Settings
                  </h3>
                  
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Layout Mode</label>
                  <div className="flex bg-gray-100 p-1 rounded-md mb-4">
                        {([
                           { id: 'wave', label: 'Wave', icon: 'fa-water' },
                           { id: 'vertical', label: 'Vertical', icon: 'fa-arrows-alt-v' }
                        ] as const).map((mode) => (
                           <button
                              key={mode.id}
                              onClick={() => handleInputChange('timelineLayoutMode', mode.id)}
                              className={`flex-1 py-3 px-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                                    (localConfig.timelineLayoutMode || 'wave') === mode.id 
                                    ? 'bg-white text-pink-500 shadow-md' 
                                    : 'text-gray-400 hover:text-gray-600'
                              }`}
                           >
                              <i className={`fas ${mode.icon}`}></i> {mode.label}
                           </button>
                        ))}
                  </div>

                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Zoom Level</label>
                  <input 
                        type="range"
                        min="0"
                        max="7"
                        step="1"
                        value={localConfig.timelineZoomLevel || 0}
                        onChange={(e) => handleInputChange('timelineZoomLevel', parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-md appearance-none cursor-pointer accent-pink-500"
                  />
                  <div className="flex justify-between text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                        <span>Close</span>
                        <span>Far</span>
                  </div>
               </div>

              {/* Timeline Display Settings */}
              <div className="bg-gray-50/50 p-4 rounded-md border border-gray-100 space-y-4">
                 <div className="space-y-2">
                     <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Card Sizing (Desktop)</p>
                        <span className="text-pink-500 font-bold text-[10px]">
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
                        className="w-full h-1.5 bg-gray-200 rounded-md appearance-none cursor-pointer accent-pink-500"
                     />
                 </div>

                 <div className="space-y-2 border-t border-gray-200 pt-3">
                     <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thumbnail Size (Square)</p>
                        <span className="text-pink-500 font-bold text-[10px]">
                           {localConfig.timelineThumbnailHeight || 150}px
                        </span>
                     </div>
                     <input 
                        type="range"
                        min="50"
                        max="400"
                        step="10"
                        value={localConfig.timelineThumbnailHeight || 150}
                        onChange={(e) => handleInputChange('timelineThumbnailHeight', parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-md appearance-none cursor-pointer accent-pink-500"
                     />
                 </div>
              </div>
              <div className="space-y-2">
                 {localConfig.timeline.map((item, idx) => (
                    <motion.div 
                       key={item.id} 
                       initial={{ opacity: 0, x: -10 }} 
                       animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.05 } }}
                       className="bg-white p-2 rounded-md shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all group"
                    >
                       <div className="w-10 h-10 shrink-0 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center border border-gray-200 relative">
                           {item.media?.type === 'image' && <img src={item.media.url} className="w-full h-full object-cover" />}
                           {item.media?.type === 'video' && <i className="fas fa-video text-blue-400"></i>}
                           {item.media?.type === 'audio' && <i className="fas fa-microphone text-orange-400"></i>}
                           {!item.media && <i className="fas fa-sticky-note text-gray-300"></i>}
                           
                           <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity z-10">
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

                       <div className="flex-1 min-w-0 grid grid-cols-1 gap-1">
                          <div className="flex gap-2">
                             <DatePicker
                                selected={item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp as any)}
                                onChange={(date: Date | null) => date && handleTimelineChange(item.id, 'timestamp', date)}
                                showTimeSelect
                                dateFormat="MM/dd/yy"
                                className="w-20 text-[10px] font-bold text-gray-500 bg-transparent outline-none p-0 cursor-pointer hover:text-pink-500"
                             />
                             <input 
                               type="text"
                               value={item.text}
                               onChange={(e) => handleTimelineChange(item.id, 'text', e.target.value)}
                               className="flex-1 text-xs font-bold text-gray-800 bg-transparent outline-none truncate focus:text-pink-600 focus:bg-pink-50/50 rounded-md px-1"
                             />
                          </div>
                       </div>

                       <button 
                          onClick={() => {
                             if(confirm('Delete event?')) updateLocal(prev => ({ 
                                ...prev, 
                                timeline: prev.timeline.filter(t => t.id !== item.id) 
                             }));
                          }}
                          className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shrink-0"
                       >
                          <i className="fas fa-trash-alt text-xs"></i>
                       </button>
                    </motion.div>
                 ))}
              </div>



           </motion.div>
        );
      case 'coupons':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-pink-50/30 p-4 rounded-md flex items-center justify-between border border-pink-50 mb-4">
                 <div>
                    <p className="text-xs font-bold text-gray-800 flex items-center gap-2 italic">
                       <i className="fas fa-history text-pink-500"></i> Show Redeemed on Timeline
                    </p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 ml-6">Display used coupons in your story</p>
                 </div>
                 <button 
                   onClick={() => handleInputChange('showCouponsOnTimeline', !localConfig.showCouponsOnTimeline)}
                   className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${localConfig.showCouponsOnTimeline ? 'bg-pink-500 justify-end' : 'bg-gray-200 justify-start'}`}
                 >
                    <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                 </button>
              </div>

              <div className="flex justify-between items-center px-1">
                 <h3 className="font-black text-gray-700 uppercase text-[11px] tracking-widest">Gifts & Vouchers</h3>
                 <button onClick={addCoupon} className="bg-purple-600 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-md">+ Add Coupon</button>
              </div>
              {localConfig.coupons.map(coupon => {
                 const isExpanded = expandedCouponId === coupon.id;
                 return (
                  <div 
                     key={coupon.id} 
                     className={`bg-white rounded-md shadow-sm border border-gray-100 transition-all duration-300 ${isExpanded ? 'p-4 ring-2 ring-pink-100' : 'p-3 hover:shadow-md cursor-pointer'}`}
                     onClick={() => !isExpanded && setExpandedCouponId(coupon.id)}
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-pink-50 rounded-md flex items-center justify-center text-2xl shadow-inner">
                           {coupon.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="font-black text-gray-800 truncate">{coupon.title}</h4>
                           <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                              <span className="bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded text-[10px] uppercase">{coupon.points || 0} PTS</span>
                              <span>•</span>
                              <span>{coupon.for === 'partner1' ? localConfig.partners.partner1.name : localConfig.partners.partner2.name}</span>
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
                                          className="w-16 text-center border rounded-md p-2 text-2xl"
                                       />
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1">
                                       <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest pl-1">Title</label>
                                       <input 
                                          type="text" 
                                          value={coupon.title} 
                                          onChange={(e) => handleCouponChange(coupon.id, 'title', e.target.value)}
                                          className="w-full border-2 border-gray-100 rounded-md p-3 font-black text-sm focus:border-purple-200 outline-none transition-all"
                                       />
                                    </div>
                                 </div>
                                 
                                 <div className="flex flex-col gap-1">
                                    <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest pl-1">Description</label>
                                    <input 
                                       type="text" 
                                       value={coupon.desc} 
                                       onChange={(e) => handleCouponChange(coupon.id, 'desc', e.target.value)}
                                       className="w-full border-2 border-gray-100 rounded-md p-3 text-xs font-bold focus:border-purple-200 outline-none transition-all"
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
                                          className="w-24 border-2 border-gray-100 rounded-md p-3 text-xs font-bold focus:border-purple-200 outline-none transition-all"
                                       />
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1">
                                       <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest pl-1">For Who?</label>
                                       <select 
                                          value={coupon.for} 
                                          onChange={(e) => handleCouponChange(coupon.id, 'for', e.target.value)}
                                          className="w-full text-xs font-black border rounded-md p-3 bg-gray-50 uppercase"
                                       >
                                          <option value="partner1">{localConfig.partners.partner1.name}</option>
                                          <option value="partner2">{localConfig.partners.partner2.name}</option>
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
                                       className="text-[9px] font-black text-red-400 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-md hover:bg-red-500 hover:text-white transition-all"
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
        );
      case 'world':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             
             {/* Create New World Section */}
             <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-5 rounded-md shadow-lg text-white">
                <h3 className="font-black uppercase text-[11px] tracking-widest mb-3 flex items-center gap-2">
                  <i className="fas fa-plus-circle"></i> Create New World
                </h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newWorldName}
                    onChange={(e) => setNewWorldName(e.target.value)}
                    placeholder="Enter world name..."
                    className="flex-1 bg-white/20 border border-white/30 rounded-md p-3 text-xs font-bold placeholder:text-white/60 outline-none focus:bg-white/30 transition-all"
                  />
                  <button 
                    onClick={handleCreateWorld}
                    disabled={isCircleUpdating || !newWorldName.trim()}
                    className="bg-white text-pink-600 px-4 py-2 rounded-md font-black text-[10px] uppercase shadow-md hover:bg-pink-50 transition-all disabled:opacity-50"
                  >
                    {isCircleUpdating ? '...' : 'Create'}
                  </button>
                </div>
                <p className="text-[9px] mt-3 text-white/80 italic">A world is a shared space for you and your partner. Each world has its own timeline, memories, and settings.</p>
             </div>

             {/* Circles List */}
             <div className="space-y-4">
               <div className="flex justify-between items-center px-1">
                 <h3 className="font-black text-gray-700 uppercase text-[11px] tracking-widest">
                   <i className="fas fa-globe-asia text-emerald-500 mr-2"></i> My Worlds (Circles)
                 </h3>
                 <div className="bg-emerald-50 text-emerald-500 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">{circles.length} Active</div>
               </div>

               <div className="flex flex-col gap-3">
                 {circles.map(circle => (
                    <div 
                      key={circle.id} 
                      className={`bg-white rounded-md shadow-sm border transition-all duration-300 ${circle.id === activeCircleId ? 'border-pink-300 ring-4 ring-pink-50' : 'border-gray-100 hover:shadow-md'}`}
                    >
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          {editingCircleId === circle.id ? (
                            <div className="flex gap-2 mb-1">
                              <input 
                                type="text"
                                value={editingCircleName}
                                onChange={(e) => setEditingCircleName(e.target.value)}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-md p-1.5 text-xs font-bold outline-none focus:border-pink-300"
                                autoFocus
                              />
                              <button 
                                onClick={() => handleUpdateWorld(circle.id)}
                                disabled={isCircleUpdating}
                                className="px-3 py-1 bg-pink-500 text-white rounded-md text-[10px] font-black uppercase"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setEditingCircleId(null)}
                                className="px-3 py-1 bg-gray-100 text-gray-500 rounded-md text-[10px] font-black uppercase"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <h4 className="font-black text-gray-800 text-sm truncate flex items-center gap-2">
                              {circle.name}
                              {circle.id === activeCircleId && <span className="bg-pink-100 text-pink-500 text-[8px] px-1.5 py-0.5 rounded-full">ACTIVE</span>}
                            </h4>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{circle.id}</code>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(circle.id);
                                alert('World Code copied to clipboard!');
                              }}
                              className="text-gray-300 hover:text-pink-500 transition-colors"
                              title="Copy World Code"
                            >
                              <i className="fas fa-copy text-[10px]"></i>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                           {circle.id !== activeCircleId && (
                             <button 
                               onClick={() => setActiveCircle(circle.id)}
                               className="px-4 py-2 bg-pink-50 text-pink-600 hover:bg-pink-500 hover:text-white rounded-md text-[10px] font-black uppercase tracking-widest transition-all"
                             >
                               Switch
                             </button>
                           )}
                           
                           <div className="flex items-center border-l border-gray-100 pl-2">
                              <button 
                                 onClick={() => {
                                   setEditingCircleId(circle.id);
                                   setEditingCircleName(circle.name);
                                 }}
                                 className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                                 title="Rename World"
                              >
                                 <i className="fas fa-edit text-xs"></i>
                              </button>
                              <button 
                                 onClick={() => handleDeleteWorld(circle.id, circle.name)}
                                 className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                 title="Delete World"
                              >
                                 <i className="fas fa-trash-alt text-xs"></i>
                              </button>
                           </div>
                        </div>
                      </div>
                    </div>
                 ))}

                 {circles.length === 0 && (
                   <div className="text-center py-10 bg-gray-50 rounded-md border-2 border-dashed border-gray-200">
                     <i className="fas fa-globe text-4xl text-gray-200 mb-3"></i>
                     <p className="text-sm font-bold text-gray-400">No worlds found. Create your first one above!</p>
                   </div>
                 )}
               </div>
             </div>
             
             <div className="bg-emerald-50/50 p-4 rounded-md border border-emerald-100 flex items-start gap-3">
               <i className="fas fa-info-circle text-emerald-500 mt-0.5"></i>
               <p className="text-[10px] text-emerald-700 leading-relaxed">
                 Invite your partner by sharing the <strong>World Code</strong>. When they enter the code in the "Join World" section, both of you will share all the magic across Narinyland.
               </p>
             </div>

          </motion.div>
        );
      case 'objects':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <i className="fas fa-cube text-pink-400"></i> Object Library
                </h3>
                <label className="cursor-pointer bg-pink-500 text-white hover:bg-pink-600 px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all shadow-md">
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
                    className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
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
                  <div key={item.id} className="bg-gray-50 border border-gray-100 rounded-md p-4 flex flex-col items-center text-center gap-3 group hover:border-pink-200 transition-all">
                    <div className="text-3xl bg-white w-12 h-12 rounded-md flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
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
        );
      default:
        return null;
    }
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
            initial={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0, y: 20 }}
            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`bg-white w-full max-w-4xl rounded-t-[2.5rem] md:rounded-md shadow-[0_20px_70px_rgba(0,0,0,0.3)] flex flex-col md:flex-row overflow-hidden ${isMobile ? 'h-[95vh] mt-auto' : 'h-[85vh]'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header (Mobile Only) */}
            {isMobile && (
              <div className="flex flex-col items-center shrink-0 pt-4 pb-2 border-b border-gray-100 bg-white sticky top-0 z-20">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-4"></div>
                <div className="w-full px-6 flex justify-between items-center">
                  <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                    System Settings
                  </h2>
                  <button onClick={onClose} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                    <i className="fas fa-times text-gray-400"></i>
                  </button>
                </div>
              </div>
            )}

            {/* Vertical Tabs Sidebar (Desktop Only) */}
            {!isMobile && (
              <div className="w-56 bg-gray-50 border-r border-gray-100 flex flex-col shrink-0">
                {/* Header */}
                <div className="p-5 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    ⚙️ Settings
                    {hasChanges && <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />}
                  </h2>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Customize Narinyland</p>
                </div>

                {/* Tab Buttons */}
                <div className="flex-1 overflow-y-auto py-2">
                  {['general', 'proposal', 'gallery', 'timeline', 'coupons', 'world', 'objects'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`w-full text-left px-5 py-3 flex items-center gap-3 text-sm font-bold capitalize transition-all ${
                        activeTab === tab 
                          ? 'bg-pink-50 text-pink-600 border-l-4 border-pink-500' 
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 border-l-4 border-transparent'
                      }`}
                    >
                      <i className={`fas ${TAB_ICONS[tab] || 'fa-circle'} text-xs w-4`}></i>
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Save Button in Sidebar */}
                <div className="p-4 border-t border-gray-100">
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className={`w-full py-3 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
                      hasChanges
                        ? 'bg-pink-500 text-white hover:bg-pink-600 shadow-lg shadow-pink-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {hasChanges ? 'Save Changes' : 'No Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Top Bar with Title (Desktop Only) */}
              {!isMobile && (
                <div className="p-5 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white">
                  <h3 className="text-lg font-bold text-gray-800 capitalize flex items-center gap-2">
                    <i className={`fas ${TAB_ICONS[activeTab] || 'fa-circle'} text-pink-400`}></i>
                    {activeTab}
                  </h3>
                  <button onClick={onClose} className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-md flex items-center justify-center transition-colors">
                    <i className="fas fa-times text-gray-500"></i>
                  </button>
                </div>
              )}

              {/* Scrollable Content Area */}
              <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-0 px-4' : 'p-6'} bg-gray-50/50 space-y-4 md:space-y-8 pb-32 custom-scrollbar`}>
                {isMobile ? (
                  /* Mobile Accordion Layout */
                  <div className="space-y-3 mt-4">
                    {['general', 'proposal', 'gallery', 'timeline', 'coupons', 'world', 'objects'].map((tab) => (
                      <div key={tab} className="bg-white rounded-md border border-gray-100 overflow-hidden shadow-sm">
                        <button 
                          onClick={() => setExpandedAccordion(expandedAccordion === tab ? null : tab)}
                          className={`w-full px-5 py-4 flex items-center justify-between text-sm font-black uppercase tracking-widest ${expandedAccordion === tab ? 'bg-pink-50 text-pink-600' : 'text-gray-600'}`}
                        >
                          <div className="flex items-center gap-3">
                            <i className={`fas ${TAB_ICONS[tab] || 'fa-circle'} text-xs`}></i>
                            {tab}
                          </div>
                          <i className={`fas fa-chevron-down text-[10px] transition-transform ${expandedAccordion === tab ? 'rotate-180' : ''}`}></i>
                        </button>
                        <AnimatePresence>
                          {expandedAccordion === tab && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-gray-50"
                            >
                               {renderTabContent(tab as any)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Desktop Direct Layout */
                  renderTabContent(activeTab)
                )}
              </div>
              
              {/* Sticky Footer Save Button (Mobile Only) */}
              {isMobile && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-30">
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className={`w-full py-4 rounded-full text-sm font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                      hasChanges
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xl shadow-pink-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                    }`}
                  >
                    {hasChanges ? (
                      <>
                        <i className="fas fa-check-circle"></i>
                        Save All Changes
                      </>
                    ) : 'Up to Date'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

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
                   className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl"
                   alt="Preview"
                 />
               )}
               {previewItem.type === 'video' && (
                 <video 
                   src={previewItem.url} 
                   className="max-w-full max-h-[85vh] rounded-md shadow-2xl"
                   controls
                   autoPlay
                 />
               )}
               {previewItem.type === 'audio' && (
                 <div className="bg-white p-8 rounded-md shadow-2xl flex flex-col items-center gap-6 min-w-[300px]">
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
    </AnimatePresence>
  );
};

export default EditDrawer;
