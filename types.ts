
export type Emotion = 'sleeping' | 'neutral' | 'happy' | 'excited' | 'waiting' | 'thinking' | 'playing';

export interface MediaContent {
  type: 'image' | 'video' | 'audio';
  url: string;
}

export interface MemoryItem {
  url: string;
  privacy: 'public' | 'private';
}

export interface Interaction {
  id: string;
  text: string;
  timestamp: Date;
  type: 'pet' | 'system' | 'letter' | 'quest';
  location?: string;
  media?: MediaContent;
  mediaItems?: MediaContent[];
}

export interface LoveStats {
  xp: number;
  level: number;
  questsCompleted: number;
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
  fromId: 'partner1' | 'partner2';
  content: string;
  timestamp: Date;
  unlockDate: Date;
  isRead: boolean;
  media?: MediaContent;
  mediaItems?: MediaContent[];
}
export interface AppConfig {
  appName: string;
  musicUrl?: string;
  anniversaryDate: string;
  treeStyle: string;
  viewMode?: "2d" | "3d";
  galleryStyle: string;
  gallerySource: "manual" | "instagram";
  instagramUsername: string;
  daysPerTree: number;
  daysPerFlower: number;
  flowerType: string;
  mixedFlowers: string[];
  skyMode: string;
  timelineDefaultRows: number;
  proposal: {
    questions: string[];
    progress?: number;
    isAccepted?: boolean;
  };
  gallery: MemoryItem[];
  timeline: Interaction[];
  partners: {
    partner1: { name: string; avatar: string };
    partner2: { name: string; avatar: string };
  };
  coupons: {
    id: string;
    title: string;
    emoji: string;
    desc: string;
    color: string;
    expiry?: string;
    for?: string;
    points?: number;
  }[];
}
