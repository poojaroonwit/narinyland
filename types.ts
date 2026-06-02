
export type Emotion = 'sleeping' | 'neutral' | 'happy' | 'excited' | 'waiting' | 'thinking' | 'playing';

export interface MediaContent {
  type: 'image' | 'video' | 'audio';
  url: string;
}

export interface Album {
  id: string;
  name: string;
}

export interface Land {
  id: string;
  name: string;
  isActive: boolean;
  icon?: string;
  items?: PurchasedItem[];
}

export interface PurchasedItem {
  id: string;
  type: string;
  modelUrl?: string | null;
  x: number;
  y: number;
  z: number;
  rotation: number;
  landId: string;
}

export interface MemoryItem {
  id?: string;
  url: string;
  privacy: 'public' | 'private';
  albumId?: string | null;
  caption?: string | null;
}

export interface Interaction {
  id: string;
  text: string;
  timestamp: Date;
  type: 'pet' | 'system' | 'letter' | 'quest';
  location?: string;
  latitude?: number;
  longitude?: number;
  media?: MediaContent;
  mediaItems?: MediaContent[];
}

export interface LoveStats {
  xp: number;
  level: number;
  partnerPoints?: {
    partner1: number;
    partner2: number;
  };
}

export interface PetState {
  emotion: Emotion;
  lastMessage: string;
  isCameraActive: boolean;
  facesDetected: number;
  evolutionLevel: number;
}

export interface LoveLetterMessage {
  id: string;
  fromId: string;
  content: string;
  folder?: string;
  timestamp: Date;
  unlockDate: Date;
  isRead: boolean;
  readAt?: Date;
  media?: MediaContent;
  mediaItems?: MediaContent[];
}
export interface AppConfig {
  appName: string;
  musicPlaylist?: string[];
  mailFolders?: string[];
  anniversaryDate: string;
  treeStyle: string;
  viewMode?: "2d" | "3d";
  graphicsQuality?: 'low' | 'medium' | 'high';
  galleryStyle: string;
  gallerySource: "manual" | "instagram";
  instagramUsername: string;
  daysPerTree: number;
  daysPerFlower: number;
  flowerType: string;
  mixedFlowers: string[];
  skyMode: string;
  showQRCode?: boolean;
  petType?: string;
  pets?: Array<{ id: string; type: string; name?: string }>;
  showCouponsOnTimeline?: boolean;
  timelineCardScale?: number;
  timelineDefaultRows: number;
  timelineZoomLevel?: number;
  timelineLayoutMode?: 'wave' | 'vertical' | 'gallery';
  timelineThumbnailHeight?: number;
  showTimelineImagesOnHomepage?: boolean;
  includeTimelineInGallery?: boolean;
  galleryPhysicsEnabled?: boolean;
  galleryInterval?: number;
  pwaName?: string;
  pwaShortName?: string;
  pwaDescription?: string;
  pwaThemeColor?: string;
  pwaBackgroundColor?: string;
  pwaIconUrl?: string;
  showProposal?: boolean;
  proposal: {
    questions: string[];
    progress?: number;
    isAccepted?: boolean;
    finalWording?: string;
  };
  gallery: MemoryItem[];
  timeline: Interaction[];
  albums?: Album[];
  lands?: Land[];
  partners: Record<string, { name: string; avatar: string }>;
  coupons: {
    id: string;
    title: string;
    emoji: string;
    desc: string;
    color: string;
    expiry?: string;
    for?: string;
    points?: number;
    isRedeemed?: boolean;
    redeemedAt?: Date | string;
  }[];
}
