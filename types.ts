
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

export interface WorldPresenceVector {
  x: number;
  y: number;
  z: number;
}

export interface CharacterAppearance {
  bodyColor: string;
  trimColor: string;
  hairColor: string;
  skinColor: string;
}

export interface CharacterEquipment {
  head?: string;
  back?: string;
  hand?: string;
}

export type WorldInventorySlot = 'head' | 'back' | 'hand';
export type WorldInventoryRarity = 'common' | 'rare' | 'keepsake';

export interface WorldInventoryItem {
  id: string;
  configId: string;
  userId: string;
  slot: WorldInventorySlot;
  itemKey: string;
  name: string;
  rarity: WorldInventoryRarity;
  icon: string;
  isEquipped: boolean;
  metadata?: Record<string, unknown>;
  acquiredAt: string;
  updatedAt?: string;
}

export interface WorldInventoryCatalogItem {
  slot: WorldInventorySlot;
  itemKey: string;
  name: string;
  rarity: WorldInventoryRarity;
  icon: string;
  price: number;
  description: string;
  source: 'starter' | 'market';
  isOwned: boolean;
  isEquipped: boolean;
}

export type WorldAchievementRarity = 'common' | 'rare' | 'keepsake';

export interface WorldAchievementBadge {
  achievementKey: string;
  name: string;
  icon: string;
  rarity: WorldAchievementRarity;
  titleReward?: string;
}

export interface WorldAchievement extends WorldAchievementBadge {
  id: string;
  configId: string;
  userId: string;
  description: string;
  isTitleEquipped: boolean;
  metadata?: Record<string, unknown>;
  earnedAt: string;
  updatedAt?: string;
}

export type WorldVoiceKind = 'proximity' | 'party' | 'guild' | 'direct';

export interface WorldVoiceMember {
  userId: string;
  name: string;
  status: string;
  isMuted: boolean;
  joinedAt: string;
  lastSeen: string;
}

