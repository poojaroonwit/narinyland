"use client";

import React, { useState, useEffect } from 'react';
import { Interaction, AppConfig, MediaContent } from '../types';
import { uploadAPI, circlesAPI } from '../services/api';
import "react-datepicker/dist/react-datepicker.css";
import { EditDrawerProvider } from './edit-drawer/context';
import { EditDrawerShell } from './edit-drawer/EditDrawerShell';
import { fetchInstagramFeedImport, fetchInstagramProfileImport } from './edit-drawer/instagramImport';
import { CouponsTab, GalleryTab, GeneralTab, LandTab, ObjectsTab, ProposalTab, TimelineTab, WorldTab } from './edit-drawer/tabs';
import { useAuth } from './AuthProvider';

type EditTab = 'general' | 'proposal' | 'gallery' | 'timeline' | 'coupons' | 'world' | 'land' | 'objects';

const EDIT_TABS: EditTab[] = ['general', 'proposal', 'gallery', 'timeline', 'coupons', 'world', 'land', 'objects'];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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
  const { circles, activeCircleId, setActiveCircle, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<EditTab>('general');
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
  const [isUploading, setIsUploading] = useState<number | null>(null); // index of item being uploaded
  const [previewItem, setPreviewItem] = useState<{ url: string; type: 'image' | 'video' | 'audio' } | null>(null);
  const [expandedCouponId, setExpandedCouponId] = useState<string | null>(null);

  // World (Circle) management state
  const [newWorldName, setNewWorldName] = useState('');
  const [editingCircleId, setEditingCircleId] = useState<string | null>(null);
  const [editingCircleName, setEditingCircleName] = useState('');
  const [isCircleUpdating, setIsCircleUpdating] = useState(false);

  // Land management state
  const [newLandName, setNewLandName] = useState('');

  // Fetch posts from a public Instagram profile (username-based, no token)
  const fetchInstagramProfile = () => fetchInstagramProfileImport({
    localConfig,
    updateLocal,
    setIsFetchingIG,
    setIgProfileResult,
    getErrorMessage,
  });

  const fetchInstagramFeed = () => fetchInstagramFeedImport({
    igToken,
    localConfig,
    updateLocal,
    setIsFetchingIG,
    getErrorMessage,
  });

  // Re-sync local state when drawer opens
  useEffect(() => {
    if (isOpen) {
      const cloned = JSON.parse(JSON.stringify(config)) as AppConfig;
      // Re-hydrate Date objects that were serialized to strings
      if (cloned.timeline) {
        cloned.timeline = cloned.timeline.map((item) => ({
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

  const handleInputChange = (field: keyof AppConfig, value: unknown, nested?: string) => {
    updateLocal(prev => {
      const next = { ...prev };
      if (nested) {
        const current = next[field];
        (next as Record<string, unknown>)[field] = {
          ...(typeof current === 'object' && current !== null ? current : {}),
          [nested]: value,
        };
      } else {
        (next as Record<string, unknown>)[field] = value;
      }
      return next;
    });
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

  const handleTimelineChange = (id: string, field: keyof Interaction, value: Interaction[keyof Interaction]) => {
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
    } catch (err: unknown) {
      alert(`Upload failed: ${getErrorMessage(err)}`);
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
    } catch (err: unknown) {
      alert(`Some uploads failed: ${getErrorMessage(err)}`);
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
      const type: MediaContent['type'] = file.type.startsWith('audio') ? 'audio' : file.type.startsWith('video') ? 'video' : 'image';
      const result = await uploadAPI.upload(file, 'timeline');
      updateLocal(prev => ({
        ...prev,
        timeline: prev.timeline.map(item => item.id === id ? { ...item, media: { type, url: result.url } } : item)
      }));
    } catch (err: unknown) {
      alert(`Upload failed: ${getErrorMessage(err)}`);
    }
  };

  const handlePwaIconUpload = async (file: File) => {
    try {
      setIsUploading(999);
      const result = await uploadAPI.upload(file, 'pwa-icon');
      handleInputChange('pwaIconUrl', result.url);
    } catch (err: unknown) {
      alert(`Icon Upload failed: ${getErrorMessage(err)}`);
    } finally {
      setIsUploading(null);
    }
  };

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

  const handleCouponChange = (id: string, field: keyof AppConfig['coupons'][number], value: unknown) => {
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
      await circlesAPI.create({ name: newWorldName.trim() });
      setNewWorldName('');
      await refreshUser();
      alert('World created successfully!');
    } catch (err: unknown) {
      alert(`Failed to create world: ${getErrorMessage(err)}`);
    } finally {
      setIsCircleUpdating(false);
    }
  };

  const handleUpdateWorld = async (id: string) => {
    if (!id || id === 'undefined') {
      alert('Cannot update: Invalid World ID.');
      return;
    }
    if (!editingCircleName.trim()) return;
    setIsCircleUpdating(true);
    try {
      await circlesAPI.update(id, { name: editingCircleName.trim() });
      setEditingCircleId(null);
      await refreshUser();
    } catch (err: unknown) {
      alert(`Failed to update world: ${getErrorMessage(err)}`);
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
    } catch (err: unknown) {
      alert(`Failed to delete world: ${getErrorMessage(err)}`);
    } finally {
      setIsCircleUpdating(false);
    }
  };

  const handlePetChange = (id: string, field: keyof NonNullable<AppConfig['pets']>[number], value: unknown) => {
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

  const TAB_ICONS: Record<string, string> = { general: 'fa-cog', proposal: 'fa-ring', gallery: 'fa-images', timeline: 'fa-calendar-alt', coupons: 'fa-ticket-alt', world: 'fa-globe', land: 'fa-map-marked-alt', objects: 'fa-cube' };

  const TAB_COMPONENTS: Record<EditTab, React.FC> = { general: GeneralTab, proposal: ProposalTab, gallery: GalleryTab, timeline: TimelineTab, coupons: CouponsTab, world: WorldTab, land: LandTab, objects: ObjectsTab };

  const renderTabContent = (tab: EditTab) => {
    const TabComponent = TAB_COMPONENTS[tab];
    return <TabComponent />;
  };

  const drawerContext = { localConfig, partners, circles, activeCircleId, newWorldName, editingCircleId, editingCircleName, isCircleUpdating, newLandName, objectCategoryFilter, isUploading, igToken, isFetchingIG, igProfileResult, expandedCouponId, isDraggingOver, isOpen, isMobile, onClose, hasChanges, activeTab, expandedAccordion, previewItem, TAB_ICONS, EDIT_TABS, renderTabContent, handleSave, updateLocal, handleInputChange, handlePwaIconUpload, addPet, removePet, handlePetChange, addProposalQuestion, removeProposalQuestion, updateProposalQuestion, setProposalProgress, setIgToken, fetchInstagramProfile, fetchInstagramFeed, handleMultiFileUpload, handleGalleryUrlChange, toggleGalleryPrivacy, addGalleryImage, removeGalleryImage, handleFileUpload, setPreviewItem, getPreviewUrl, handleDragOver, handleDragLeave, handleDrop, isVideo, addAlbum, deleteAlbum, handleGalleryAlbumChange, handleTimelineFileUpload, handleTimelineChange, addTimelineEvent, setExpandedCouponId, handleCouponChange, addCoupon, setActiveCircle, setNewWorldName, handleCreateWorld, setEditingCircleId, setEditingCircleName, handleUpdateWorld, handleDeleteWorld, setNewLandName, addLand, deleteLand, toggleLandActive, setObjectCategoryFilter, uploadAPI, setActiveTab, setExpandedAccordion };

  return (
    <EditDrawerProvider value={drawerContext}>
      <EditDrawerShell />
    </EditDrawerProvider>
  );
};

export default EditDrawer;