export interface WorldVoiceRoom {
  id: string;
  configId: string;
  kind: WorldVoiceKind;
  scopeKey: string;
  name: string;
  status: string;
  members: WorldVoiceMember[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export type WorldVoiceSignalKind = 'offer' | 'answer' | 'ice' | 'renegotiate' | 'leave';

export interface WorldVoiceSignalMessage {
  id: string;
  configId: string;
  roomId: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  kind: WorldVoiceSignalKind;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface CharacterProfile {
  userId: string;
  configId: string;
  displayName: string;
  title: string;
  status: string;
  activity: string;
  emote: string;
  modelUrl?: string | null;
  appearance: CharacterAppearance;
  equipment: CharacterEquipment;
  cosmetics?: Record<string, unknown>;
  lastPosition?: WorldPresenceVector | null;
  lastZone?: string | null;
  lastMapPositions?: CharacterMapPositions;
  updatedAt?: string;
}

export interface CharacterMapPosition {
  position: WorldPresenceVector;
  zone: string;
  updatedAt?: string;
}

export type CharacterMapPositions = Record<string, CharacterMapPosition>;

export type WorldPresenceIntentKind =
  | 'explore'
  | 'walk_to'
  | 'follow'
  | 'chat'
  | 'voice'
  | 'party'
  | 'guild'
  | 'event'
  | 'trade'
  | 'create'
  | 'inspect';

export interface WorldPresenceIntent {
  kind: WorldPresenceIntentKind;
  label: string;
  detail?: string;
  icon?: string;
  targetUserId?: string;
  targetName?: string;
  targetPosition?: WorldPresenceVector;
  zone?: string;
  updatedAt?: string;
}

export interface WorldPresence {
  userId: string;
  name: string;
  avatar?: string;
  position: WorldPresenceVector;
  velocity?: WorldPresenceVector;
  heading?: number;
  moving?: boolean;
  animation: string;
  activity: string;
  status: string;
  guild?: string;
  guildId?: string;
  party?: string;
  partyId?: string;
  eventId?: string;
  eventName?: string;
  title?: string;
  emote?: string;
  modelUrl?: string | null;
  appearance?: CharacterAppearance;
  equipment?: CharacterEquipment;
  cosmetics?: Record<string, unknown>;
  achievements?: WorldAchievementBadge[];
  voiceRoomId?: string;
  voiceRoomName?: string;
  isVoiceMuted?: boolean;
  intent?: WorldPresenceIntent;
  currentLandId?: string;
  currentZone: string;
  lastSeen: string;
}

export type WorldActionType =
  | 'view_profile'
  | 'start_chat'
  | 'voice_call'
  | 'follow_user'
  | 'add_friend'
  | 'invite_party'
  | 'invite_guild'
  | 'trade'
  | 'collaborate'
  | 'activity_feed'
  | 'join_activity'
  | 'npc_interact';

export interface WorldSocialAction {
  id: string;
  configId: string;
  type: WorldActionType;
  status: string;
  fromUserId: string;
  fromName: string;
  toUserId?: string | null;
  toName?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export type WorldChatChannel = 'world' | 'direct' | 'party' | 'guild';

export interface WorldChatMessage {
  id: string;
  configId: string;
  channel: WorldChatChannel;
  fromUserId: string;
  fromName: string;
  toUserId?: string | null;
  toName?: string | null;
  body: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface WorldActivityProfileSummary {
  userId: string;
  name: string;
  title?: string;
  status: string;
  activity: string;
  updatedAt?: string;
}

export interface WorldActivityFeed {
  userId: string;
  name: string;
  profile?: WorldActivityProfileSummary | null;
  presence?: WorldPresence | null;
  actions: WorldSocialAction[];
  chatMessages: WorldChatMessage[];
  updatedAt: string;
}

export interface WorldPartyMember {
  userId: string;
  name: string;
  role: string;
  status: string;
  joinedAt: string;
}

export interface WorldParty {
  id: string;
  configId: string;
  name: string;
  leaderUserId: string;
  status: string;
  members: WorldPartyMember[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface WorldEventParticipant {
  userId: string;
  name: string;
  status: string;
  joinedAt: string;
}

export interface WorldEvent {
  id: string;
  configId: string;
  title: string;
  description: string;
  district: string;
  status: string;
  startsAt: string;
  endsAt?: string | null;
  participants: WorldEventParticipant[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface WorldGuildMember {
  userId: string;
  name: string;
  role: string;
  status: string;
  joinedAt: string;
}

export interface WorldGuild {
  id: string;
  configId: string;
  name: string;
  leaderUserId: string;
  status: string;
  bannerColor: string;
  motto: string;
  members: WorldGuildMember[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export type WorldRelationshipType = 'follow' | 'friend';
export type WorldRelationshipStatus = 'active' | 'pending' | 'accepted' | 'removed';

export interface WorldRelationship {
  id: string;
  configId: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  type: WorldRelationshipType;
  status: WorldRelationshipStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface WorldSnapshot {
  presences: WorldPresence[];
  actions: WorldSocialAction[];
  chatMessages: WorldChatMessage[];
  interest?: {
    currentLandId?: string;
    currentZone?: string;
    center?: WorldPresenceVector;
    radius?: number;
    totalOnline?: number;
    visibleOnline?: number;
  };
  event?: WorldEvent | null;
  party?: WorldParty | null;
  guild?: WorldGuild | null;
  relationships?: WorldRelationship[];
  requests?: WorldSocialAction[];
  voiceRooms?: WorldVoiceRoom[];
  myVoiceRooms?: WorldVoiceRoom[];
  inventory?: WorldInventoryItem[];
  marketCatalog?: WorldInventoryCatalogItem[];
  marketStats?: LoveStats | null;
  achievements?: WorldAchievement[];
  characterEquipment?: CharacterEquipment;
  characterTitle?: string;
  serverTime: string;
}

export interface WorldPresenceDelta {
  presence?: WorldPresence;
  removedUserId?: string;
  interest?: WorldSnapshot['interest'];
  serverTime: string;
}

export interface WorldActionDelta {
  action?: WorldSocialAction;
  actionId?: string;
  serverTime: string;
}

export interface WorldChatDelta {
  message?: WorldChatMessage;
  messageId?: string;
  serverTime: string;
}

export interface WorldVoiceDelta {
  voiceRooms: WorldVoiceRoom[];
  myVoiceRooms: WorldVoiceRoom[];
  roomId?: string | null;
  userId?: string | null;
  action?: string | null;
  serverTime: string;
}

export interface WorldVoiceSignalDelta {
  roomId: string;
  signals: WorldVoiceSignalMessage[];
  cursor: number;
  serverTime: string;
}

export type WorldSocialStateDeltaKind =
  | 'event'
  | 'party'
  | 'guild'
  | 'request'
  | 'relationship'
  | 'inventory'
  | 'achievement';

export interface WorldSocialStateDelta {
  kind: WorldSocialStateDeltaKind;
  event?: WorldEvent | null;
  party?: WorldParty | null;
  guild?: WorldGuild | null;
  relationships?: WorldRelationship[];
  requests?: WorldSocialAction[];
  inventory?: WorldInventoryItem[];
  marketCatalog?: WorldInventoryCatalogItem[];
  marketStats?: LoveStats | null;
  achievements?: WorldAchievement[];
  characterEquipment?: CharacterEquipment;
  characterTitle?: string;
  serverTime: string;
}

export interface ItemTransformUpdate {
  x: number;
  y: number;
  z: number;
  rotation?: number;
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
  xpForNextLevel?: number;
  totalXP?: number;
  leaves: number;
  points: number;
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
  partners: Record<string, {
    id?: string;
    partnerId?: string;
    name: string;
    avatar: string;
    points?: number;
    lifetimePoints?: number;
  }>;
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
