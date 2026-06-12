"use client";

import * as React from 'react';
import { ContactShadows, Environment, Html, Sparkles, Stars, useAnimations, useGLTF } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { motion, AnimatePresence } from 'framer-motion';
import { GameEngine3D, GameModelAsset, MovementInput, SpawnIn, useGameLoop } from '../game-engine-3d';
import { characterAPI, presenceAPI, worldAchievementsAPI, worldActionsAPI, worldActivityAPI, worldChatAPI, worldEventsAPI, worldGuildAPI, worldInventoryAPI, worldPartyAPI, worldRelationshipsAPI, worldRequestsAPI, worldStreamAPI, worldVoiceAPI } from '../../services/api';
import type { AppConfig, CharacterAppearance, CharacterEquipment, CharacterProfile, Interaction, LoveLetterMessage, LoveStats, MemoryItem, PurchasedItem, WorldActionDelta, WorldActivityFeed, WorldAchievement, WorldAchievementBadge, WorldActionType, WorldChatChannel, WorldChatDelta, WorldChatMessage, WorldEvent, WorldGuild, WorldInventoryCatalogItem, WorldInventoryItem, WorldInventorySlot, WorldParty, WorldPresence, WorldPresenceDelta, WorldPresenceIntent, WorldPresenceVector, WorldRelationship, WorldSnapshot, WorldSocialAction, WorldSocialStateDelta, WorldVoiceDelta, WorldVoiceKind, WorldVoiceRoom, WorldVoiceSignalDelta, WorldVoiceSignalMessage } from '../../types';

type WorldUser = {
  sub: string;
  name?: string;
  picture?: string;
} | null;

type CircleMemberProfile = {
  id?: string;
  userId?: string;
  name?: string;
  avatar?: string;
  role?: string;
};

type AvatarSceneCue = {
  chatMessage?: WorldChatMessage;
  socialAction?: WorldSocialAction;
  relationshipLabel?: string;
  activityPulse?: ActivityPulse;
  requestBadges?: AvatarRequestCue[];
  quickEmote?: {
    label: string;
    icon: string;
    createdAt: number;
  };
};

type AvatarLiveBadge = {
  key: string;
  label: string;
  icon: string;
  title: string;
  className: string;
};

type AvatarRequestCue = AvatarLiveBadge & {
  requestId: string;
  status: string;
  direction: 'incoming' | 'outgoing' | 'active';
};

type AvatarActivityPropMeta = {
  key: string;
  kind: 'chat' | 'voice' | 'trade' | 'event' | 'create' | 'work' | 'afk' | 'party' | 'guild' | 'explore';
  label: string;
  icon: string;
  color: string;
  accent: string;
};

type RemoteEmotePulse = {
  emote: string;
  createdAt: number;
};

type ActivityPulse = {
  activity: string;
  status: string;
  label: string;
  icon: string;
  color: string;
  createdAt: number;
};

type WorldActionDescriptor = {
  type: WorldActionType;
  label: string;
  icon: string;
  toast: string;
};

type WorldActionRunOptions = {
  skipProximityCheck?: boolean;
};

type WorldPanelOpenOptions = {
  openPanel?: boolean;
};

type QueuedAvatarAction = {
  type: WorldActionType;
  targetUserId: string;
  createdAt: number;
};

type NpcActionRunOptions = {
  skipProximityCheck?: boolean;
};

type QueuedNpcAction = {
  npcId: string;
  actionIntent: string;
  createdAt: number;
};

type NpcDialoguePulse = {
  text: string;
  intent: string;
  createdAt: number;
};

type AvatarActivityJoinKind = 'event' | 'trade' | 'create' | 'chat' | 'voice' | 'party' | 'guild' | 'nearby';

type PresenceSocialLinkKind = 'follow' | 'party' | 'guild';

type VoiceMediaStatus = 'idle' | 'requesting' | 'ready' | 'blocked' | 'unsupported';
type VoiceSignalStatus = {
  state: 'idle' | 'listening' | 'syncing';
  peers: number;
  received: number;
  updatedAt?: number;
};
type VoicePeerState = {
  userId: string;
  connectionState: RTCPeerConnectionState;
  iceState: RTCIceConnectionState;
  hasRemoteAudio: boolean;
  updatedAt: number;
};

type ZonePresenceMeta = {
  activity: string;
  status: string;
  emote: string;
  label: string;
  icon: string;
};

type CameraTouchPoint = {
  x: number;
  y: number;
};

type CameraGestureState = {
  pointers: Map<number, CameraTouchPoint>;
  lastDistance: number | null;
  lastAngle: number | null;
  isActive: boolean;
};

type SelectedActivityEntry =
  | { id: string; kind: 'action'; createdAt: string; action: WorldSocialAction }
  | { id: string; kind: 'chat'; createdAt: string; message: WorldChatMessage };

type WorldRequestResponse = 'accept' | 'decline' | 'complete' | 'cancel' | 'ready' | 'unready';

type WorldActivityBeacon = {
  id: string;
  kind: 'action' | 'chat';
  label: string;
  detail: string;
  icon: string;
  color: string;
  position: [number, number, number];
  userId?: string;
  action?: WorldSocialAction;
  message?: WorldChatMessage;
};

type WorldSocialActionLink = {
  id: string;
  action: WorldSocialAction;
  fromPresence: WorldPresence;
  toPresence: WorldPresence;
  focusPresence: WorldPresence;
  label: string;
  detail: string;
  icon: string;
  color: string;
  softColor: string;
  ageRatio: number;
};

type WorldVoiceMarker = {
  id: string;
  kind: 'room' | 'avatar';
  label: string;
  detail: string;
  icon: string;
  color: string;
  position: [number, number, number];
  active: boolean;
  muted?: boolean;
  inputLevel?: number;
  distance?: number;
  rangeLabel?: string;
  signalStrength?: number;
  room?: WorldVoiceRoom;
  presence?: WorldPresence;
};

type ProximityVoiceRangeState = {
  visible: boolean;
  active: boolean;
  muted: boolean;
  nearbyCount: number;
  inputPercent: number;
  label: string;
  detail: string;
  color: string;
};

type WorldEventRallyState = {
  visible: boolean;
  label: string;
  detail: string;
  color: string;
  position: [number, number, number];
  intensity: number;
  participantCount: number;
  rallyCount: number;
};

type WorldLiveActivityMarker = {
  id: string;
  kind: 'event' | 'session' | 'party' | 'guild';
  label: string;
  detail: string;
  icon: string;
  color: string;
  position: [number, number, number];
  active: boolean;
  event?: WorldEvent;
  session?: WorldSocialAction;
  groupMembers?: Array<{
    id: string;
    name: string;
    status: string;
    color: string;
  }>;
};

type WorldLivePrompt = {
  key: string;
  source: 'marker' | 'presence';
  eyebrow: string;
  title: string;
  detail: string;
  icon: string;
  color: string;
  distance: number;
  primaryLabel: string;
  secondaryLabel?: string;
  marker?: WorldLiveActivityMarker;
  presence?: WorldPresence;
  joinKind?: AvatarActivityJoinKind;
};

type WorldPulseKind = 'moving' | 'chat' | 'voice' | 'event' | 'trade' | 'afk';

type WorldPulseEntry = {
  kind: WorldPulseKind;
  label: string;
  detail: string;
  icon: string;
  color: string;
  count: number;
  presence?: WorldPresence;
  marker?: WorldLiveActivityMarker;
  voiceMarker?: WorldVoiceMarker;
  chatMessage?: WorldChatMessage;
};

type MiniMapSocialRoute = {
  key: string;
  kind: PresenceSocialLinkKind;
  presence: WorldPresence;
  start: { x: number; y: number };
  end: { x: number; y: number };
  control: { x: number; y: number };
  midpoint: { x: number; y: number };
  distance: number;
  selected: boolean;
};

type AvatarFootstepTrace = {
  id: number;
  x: number;
  z: number;
  rotation: number;
  color: string;
};

type LocalPresenceSample = {
  position: WorldPresenceVector;
  moving: boolean;
  velocity: WorldPresenceVector;
  heading: number;
};

type MobileMovePadState = {
  active: boolean;
  knobX: number;
  knobY: number;
};

type WorldCollisionBody = {
  id: string;
  label: string;
  x: number;
  z: number;
  radius: number;
};

type WorldNpc = {
  id: string;
  name: string;
  role: string;
  district: string;
  position: [number, number, number];
  bodyColor: string;
  trimColor: string;
  icon: string;
  patrolRoute?: [number, number, number][];
  patrolSpeed?: number;
  actions: Array<{
    label: string;
    intent: string;
    response: string;
  }>;
};

type WorldDistrict = {
  id: string;
  name: string;
  icon: string;
  position: [number, number, number];
  radius: number;
  color: string;
};

type WorldDistrictAction = 'walk' | 'primary' | 'chat' | 'party';
type WorkshopColorKey = 'bodyColor' | 'trimColor' | 'hairColor';
type WorkshopCosmeticKey = 'aura' | 'trail' | 'nameplate';

type DistrictPresenceSummary = {
  count: number;
  topActivity: string;
  movingCount: number;
  voiceCount: number;
  topIntentKind?: WorldPresenceIntent['kind'];
  names: string[];
};

type WorldTrafficRoute = {
  id: string;
  district: WorldDistrict;
  summary: DistrictPresenceSummary;
  active: boolean;
  color: string;
  softColor: string;
  icon: string;
  label: string;
  detail: string;
  particleCount: number;
  speed: number;
};

type WorldInterestWindow = {
  currentLandId?: string;
  currentZone?: string;
  x: number;
  z: number;
  radius: number;
};

type WorldPortalId = 'home' | 'timeline' | 'coupons' | 'letters' | 'shop';

type WorldPortal = {
  id: WorldPortalId;
  name: string;
  subtitle: string;
  icon: string;
  position: [number, number, number];
  color: string;
  actionLabel: string;
  activity: string;
  status: string;
  emote: string;
};

type WorldCyclePhase = 'Dawn' | 'Day' | 'Dusk' | 'Night';
type WorldWeather = 'Clear' | 'Petals' | 'Mist' | 'Fireflies';

type WorldCycle = {
  hour: number;
  minute: number;
  phase: WorldCyclePhase;
  weather: WorldWeather;
  progress: number;
  daylight: number;
  night: number;
  sky: string;
  fog: string;
  sun: string;
  ambientIntensity: number;
  sunIntensity: number;
};

type WorldMMO3DProps = {
  user: WorldUser;
  activeCircleId?: string | null;
  circleName?: string;
  activeLandId?: string | null;
  activeLandName?: string;
  circleMembers?: CircleMemberProfile[];
  landObjects?: PurchasedItem[];
  timeline: Interaction[];
  memories?: MemoryItem[];
  coupons?: AppConfig['coupons'];
  loveLetters?: LoveLetterMessage[];
  quality?: 'low' | 'medium' | 'high';
  onFlagClick: (item: Interaction) => void;
};

const WORLD_BOUNDS = 24;
const WORLD_DAY_MS = 24 * 60 * 1000;
const WORLD_WEATHER_BLOCK_MS = 6 * 60 * 1000;
const DEFAULT_POSITION: WorldPresenceVector = { x: -3.5, y: 0, z: 5 };
const ZERO_VECTOR: WorldPresenceVector = { x: 0, y: 0, z: 0 };
const CHAT_BUBBLE_ACTIVE_MS = 45_000;
const ACTION_CUE_ACTIVE_MS = 32_000;
const SOCIAL_ACTION_LINK_ACTIVE_MS = 58_000;
const QUICK_EMOTE_ACTIVE_MS = 3_200;
const REMOTE_AVATAR_LERP_SPEED = 7.5;
const REMOTE_AVATAR_SNAP_DISTANCE = 7;
const REMOTE_AVATAR_MOVING_EPSILON = 0.035;
const REMOTE_AVATAR_VELOCITY_EPSILON = 0.24;
const REMOTE_AVATAR_PREDICTION_LEAD_SECONDS = 0.22;
const REMOTE_AVATAR_MAX_PREDICTION_SECONDS = 0.78;
const REMOTE_AVATAR_MAX_PREDICTION_DISTANCE = 2.25;
const AVATAR_FOOTSTEP_INTERVAL = 0.22;
const AVATAR_FOOTSTEP_LIFETIME_MS = 1400;
const AVATAR_FOOTSTEP_MAX = 8;
const AVATAR_FOOTSTEP_SIDE_OFFSET = 0.2;
const MOVE_TARGET_VISIBLE_DISTANCE = 0.48;
const AVATAR_COLLISION_RADIUS = 0.42;
const REMOTE_AVATAR_COLLISION_RADIUS = 0.44;
const MAX_REMOTE_AVATAR_COLLISION_BODIES = 18;
const NAVIGATION_OBSTACLE_PADDING = 0.48;
const NAVIGATION_WAYPOINT_REACHED_DISTANCE = 0.44;
const NAVIGATION_TARGET_CHANGE_DISTANCE = 0.22;
const CAMERA_ZOOM_MIN = 0.75;
const CAMERA_ZOOM_MAX = 1.35;
const CAMERA_WHEEL_ZOOM_STEP = 0.0012;
const CAMERA_KEY_ROTATION_STEP = Math.PI / 8;
const CAMERA_KEY_ZOOM_STEP = 0.08;
const AUTO_AFK_AFTER_MS = 2 * 60 * 1000;
const AUTO_AFK_CHECK_MS = 5000;
const PROXIMITY_VOICE_RANGE = 6;
const NEARBY_SPEECH_RANGE = 9;
const WORLD_VOICE_RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};
const LIVE_PROMPT_MARKER_RANGE = 30;
const LIVE_PROMPT_AVATAR_RANGE = 13;
const LIVE_PROMPT_SESSION_RANGE = 22;
const NEARBY_AVATAR_PROMPT_RANGE = 9.5;
const EVENT_RALLY_PULSE_ACTIVE_MS = 70_000;
const WORLD_STREAM_STALE_AFTER_MS = 8000;
const WORLD_STREAM_STATUS_TICK_MS = 2000;
const WORLD_STREAM_INTEREST_RADIUS = 18;
const AVATAR_INTERACTION_RANGE = 4.4;
const AVATAR_ACTION_QUEUE_TTL_MS = 18_000;
const AVATAR_ACTIVITY_PULSE_ACTIVE_MS = 9_000;
const NPC_INTERACTION_RANGE = 3.2;
const NPC_ACTION_QUEUE_TTL_MS = 14_000;
const NPC_DIALOGUE_ACTIVE_MS = 11_000;
const REQUEST_ACTION_TYPES = new Set<WorldActionType>(['voice_call', 'invite_party', 'invite_guild', 'trade', 'collaborate']);
const INTERACTION_SESSION_TYPES = new Set<WorldActionType>(['trade', 'collaborate']);
const SOCIAL_ACTION_LINK_TYPES = new Set<WorldActionType>([
  'start_chat',
  'voice_call',
  'follow_user',
  'add_friend',
  'invite_party',
  'invite_guild',
  'trade',
  'collaborate',
  'join_activity',
]);
const AVATAR_PROXIMITY_ACTION_TYPES = new Set<WorldActionType>([
  'start_chat',
  'voice_call',
  'add_friend',
  'invite_party',
  'invite_guild',
  'trade',
  'collaborate',
]);
const COMMONS_DISTRICT: WorldDistrict = {
  id: 'commons',
  name: 'Commons',
  icon: 'fa-tree-city',
  position: [0, 0, 0],
  radius: 6.2,
  color: '#c6d9ef',
};
const PATHS_DISTRICT: WorldDistrict = {
  id: 'garden-paths',
  name: 'Garden Paths',
  icon: 'fa-route',
  position: [0, 0, 0],
  radius: WORLD_BOUNDS,
  color: '#d6c29a',
};
const WORLD_POPULATION_BOARD_POSITION: [number, number, number] = [0, 0, 6.6];

const EMPTY_MOVEMENT: MovementInput = { forward: false, back: false, left: false, right: false };
const MOBILE_MOVE_PAD_THRESHOLD = 12;
const MOBILE_MOVE_PAD_KNOB_MAX = 38;

const palette = [
  { body: '#b45309', trim: '#fde68a', hair: '#3f2b1f' },
  { body: '#be123c', trim: '#fecdd3', hair: '#4a2c2a' },
  { body: '#047857', trim: '#bbf7d0', hair: '#33251f' },
  { body: '#7c3aed', trim: '#ddd6fe', hair: '#2e241f' },
  { body: '#0369a1', trim: '#bae6fd', hair: '#36291f' },
];

const DEFAULT_APPEARANCE: CharacterAppearance = {
  bodyColor: '#b45309',
  trimColor: '#fde68a',
  hairColor: '#3f2b1f',
  skinColor: '#f5d0b6',
};

const DEFAULT_EQUIPMENT: CharacterEquipment = {
  head: 'flower_crown',
  back: 'ribbon_wings',
  hand: 'bouquet',
};

const BODY_SWATCHES = ['#b45309', '#be123c', '#047857', '#7c3aed', '#0369a1', '#9a3412'];
const TRIM_SWATCHES = ['#fde68a', '#fecdd3', '#bbf7d0', '#ddd6fe', '#bae6fd', '#fbcfe8'];
const HAIR_SWATCHES = ['#3f2b1f', '#4a2c2a', '#1f2937', '#7c2d12', '#78350f', '#f5d0b6'];
const ACTIVITY_OPTIONS = ['Exploring', 'Working', 'Creating content', 'Chatting', 'Trading', 'Attending events', 'AFK'];
const STATUS_OPTIONS = ['online', 'exploring', 'working', 'creating', 'chatting', 'trading', 'event', 'afk'];
const EMOTE_OPTIONS = ['idle', 'wave', 'heart', 'dance', 'sit'];
const ACTIVITY_META: Record<string, { icon: string; status: string }> = {
  Exploring: { icon: 'fa-compass', status: 'exploring' },
  Working: { icon: 'fa-hammer', status: 'working' },
  'Creating content': { icon: 'fa-pen-nib', status: 'creating' },
  Chatting: { icon: 'fa-comment', status: 'chatting' },
  Trading: { icon: 'fa-handshake', status: 'trading' },
  'Attending events': { icon: 'fa-star', status: 'event' },
  AFK: { icon: 'fa-clock', status: 'afk' },
};
const STATUS_META: Record<string, { label: string; icon: string; color: string }> = {
  online: { label: 'Online', icon: 'fa-circle', color: '#34d399' },
  exploring: { label: 'Exploring', icon: 'fa-compass', color: '#10b981' },
  working: { label: 'Working', icon: 'fa-hammer', color: '#f59e0b' },
  creating: { label: 'Creating', icon: 'fa-pen-nib', color: '#38bdf8' },
  chatting: { label: 'Chatting', icon: 'fa-comment', color: '#ec4899' },
  trading: { label: 'Trading', icon: 'fa-handshake', color: '#d97706' },
  event: { label: 'Event', icon: 'fa-star', color: '#a855f7' },
  afk: { label: 'AFK', icon: 'fa-clock', color: '#f97316' },
};
const PRESENCE_INTENT_META: Record<WorldPresenceIntent['kind'], { label: string; icon: string; color: string; className: string }> = {
  explore: { label: 'Exploring', icon: 'fa-compass', color: '#10b981', className: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  walk_to: { label: 'Walking', icon: 'fa-location-crosshairs', color: '#d97706', className: 'text-amber-700 bg-amber-50 border-amber-100' },
  follow: { label: 'Following', icon: 'fa-route', color: '#0284c7', className: 'text-sky-700 bg-sky-50 border-sky-100' },
  chat: { label: 'Chatting', icon: 'fa-comment', color: '#db2777', className: 'text-pink-700 bg-pink-50 border-pink-100' },
  voice: { label: 'Voice', icon: 'fa-microphone', color: '#7c3aed', className: 'text-violet-700 bg-violet-50 border-violet-100' },
  party: { label: 'Party', icon: 'fa-users', color: '#ec4899', className: 'text-pink-700 bg-pink-50 border-pink-100' },
  guild: { label: 'Guild', icon: 'fa-shield-heart', color: '#059669', className: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  event: { label: 'Event', icon: 'fa-star', color: '#ca8a04', className: 'text-amber-700 bg-amber-50 border-amber-100' },
  trade: { label: 'Trading', icon: 'fa-handshake', color: '#d97706', className: 'text-amber-700 bg-amber-50 border-amber-100' },
  create: { label: 'Creating', icon: 'fa-pen-nib', color: '#0369a1', className: 'text-sky-700 bg-sky-50 border-sky-100' },
  inspect: { label: 'Inspecting', icon: 'fa-magnifying-glass', color: '#57534e', className: 'text-stone-700 bg-stone-50 border-stone-100' },
};
const EMOTE_META: Record<string, { label: string; icon: string }> = {
  idle: { label: 'Idle', icon: 'fa-face-smile' },
  wave: { label: 'Wave', icon: 'fa-hand-sparkles' },
  heart: { label: 'Heart', icon: 'fa-heart' },
  dance: { label: 'Dance', icon: 'fa-music' },
  sit: { label: 'Sit', icon: 'fa-chair' },
};
const COSMETIC_AURAS = [
  { id: 'none', label: 'None', icon: 'fa-ban', color: '#78716c' },
  { id: 'petal_glow', label: 'Petals', icon: 'fa-seedling', color: '#ec4899' },
  { id: 'moon_mist', label: 'Moon Mist', icon: 'fa-moon', color: '#60a5fa' },
  { id: 'firefly_ring', label: 'Fireflies', icon: 'fa-wand-sparkles', color: '#f59e0b' },
] as const;
const COSMETIC_TRAILS = [
  { id: 'none', label: 'None', icon: 'fa-ban', color: '#78716c' },
  { id: 'leaf_steps', label: 'Leaves', icon: 'fa-leaf', color: '#16a34a' },
  { id: 'soft_petals', label: 'Petals', icon: 'fa-seedling', color: '#f472b6' },
  { id: 'starlit_steps', label: 'Starlit', icon: 'fa-star', color: '#fbbf24' },
] as const;
const COSMETIC_NAMEPLATES = [
  { id: 'classic', label: 'Classic', icon: 'fa-tag', className: 'border-white/70 bg-[#fffaf1]/90 text-stone-800' },
  { id: 'rose', label: 'Rose', icon: 'fa-heart', className: 'border-pink-200 bg-pink-50/92 text-pink-900' },
  { id: 'grove', label: 'Grove', icon: 'fa-leaf', className: 'border-emerald-200 bg-emerald-50/92 text-emerald-900' },
  { id: 'night', label: 'Night', icon: 'fa-moon', className: 'border-indigo-200 bg-indigo-950/82 text-indigo-50' },
] as const;
const INVENTORY_SLOTS: Array<{ slot: WorldInventorySlot; label: string; icon: string }> = [
  { slot: 'head', label: 'Head', icon: 'fa-hat-cowboy' },
  { slot: 'back', label: 'Back', icon: 'fa-ribbon' },
  { slot: 'hand', label: 'Hand', icon: 'fa-hand-sparkles' },
];
const EQUIPMENT_LABELS: Record<string, string> = {
  none: 'None',
  flower_crown: 'Flower Crown',
  straw_hat: 'Straw Hat',
  cat_ears: 'Cat Ears',
  rose_halo: 'Rose Halo',
  moon_pin: 'Moon Pin',
  ribbon_wings: 'Ribbon Wings',
  cape: 'Garden Cape',
  picnic_satchel: 'Picnic Satchel',
  star_shawl: 'Star Shawl',
  bouquet: 'Bouquet',
  lantern: 'Lantern',
  book: 'Field Book',
  tea_cup: 'Tea Cup',
  map_scroll: 'Map Scroll',
};
const MARKET_RARITY_CLASS: Record<WorldInventoryCatalogItem['rarity'], string> = {
  common: 'bg-stone-100 text-stone-600',
  rare: 'bg-sky-100 text-sky-700',
  keepsake: 'bg-pink-100 text-pink-700',
};
const PRESENCE_SOCIAL_LINK_META: Record<PresenceSocialLinkKind, { label: string; icon: string; color: string; softColor: string; maxDistance: number; opacity: number }> = {
  follow: { label: 'Follow', icon: 'fa-route', color: '#38bdf8', softColor: '#bae6fd', maxDistance: 22, opacity: 0.56 },
  party: { label: 'Party', icon: 'fa-users', color: '#ec4899', softColor: '#fbcfe8', maxDistance: 18, opacity: 0.46 },
  guild: { label: 'Guild', icon: 'fa-shield-heart', color: '#059669', softColor: '#bbf7d0', maxDistance: 16, opacity: 0.34 },
};
const ACHIEVEMENT_RARITY_CLASS: Record<WorldAchievement['rarity'], string> = {
  common: 'bg-stone-100 text-stone-600',
  rare: 'bg-emerald-100 text-emerald-700',
  keepsake: 'bg-pink-100 text-pink-700',
};
const ACHIEVEMENT_RARITY_3D: Record<WorldAchievementBadge['rarity'], { color: string; emissive: string; orbit: string; metalness: number }> = {
  common: { color: '#d6a25f', emissive: '#8b5e34', orbit: '#fde68a', metalness: 0.08 },
  rare: { color: '#34d399', emissive: '#047857', orbit: '#bbf7d0', metalness: 0.16 },
  keepsake: { color: '#fb7185', emissive: '#be123c', orbit: '#fbcfe8', metalness: 0.12 },
};
const WORLD_ACTIONS: WorldActionDescriptor[] = [
  { type: 'view_profile', label: 'View Profile', icon: 'fa-id-card', toast: 'Profile opened in-world' },
  { type: 'start_chat', label: 'Start Chat', icon: 'fa-comment', toast: 'Chat request sent' },
  { type: 'voice_call', label: 'Voice Call', icon: 'fa-microphone', toast: 'Voice call request sent' },
  { type: 'follow_user', label: 'Follow User', icon: 'fa-route', toast: 'Following movement target' },
  { type: 'add_friend', label: 'Add Friend', icon: 'fa-user-plus', toast: 'Friend request sent' },
  { type: 'invite_party', label: 'Invite Party', icon: 'fa-users', toast: 'Party invite sent' },
  { type: 'invite_guild', label: 'Invite Guild', icon: 'fa-shield-heart', toast: 'Guild invite sent' },
  { type: 'trade', label: 'Trade', icon: 'fa-handshake', toast: 'Trade request sent' },
  { type: 'collaborate', label: 'Collaborate', icon: 'fa-pen-nib', toast: 'Collaboration request sent' },
  { type: 'activity_feed', label: 'Activity Feed', icon: 'fa-list', toast: 'Activity feed opened' },
  { type: 'join_activity', label: 'Join Current', icon: 'fa-door-open', toast: 'Joining activity' },
];
const AVATAR_ACTION_SHORT_LABELS: Partial<Record<WorldActionType, string>> = {
  view_profile: 'Profile',
  start_chat: 'Chat',
  voice_call: 'Voice',
  follow_user: 'Follow',
  add_friend: 'Friend',
  invite_party: 'Party',
  invite_guild: 'Guild',
  trade: 'Trade',
  collaborate: 'Collab',
  activity_feed: 'Feed',
  join_activity: 'Join',
};

const WORLD_DISTRICTS: WorldDistrict[] = [
  {
    id: 'market',
    name: 'Market',
    icon: 'fa-store',
    position: [-11, 0, -6],
    radius: 4.2,
    color: '#fef3c7',
  },
  {
    id: 'guild-hall',
    name: 'Guild Hall',
    icon: 'fa-shield-heart',
    position: [11, 0, -7],
    radius: 4.2,
    color: '#dcfce7',
  },
  {
    id: 'event-lawn',
    name: 'Event Lawn',
    icon: 'fa-star',
    position: [-10, 0, 9],
    radius: 4.4,
    color: '#fce7f3',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    icon: 'fa-hammer',
    position: [10, 0, 8],
    radius: 4.2,
    color: '#e0f2fe',
  },
];

const WORLD_PORTALS: WorldPortal[] = [
  {
    id: 'home',
    name: 'Memory Grove',
    subtitle: 'Gallery and shared moments',
    icon: 'fa-images',
    position: [0, 0, -5.2],
    color: '#ec4899',
    actionLabel: 'Open Grove',
    activity: 'Creating content',
    status: 'creating',
    emote: 'heart',
  },
  {
    id: 'timeline',
    name: 'Story Path',
    subtitle: 'Relationship timeline',
    icon: 'fa-calendar-alt',
    position: [-5.6, 0, 2.4],
    color: '#3b82f6',
    actionLabel: 'Walk Story',
    activity: 'Exploring',
    status: 'exploring',
    emote: 'wave',
  },
  {
    id: 'coupons',
    name: 'Reward Stall',
    subtitle: 'Coupons and treats',
    icon: 'fa-ticket-alt',
    position: [5.6, 0, 2.4],
    color: '#a855f7',
    actionLabel: 'Open Rewards',
    activity: 'Trading',
    status: 'trading',
    emote: 'dance',
  },
  {
    id: 'letters',
    name: 'Letter Lantern',
    subtitle: 'Love letters',
    icon: 'fa-envelope',
    position: [-3.7, 0, -8.8],
    color: '#f43f5e',
    actionLabel: 'Read Letters',
    activity: 'Chatting',
    status: 'chatting',
    emote: 'heart',
  },
  {
    id: 'shop',
    name: 'Object Cart',
    subtitle: 'Land decorations',
    icon: 'fa-cart-shopping',
    position: [3.7, 0, -8.8],
    color: '#d97706',
    actionLabel: 'Open Cart',
    activity: 'Trading',
    status: 'trading',
    emote: 'wave',
  },
];

const WORLD_NPCS: WorldNpc[] = [
  {
    id: 'market-guide',
    name: 'Mira',
    role: 'Market Guide',
    district: 'Market',
    position: [-10.2, 0, -4.3],
    bodyColor: '#b45309',
    trimColor: '#fde68a',
    icon: 'fa-store',
    patrolRoute: [
      [-10.2, 0, -4.3],
      [-11.5, 0, -3.35],
      [-10.35, 0, -2.15],
      [-8.95, 0, -3.8],
    ],
    patrolSpeed: 0.36,
    actions: [
      { label: 'Ask About Trading', intent: 'trade_hint', response: 'Mira marks a calm trading route on your world map.' },
      { label: 'Browse Keepsakes', intent: 'market_browse', response: 'Mira prepares a keepsake stall inside the market district.' },
      { label: 'Start Gift Hunt', intent: 'gift_hunt', response: 'Mira starts a tiny gift hunt for this world.' },
    ],
  },
  {
    id: 'guild-steward',
    name: 'Rowan',
    role: 'Guild Steward',
    district: 'Guild Hall',
    position: [10.4, 0, -5.2],
    bodyColor: '#047857',
    trimColor: '#bbf7d0',
    icon: 'fa-shield-heart',
    patrolRoute: [
      [10.4, 0, -5.2],
      [11.7, 0, -4.45],
      [10.95, 0, -3.15],
      [9.35, 0, -4.0],
    ],
    patrolSpeed: 0.3,
    actions: [
      { label: 'Guild Welcome', intent: 'guild_intro', response: 'Rowan opens the guild hall ledger for your world.' },
      { label: 'Plan Party', intent: 'party_plan', response: 'Rowan pins a party plan to the guild hall board.' },
      { label: 'Check Titles', intent: 'title_check', response: 'Rowan reviews the titles earned in this world.' },
    ],
  },
  {
    id: 'event-host',
    name: 'Lena',
    role: 'Event Host',
    district: 'Event Lawn',
    position: [-9.4, 0, 7.4],
    bodyColor: '#be123c',
    trimColor: '#fecdd3',
    icon: 'fa-star',
    patrolRoute: [
      [-9.4, 0, 7.4],
      [-10.8, 0, 8.15],
      [-9.35, 0, 9.2],
      [-7.95, 0, 8.35],
    ],
    patrolSpeed: 0.34,
    actions: [
      { label: 'Join Current Event', intent: 'event_join', response: 'Lena adds you to the event lawn attendance list.' },
      { label: 'Rally Crowd', intent: 'event_rally', response: 'Lena sends a gentle rally across the event lawn.' },
      { label: 'View Event Board', intent: 'event_board', response: 'Lena shows the current world event board.' },
      { label: 'Create Moment', intent: 'memory_prompt', response: 'Lena suggests planting a new memory near the event lawn.' },
    ],
  },
  {
    id: 'workshop-artisan',
    name: 'Sora',
    role: 'Workshop Artisan',
    district: 'Workshop',
    position: [9.4, 0, 6.9],
    bodyColor: '#0369a1',
    trimColor: '#bae6fd',
    icon: 'fa-hammer',
    patrolRoute: [
      [9.4, 0, 6.9],
      [10.75, 0, 7.75],
      [9.7, 0, 8.95],
      [8.35, 0, 7.75],
    ],
    patrolSpeed: 0.32,
    actions: [
      { label: 'Craft Preview', intent: 'craft_preview', response: 'Sora opens a quiet crafting preview for future equipment.' },
      { label: 'Tune Avatar Gear', intent: 'gear_tune', response: 'Sora notes which cosmetic slot should be upgraded next.' },
      { label: 'Inspect Land Objects', intent: 'object_inspect', response: 'Sora highlights placed land objects for editing.' },
    ],
  },
];

function getActionLabel(actionOrType: WorldActionType | WorldSocialAction) {
  const type = typeof actionOrType === 'string' ? actionOrType : actionOrType.type;
  if (typeof actionOrType !== 'string' && type === 'npc_interact') {
    const portalName = typeof actionOrType.metadata?.portalName === 'string' ? actionOrType.metadata.portalName : '';
    if (portalName) return `Visited ${portalName}`;
  }
  if (type === 'npc_interact') return 'NPC Interaction';
  return WORLD_ACTIONS.find(action => action.type === type)?.label || 'World Action';
}

function getWorldActionDescriptor(type: WorldActionType) {
  return WORLD_ACTIONS.find(action => action.type === type) || null;
}

function getQueuedActionIntentKind(type: WorldActionType): WorldPresenceIntent['kind'] {
  if (type === 'start_chat') return 'chat';
  if (type === 'voice_call') return 'voice';
  if (type === 'invite_party') return 'party';
  if (type === 'invite_guild') return 'guild';
  if (type === 'trade') return 'trade';
  if (type === 'collaborate') return 'create';
  if (type === 'add_friend') return 'follow';
  return 'inspect';
}

function getActivityMeta(activity?: string) {
  return ACTIVITY_META[activity || 'Exploring'] || { icon: 'fa-compass', status: 'online' };
}

function getStatusMeta(status?: string) {
  return STATUS_META[status || 'online'] || { label: status || 'Online', icon: 'fa-circle', color: '#34d399' };
}

function createActivityPulse(activity: string, status: string, createdAt = Date.now()): ActivityPulse {
  const activityMeta = getActivityMeta(activity);
  const statusMeta = getStatusMeta(status || activityMeta.status);
  const normalizedActivity = activity || 'Exploring';
  return {
    activity: normalizedActivity,
    status: statusMeta.label,
    label: normalizedActivity,
    icon: activityMeta.icon,
    color: statusMeta.color,
    createdAt,
  };
}

function getPresenceIntentMeta(intent?: WorldPresenceIntent) {
  if (!intent) return null;
  const fallback = PRESENCE_INTENT_META[intent.kind] || PRESENCE_INTENT_META.explore;
  return {
    ...fallback,
    icon: intent.icon || fallback.icon,
    label: intent.label || fallback.label,
  };
}

function getAvatarLiveBadges(presence: WorldPresence, sceneCue?: AvatarSceneCue): AvatarLiveBadge[] {
  const badges: AvatarLiveBadge[] = [];
  const addBadge = (badge: AvatarLiveBadge) => {
    if (badges.some(item => item.key === badge.key)) return;
    badges.push(badge);
  };

  if (presence.status === 'afk') {
    addBadge({
      key: 'status:afk',
      label: 'AFK',
      icon: 'fa-mug-hot',
      title: 'Away from keyboard',
      className: 'border-stone-200 bg-stone-100 text-stone-600',
    });
  } else if (presence.status && presence.status !== 'online') {
    const statusMeta = getStatusMeta(presence.status);
    addBadge({
      key: `status:${presence.status}`,
      label: statusMeta.label,
      icon: statusMeta.icon,
      title: `Status: ${statusMeta.label}`,
      className: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    });
  }

  if (sceneCue?.chatMessage) {
    addBadge({
      key: 'chat',
      label: 'Chat',
      icon: 'fa-comment',
      title: `Recent chat: ${sceneCue.chatMessage.body}`,
      className: 'border-pink-100 bg-pink-50 text-pink-600',
    });
  }

  sceneCue?.requestBadges?.slice(0, 2).forEach((badge) => {
    addBadge(badge);
  });

  if (presence.voiceRoomName) {
    addBadge({
      key: 'voice',
      label: presence.isVoiceMuted ? 'Muted' : 'Voice',
      icon: presence.isVoiceMuted ? 'fa-microphone-slash' : 'fa-microphone',
      title: presence.voiceRoomName,
      className: 'border-violet-100 bg-violet-50 text-violet-700',
    });
  }

  if (presence.eventName) {
    addBadge({
      key: 'event',
      label: 'Event',
      icon: 'fa-star',
      title: presence.eventName,
      className: 'border-amber-100 bg-amber-50 text-amber-700',
    });
  }

  if (presence.intent) {
    const intentMeta = getPresenceIntentMeta(presence.intent);
    if (intentMeta && presence.intent.kind !== 'explore') {
      addBadge({
        key: `intent:${presence.intent.kind}`,
        label: intentMeta.label,
        icon: intentMeta.icon,
        title: presence.intent.detail || presence.intent.label,
        className: intentMeta.className,
      });
    }
  }

  if (presence.party) {
    addBadge({
      key: 'party',
      label: 'Party',
      icon: 'fa-users',
      title: presence.party,
      className: 'border-pink-100 bg-pink-50 text-pink-600',
    });
  }

  if (presence.guild) {
    addBadge({
      key: 'guild',
      label: 'Guild',
      icon: 'fa-shield-heart',
      title: presence.guild,
      className: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    });
  }

  if (/trade|trading|market/i.test(presence.activity)) {
    addBadge({
      key: 'trade',
      label: 'Trade',
      icon: 'fa-handshake',
      title: presence.activity,
      className: 'border-amber-100 bg-amber-50 text-amber-800',
    });
  }

  return badges.slice(0, 5);
}

function getAvatarActivityPropMeta(presence: WorldPresence, sceneCue?: AvatarSceneCue): AvatarActivityPropMeta {
  const intentKind = presence.intent?.kind;
  const activityText = `${presence.activity} ${presence.status}`;

  if (sceneCue?.chatMessage || intentKind === 'chat' || /chat|talk/i.test(activityText)) {
    return {
      key: 'chat',
      kind: 'chat',
      label: 'Chat',
      icon: 'fa-comment',
      color: '#ec4899',
      accent: '#fce7f3',
    };
  }

  if (presence.voiceRoomName || intentKind === 'voice') {
    return {
      key: 'voice',
      kind: 'voice',
      label: presence.isVoiceMuted ? 'Muted' : 'Voice',
      icon: presence.isVoiceMuted ? 'fa-microphone-slash' : 'fa-microphone',
      color: '#7c3aed',
      accent: '#ede9fe',
    };
  }

  if (presence.eventName || intentKind === 'event' || /event|attending|gathering/i.test(activityText)) {
    return {
      key: 'event',
      kind: 'event',
      label: 'Event',
      icon: 'fa-star',
      color: '#ca8a04',
      accent: '#fef3c7',
    };
  }

  if (intentKind === 'trade' || /trade|trading|market/i.test(activityText)) {
    return {
      key: 'trade',
      kind: 'trade',
      label: 'Trade',
      icon: 'fa-handshake',
      color: '#d97706',
      accent: '#fed7aa',
    };
  }

  if (intentKind === 'create' || /creating|content/i.test(activityText)) {
    return {
      key: 'create',
      kind: 'create',
      label: 'Create',
      icon: 'fa-pen-nib',
      color: '#0369a1',
      accent: '#bae6fd',
    };
  }

  if (/work|working/i.test(activityText)) {
    return {
      key: 'work',
      kind: 'work',
      label: 'Work',
      icon: 'fa-hammer',
      color: '#92400e',
      accent: '#fde68a',
    };
  }

  if (presence.status === 'afk' || /afk|away/i.test(activityText)) {
    return {
      key: 'afk',
      kind: 'afk',
      label: 'AFK',
      icon: 'fa-mug-hot',
      color: '#f97316',
      accent: '#ffedd5',
    };
  }

  if (intentKind === 'party' || presence.party) {
    return {
      key: 'party',
      kind: 'party',
      label: 'Party',
      icon: 'fa-users',
      color: '#db2777',
      accent: '#fce7f3',
    };
  }

  if (intentKind === 'guild' || presence.guild) {
    return {
      key: 'guild',
      kind: 'guild',
      label: 'Guild',
      icon: 'fa-shield-heart',
      color: '#059669',
      accent: '#bbf7d0',
    };
  }

  return {
    key: 'explore',
    kind: 'explore',
    label: intentKind === 'follow' ? 'Follow' : 'Explore',
    icon: intentKind === 'follow' ? 'fa-route' : 'fa-compass',
    color: intentKind === 'follow' ? '#0284c7' : '#10b981',
    accent: intentKind === 'follow' ? '#bae6fd' : '#bbf7d0',
  };
}

function getEmoteMeta(emote?: string) {
  return EMOTE_META[emote || 'idle'] || { label: emote || 'Idle', icon: 'fa-face-smile' };
}

function getCosmeticChoice<T extends readonly { id: string }[]>(
  cosmetics: Record<string, unknown> | undefined,
  key: string,
  options: T,
  fallback: T[number]['id']
) {
  const value = cosmetics?.[key];
  return typeof value === 'string' && options.some(option => option.id === value) ? value : fallback;
}

function getAvatarCosmetics(presence: Pick<WorldPresence, 'cosmetics'> | Pick<CharacterProfile, 'cosmetics'>) {
  return {
    aura: getCosmeticChoice(presence.cosmetics, 'aura', COSMETIC_AURAS, 'none'),
    trail: getCosmeticChoice(presence.cosmetics, 'trail', COSMETIC_TRAILS, 'none'),
    nameplate: getCosmeticChoice(presence.cosmetics, 'nameplate', COSMETIC_NAMEPLATES, 'classic'),
  };
}

function getCosmeticAuraOption(id: string) {
  return COSMETIC_AURAS.find(option => option.id === id) || COSMETIC_AURAS[0];
}

function getCosmeticTrailOption(id: string) {
  return COSMETIC_TRAILS.find(option => option.id === id) || COSMETIC_TRAILS[0];
}

function getCosmeticNameplateOption(id: string) {
  return COSMETIC_NAMEPLATES.find(option => option.id === id) || COSMETIC_NAMEPLATES[0];
}

function getActivityActionLine(action: WorldSocialAction) {
  if (action.type === 'npc_interact' && typeof action.metadata?.portalName === 'string') {
    return `${action.fromName} visited ${action.metadata.portalName}`;
  }
  if (action.type === 'npc_interact') return `${action.fromName} spoke with ${action.toName || 'an NPC'}`;
  if (action.type === 'view_profile') return `${action.fromName} viewed ${action.toName || 'a character'}`;
  if (action.type === 'start_chat') return `${action.fromName} started chat with ${action.toName || 'someone'}`;
  if (action.type === 'voice_call') return `${action.fromName} requested voice with ${action.toName || 'someone'}`;
  if (action.type === 'follow_user') return `${action.fromName} followed ${action.toName || 'someone'}`;
  if (action.type === 'add_friend') return `${action.fromName} sent a friend request to ${action.toName || 'someone'}`;
  if (action.type === 'invite_party') return `${action.fromName} invited ${action.toName || 'someone'} to a party`;
  if (action.type === 'invite_guild') return `${action.fromName} invited ${action.toName || 'someone'} to a guild`;
  if (action.type === 'trade') return `${action.fromName} requested a trade with ${action.toName || 'someone'}`;
  if (action.type === 'collaborate') return `${action.fromName} requested collaboration with ${action.toName || 'someone'}`;
  if (action.type === 'activity_feed') return `${action.fromName} checked ${action.toName || 'a character'}'s activity`;
  if (action.type === 'join_activity') return `${action.fromName} joined ${action.toName || 'someone'}'s activity`;
  return `${action.fromName} made a world action`;
}

function formatActionTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getWorldEventMetadataString(event: WorldEvent | null | undefined, key: string) {
  const value = event?.metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getWorldEventMetadataNumber(event: WorldEvent | null | undefined, key: string) {
  const value = event?.metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatPortalDate(value?: Date | string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getInteractionMediaCount(item: Interaction) {
  return item.mediaItems?.length || (item.media ? 1 : 0);
}

function getLetterState(letter: LoveLetterMessage) {
  const unlockDate = new Date(letter.unlockDate);
  const isLocked = !Number.isNaN(unlockDate.getTime()) && unlockDate.getTime() > Date.now();
  if (isLocked) return { label: `Unlocks ${formatPortalDate(letter.unlockDate)}`, className: 'bg-amber-100 text-amber-700', icon: 'fa-lock' };
  if (!letter.isRead) return { label: 'Unread', className: 'bg-pink-100 text-pink-700', icon: 'fa-envelope' };
  return { label: 'Read', className: 'bg-stone-100 text-stone-500', icon: 'fa-envelope-open' };
}

function getChatMetadataNumber(message: WorldChatMessage, key: string) {
  const value = message.metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isNearbySpeechChannel(message: WorldChatMessage) {
  return message.channel === 'world' && message.metadata?.speechMode === 'nearby';
}

function getChatSpatialDistance(message: WorldChatMessage, selfPosition: WorldPresenceVector) {
  const x = getChatMetadataNumber(message, 'senderX');
  const z = getChatMetadataNumber(message, 'senderZ');
  if (x === undefined || z === undefined) return null;
  return Math.hypot(selfPosition.x - x, selfPosition.z - z);
}

function isNearbySpeechMessage(message: WorldChatMessage, selfPosition: WorldPresenceVector) {
  if (!isNearbySpeechChannel(message)) return false;
  const distance = getChatSpatialDistance(message, selfPosition);
  return distance === null || distance <= NEARBY_SPEECH_RANGE;
}

function getChatAudience(message: WorldChatMessage) {
  if (isNearbySpeechChannel(message)) return 'nearby';
  if (message.channel === 'direct') return message.toName ? `to ${message.toName}` : 'direct';
  if (message.channel === 'party') {
    const partyName = typeof message.metadata?.partyName === 'string' ? message.metadata.partyName : '';
    return partyName || 'party';
  }
  if (message.channel === 'guild') {
    const guildName = typeof message.metadata?.guildName === 'string' ? message.metadata.guildName : '';
    return guildName || 'guild';
  }
  return message.channel === 'world' ? 'world' : message.channel;
}

function getChatAudienceDisplay(message: WorldChatMessage, selfPosition: WorldPresenceVector) {
  if (!isNearbySpeechChannel(message)) return getChatAudience(message);
  const distance = getChatSpatialDistance(message, selfPosition);
  if (distance === null) return 'nearby';
  return `nearby ${distance < 10 ? distance.toFixed(1) : Math.round(distance)}m`;
}

function getRequestTitle(type: WorldActionType) {
  if (type === 'voice_call') return 'Voice Call';
  if (type === 'invite_party') return 'Party Invite';
  if (type === 'invite_guild') return 'Guild Invite';
  if (type === 'trade') return 'Trade';
  if (type === 'collaborate') return 'Collaborate';
  return getActionLabel(type);
}

function getRequestIcon(type: WorldActionType) {
  if (type === 'voice_call') return 'fa-microphone';
  if (type === 'invite_party') return 'fa-users';
  if (type === 'invite_guild') return 'fa-shield-heart';
  if (type === 'trade') return 'fa-handshake';
  if (type === 'collaborate') return 'fa-pen-nib';
  return 'fa-bell';
}

function getNpcActionIcon(intent: string) {
  if (/guild/i.test(intent)) return 'fa-shield-heart';
  if (/party/i.test(intent)) return 'fa-users';
  if (/event/i.test(intent)) return 'fa-star';
  if (/market/i.test(intent)) return 'fa-store';
  if (/gift/i.test(intent)) return 'fa-gift';
  if (/title/i.test(intent)) return 'fa-award';
  if (/craft|gear/i.test(intent)) return 'fa-hammer';
  if (/object|inspect/i.test(intent)) return 'fa-cube';
  return 'fa-comment-dots';
}

function getCompactRequestLabel(type: WorldActionType) {
  if (type === 'voice_call') return 'Voice';
  if (type === 'invite_party') return 'Party';
  if (type === 'invite_guild') return 'Guild';
  if (type === 'collaborate') return 'Collab';
  if (type === 'trade') return 'Trade';
  return getRequestTitle(type);
}

function getSocialActionLinkMeta(type: WorldActionType) {
  if (type === 'start_chat') return { icon: 'fa-comment', color: '#ec4899', softColor: '#fce7f3' };
  if (type === 'voice_call') return { icon: 'fa-microphone', color: '#8b5cf6', softColor: '#ede9fe' };
  if (type === 'follow_user') return { icon: 'fa-route', color: '#38bdf8', softColor: '#e0f2fe' };
  if (type === 'add_friend') return { icon: 'fa-user-plus', color: '#f472b6', softColor: '#fce7f3' };
  if (type === 'invite_party') return { icon: 'fa-users', color: '#ec4899', softColor: '#fce7f3' };
  if (type === 'invite_guild') return { icon: 'fa-shield-heart', color: '#059669', softColor: '#dcfce7' };
  if (type === 'trade') return { icon: 'fa-handshake', color: '#f59e0b', softColor: '#fef3c7' };
  if (type === 'collaborate') return { icon: 'fa-pen-nib', color: '#0ea5e9', softColor: '#e0f2fe' };
  if (type === 'join_activity') return { icon: 'fa-door-open', color: '#f97316', softColor: '#ffedd5' };
  return { icon: getRequestIcon(type), color: '#10b981', softColor: '#dcfce7' };
}

function isInteractionSessionType(type: WorldActionType) {
  return INTERACTION_SESSION_TYPES.has(type);
}

function getRequestCounterpart(request: WorldSocialAction, selfUserId: string) {
  const isIncoming = request.toUserId === selfUserId;
  return {
    userId: isIncoming ? request.fromUserId : request.toUserId || '',
    name: isIncoming ? request.fromName : request.toName || 'Explorer',
    isIncoming,
  };
}

function getAvatarRequestCue(request: WorldSocialAction, selfUserId: string): AvatarRequestCue | null {
  if (!request.toUserId) return null;
  if (request.status !== 'requested' && request.status !== 'accepted') return null;

  const counterpart = getRequestCounterpart(request, selfUserId);
  if (!counterpart.userId) return null;

  const active = request.status === 'accepted';
  const outgoing = request.fromUserId === selfUserId;
  const title = getRequestTitle(request.type);
  const direction: AvatarRequestCue['direction'] = active ? 'active' : counterpart.isIncoming ? 'incoming' : 'outgoing';
  const ready = active && isInteractionSessionType(request.type)
    ? getSessionReadyState(request, selfUserId)
    : null;
  const label = active
    ? isInteractionSessionType(request.type) ? 'Session' : 'Active'
    : outgoing ? 'Sent' : getCompactRequestLabel(request.type);
  const detail = active
    ? ready ? `${title}: ${ready.readyCount}/2 ready with ${counterpart.name}` : `${title} active with ${counterpart.name}`
    : outgoing ? `${title} sent to ${counterpart.name}` : `${title} from ${counterpart.name}`;
  const className = active
    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
    : outgoing
      ? 'border-stone-200 bg-stone-100 text-stone-600'
      : 'border-violet-100 bg-violet-50 text-violet-700';

  return {
    key: `request:${request.id}`,
    requestId: request.id,
    label,
    icon: getRequestIcon(request.type),
    title: detail,
    className,
    status: request.status,
    direction,
  };
}

function getSessionReadyState(session: WorldSocialAction, selfUserId: string) {
  const senderReady = session.metadata?.senderReady === true;
  const recipientReady = session.metadata?.recipientReady === true;
  const isSender = session.fromUserId === selfUserId;
  const isRecipient = session.toUserId === selfUserId;

  return {
    senderReady,
    recipientReady,
    selfReady: isSender ? senderReady : isRecipient ? recipientReady : false,
    otherReady: isSender ? recipientReady : senderReady,
    readyCount: Number(senderReady) + Number(recipientReady),
    allReady: senderReady && recipientReady,
  };
}

function getSessionAccent(type: WorldActionType) {
  if (type === 'trade') {
    return {
      border: 'border-amber-100',
      badge: 'bg-amber-100 text-amber-800',
      text: 'text-amber-700',
      button: 'bg-amber-600 hover:bg-amber-500',
      icon: 'fa-handshake',
    };
  }

  return {
    border: 'border-sky-100',
    badge: 'bg-sky-100 text-sky-800',
    text: 'text-sky-700',
    button: 'bg-sky-700 hover:bg-sky-600',
    icon: 'fa-pen-nib',
  };
}

function getRelationshipStatus(relationships: WorldRelationship[], selfUserId: string, targetUserId: string) {
  const outgoingFollow = relationships.find(relationship => (
    relationship.type === 'follow' &&
    relationship.status === 'active' &&
    relationship.fromUserId === selfUserId &&
    relationship.toUserId === targetUserId
  ));
  const acceptedFriend = relationships.find(relationship => (
    relationship.type === 'friend' &&
    relationship.status === 'accepted' &&
    (
      (relationship.fromUserId === selfUserId && relationship.toUserId === targetUserId) ||
      (relationship.fromUserId === targetUserId && relationship.toUserId === selfUserId)
    )
  ));
  const outgoingFriend = relationships.find(relationship => (
    relationship.type === 'friend' &&
    relationship.status === 'pending' &&
    relationship.fromUserId === selfUserId &&
    relationship.toUserId === targetUserId
  ));
  const incomingFriend = relationships.find(relationship => (
    relationship.type === 'friend' &&
    relationship.status === 'pending' &&
    relationship.fromUserId === targetUserId &&
    relationship.toUserId === selfUserId
  ));

  return {
    isFollowing: Boolean(outgoingFollow),
    isFriend: Boolean(acceptedFriend),
    hasPendingFriend: Boolean(outgoingFriend),
    hasIncomingFriend: Boolean(incomingFriend),
    label: acceptedFriend ? 'Friend' : outgoingFollow ? 'Following' : incomingFriend ? 'Friend Request' : outgoingFriend ? 'Pending' : '',
  };
}

function getPresenceSocialLinkKind(
  selfPresence: WorldPresence,
  targetPresence: WorldPresence,
  activeFollowTargetId?: string | null
): PresenceSocialLinkKind | null {
  if (activeFollowTargetId === targetPresence.userId) return 'follow';
  if (selfPresence.partyId && targetPresence.partyId === selfPresence.partyId) return 'party';
  if (selfPresence.guildId && targetPresence.guildId === selfPresence.guildId) return 'guild';
  return null;
}

function getRelationshipActionLabel(
  actionType: WorldActionType,
  fallback: string,
  relationship?: ReturnType<typeof getRelationshipStatus> | null
) {
  if (actionType === 'follow_user' && relationship?.isFollowing) return 'Follow User';
  if (actionType === 'add_friend' && relationship?.isFriend) return 'Friend';
  if (actionType === 'add_friend' && relationship?.hasIncomingFriend) return 'Accept Friend';
  if (actionType === 'add_friend' && relationship?.hasPendingFriend) return 'Pending';
  return fallback;
}

function getCompactActionLabel(
  action: WorldActionDescriptor,
  relationship: ReturnType<typeof getRelationshipStatus> | null | undefined,
  isLiveFollowAction: boolean
) {
  if (isLiveFollowAction) return 'Stop';
  if (action.type === 'add_friend' && relationship?.isFriend) return 'Friend';
  if (action.type === 'add_friend' && relationship?.hasIncomingFriend) return 'Accept';
  if (action.type === 'add_friend' && relationship?.hasPendingFriend) return 'Pending';
  return AVATAR_ACTION_SHORT_LABELS[action.type] || action.label;
}

function getAvatarActionClasses(actionType: WorldActionType, active: boolean, queued = false, needsApproach = false) {
  if (active) return 'bg-emerald-700 text-white border-emerald-600 shadow-emerald-900/20';
  if (queued) return 'bg-amber-100 text-amber-800 border-amber-200 shadow-amber-900/15';
  if (needsApproach) return 'bg-amber-50 text-amber-800 border-amber-100';
  if (actionType === 'voice_call') return 'bg-violet-50 text-violet-700 border-violet-100';
  if (actionType === 'trade') return 'bg-amber-50 text-amber-800 border-amber-100';
  if (actionType === 'collaborate') return 'bg-sky-50 text-sky-800 border-sky-100';
  if (actionType === 'add_friend') return 'bg-pink-50 text-pink-700 border-pink-100';
  return 'bg-white/90 text-stone-700 border-white/80';
}

function getAvatarPanelActionClasses(actionType: WorldActionType, active: boolean, queued: boolean, needsApproach: boolean) {
  if (active) return 'bg-emerald-700 text-white hover:bg-emerald-800';
  if (queued) return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
  if (needsApproach) return 'bg-amber-50 text-amber-800 hover:bg-amber-100';
  if (actionType === 'voice_call') return 'bg-violet-50 text-violet-700 hover:bg-violet-100';
  if (actionType === 'trade') return 'bg-amber-50 text-amber-800 hover:bg-amber-100';
  if (actionType === 'collaborate') return 'bg-sky-50 text-sky-800 hover:bg-sky-100';
  if (actionType === 'add_friend') return 'bg-pink-50 text-pink-700 hover:bg-pink-100';
  return 'bg-white/80 text-stone-700 hover:bg-pink-50 hover:text-pink-600';
}

function getAvatarActionRangeHint(
  actionType: WorldActionType,
  distance: number | null,
  ready: boolean,
  queuedActionType?: WorldActionType | null
) {
  if (queuedActionType === actionType) return 'Approaching';
  if (!AVATAR_PROXIMITY_ACTION_TYPES.has(actionType)) {
    if (actionType === 'view_profile') return 'Inspect';
    if (actionType === 'activity_feed') return 'Observe';
    if (actionType === 'join_activity') return 'Go together';
    if (actionType === 'follow_user') return 'Track';
    return 'World';
  }
  if (ready) return 'Nearby';
  if (distance !== null) return `${distance.toFixed(1)}m away`;
  return 'Move closer';
}

function AvatarActionMenu({
  presence,
  relationship,
  activeFollowTargetId,
  actionDistance,
  actionReady,
  queuedActionType,
  pendingActionType,
  onRunAction,
}: {
  presence: WorldPresence;
  relationship?: ReturnType<typeof getRelationshipStatus> | null;
  activeFollowTargetId?: string | null;
  actionDistance?: number | null;
  actionReady?: boolean;
  queuedActionType?: WorldActionType | null;
  pendingActionType?: WorldActionType | null;
  onRunAction: (action: WorldActionDescriptor, target: WorldPresence) => void;
}) {
  const statusMeta = getStatusMeta(presence.status);
  const ready = actionReady ?? false;

  return (
    <Html center distanceFactor={7.5} position={[0, 3.38, 0]} className="pointer-events-auto" zIndexRange={[90, 0]}>
      <div
        className="relative h-[326px] w-[360px]"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[252px] w-[314px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-pink-100/80 bg-pink-50/15 shadow-[0_18px_60px_rgba(236,72,153,0.12)]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[190px] w-[238px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/80" />
        <div className="absolute left-1/2 top-1/2 h-[118px] w-[118px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-[#fffaf1]/95 p-2 text-center shadow-2xl backdrop-blur-xl">
          <div className="flex h-full flex-col items-center justify-center rounded-full border border-emerald-100 bg-white/70 px-2">
            <span className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-700">
              <i className="fas fa-user-astronaut"></i>
            </span>
            <p className="max-w-[76px] truncate text-[10px] font-black text-stone-800">{presence.name}</p>
            <p className="max-w-[78px] truncate text-[8px] font-black uppercase tracking-wider text-emerald-700">{presence.activity}</p>
            <span className="mt-1 inline-flex max-w-[78px] items-center gap-1 rounded-full bg-[#fffaf1] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-stone-500">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: statusMeta.color }} />
              <span className="truncate">{presence.status}</span>
            </span>
          </div>
        </div>

        {WORLD_ACTIONS.map((action, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(WORLD_ACTIONS.length, 1);
          const x = Math.cos(angle) * 142;
          const y = Math.sin(angle) * 114;
          const isLiveFollowAction = action.type === 'follow_user' && activeFollowTargetId === presence.userId;
          const label = getCompactActionLabel(action, relationship, isLiveFollowAction);
          const queued = queuedActionType === action.type;
          const needsApproach = AVATAR_PROXIMITY_ACTION_TYPES.has(action.type) && !ready;
          const hint = isLiveFollowAction
            ? 'Following'
            : getAvatarActionRangeHint(action.type, actionDistance ?? null, ready, queuedActionType);
          const loading = pendingActionType === action.type;
          return (
            <button
              key={action.type}
              type="button"
              disabled={Boolean(pendingActionType)}
              onClick={() => onRunAction(action, presence)}
              className={`absolute flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full border px-1 text-[8px] font-black shadow-xl transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 ${getAvatarActionClasses(action.type, isLiveFollowAction, queued, needsApproach)}`}
              style={{
                left: `calc(50% + ${x}px - 29px)`,
                top: `calc(50% + ${y}px - 29px)`,
              }}
              title={`${action.label} ${presence.name} / ${hint}`}
            >
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : isLiveFollowAction ? 'fa-route' : action.icon} mb-0.5 text-sm`}></i>
              <span className="block max-w-[44px] truncate leading-none">{label}</span>
              <span className="mt-0.5 block max-w-[48px] truncate text-[6.5px] uppercase tracking-wider opacity-70">{hint}</span>
            </button>
          );
        })}
      </div>
    </Html>
  );
}

function AvatarWorldPassport({
  presence,
  relationship,
  actionDistance,
  actionReady,
  queuedActionType,
  activityEntries,
  onOpenActivityFeed,
  isActivityFeedLoading,
  isActivityFeedLoaded,
  profileSummary,
  profilePresence,
  onOpenProfile,
  isProfileOpen,
  isProfileLoading,
  isActivityOpen,
  isDirectChatOpen,
  directChatMessages,
  directChatDraft,
  onDirectChatDraftChange,
  onDirectChatSubmit,
  onDirectChatClose,
  isDirectChatSending,
  requests,
  selfUserId,
  pendingRequestId,
  onRespondRequest,
  onOpenRequestContext,
  onOpenRequestChat,
  onOpenCharacterSheet,
  voiceRoom,
  voiceMediaLabel,
  voiceInputPercent,
  isVoiceMuted,
  isVoiceUpdating,
  onToggleVoiceMute,
  onLeaveVoiceRoom,
}: {
  presence: WorldPresence;
  relationship?: ReturnType<typeof getRelationshipStatus> | null;
  actionDistance?: number | null;
  actionReady?: boolean;
  queuedActionType?: WorldActionType | null;
  activityEntries?: SelectedActivityEntry[];
  onOpenActivityFeed?: (presence: WorldPresence) => void;
  isActivityFeedLoading?: boolean;
  isActivityFeedLoaded?: boolean;
  profileSummary?: WorldActivityFeed['profile'];
  profilePresence?: WorldActivityFeed['presence'];
  onOpenProfile?: (presence: WorldPresence) => void;
  isProfileOpen?: boolean;
  isProfileLoading?: boolean;
  isActivityOpen?: boolean;
  isDirectChatOpen?: boolean;
  directChatMessages?: WorldChatMessage[];
  directChatDraft?: string;
  onDirectChatDraftChange?: (value: string) => void;
  onDirectChatSubmit?: (event?: React.FormEvent) => void;
  onDirectChatClose?: () => void;
  isDirectChatSending?: boolean;
  requests?: WorldSocialAction[];
  selfUserId?: string;
  pendingRequestId?: string | null;
  onRespondRequest?: (request: WorldSocialAction, response: WorldRequestResponse) => void;
  onOpenRequestContext?: (request: WorldSocialAction) => void;
  onOpenRequestChat?: (request: WorldSocialAction) => void;
  onOpenCharacterSheet?: (presence: WorldPresence) => void;
  voiceRoom?: WorldVoiceRoom | null;
  voiceMediaLabel?: string;
  voiceInputPercent?: number;
  isVoiceMuted?: boolean;
  isVoiceUpdating?: boolean;
  onToggleVoiceMute?: () => void;
  onLeaveVoiceRoom?: (roomId?: string) => void;
}) {
  const statusMeta = getStatusMeta(presence.status);
  const activityMeta = getActivityMeta(presence.activity);
  const intentMeta = getPresenceIntentMeta(presence.intent);
  const equipment = getEquipment(presence);
  const recentActivityEntries = (activityEntries || []).slice(0, isActivityOpen ? 6 : 4);
  const activityStatusLabel = isActivityFeedLoading ? 'Syncing' : isActivityFeedLoaded ? 'Synced' : 'Live';
  const profileTitle = profileSummary?.title || presence.title || 'Explorer';
  const profileActivity = profileSummary?.activity || presence.activity;
  const profileStatus = profileSummary?.status || presence.status;
  const profileUpdatedAt = profileSummary?.updatedAt || profilePresence?.lastSeen || presence.lastSeen;
  const appearance = getAvatarAppearance(profilePresence || presence);
  const viewerUserId = selfUserId || '';
  const rangeLabel = queuedActionType
    ? 'Approaching'
    : actionReady
      ? 'Ready nearby'
      : actionDistance !== null && actionDistance !== undefined
        ? `${actionDistance.toFixed(1)}m away`
        : 'In world';

  return (
    <Html center distanceFactor={8.5} position={[-1.32, 2.82, 0]} className="pointer-events-auto" zIndexRange={[78, 0]}>
      <div
        className="w-[252px] rounded-md border border-white/80 bg-[#fffaf1]/95 px-3 py-2.5 text-left shadow-xl shadow-stone-900/10 backdrop-blur-md"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-pink-500">World Passport</p>
            <p className="truncate text-sm font-black text-stone-800">{presence.name}</p>
            <p className="truncate text-[10px] font-bold text-emerald-700">{presence.title || 'Explorer'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onOpenCharacterSheet && (
              <button
                type="button"
                onClick={() => onOpenCharacterSheet(presence)}
                className="grid h-6 w-6 place-items-center rounded-full bg-white/80 text-stone-500 shadow-sm transition hover:bg-stone-800 hover:text-white"
                title={`Open ${presence.name} sheet`}
                aria-label={`Open ${presence.name} sheet`}
              >
                <i className="fas fa-up-right-from-square text-[8px]"></i>
              </button>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-stone-600">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusMeta.color }} />
              {statusMeta.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-y border-amber-100/80 py-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black text-stone-800">
              <i className={`fas ${activityMeta.icon} mr-1.5 text-amber-600`}></i>
              {presence.activity}
            </p>
            <p className="truncate text-[8px] font-black uppercase tracking-wider text-stone-400">{presence.currentZone}</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-700">
            {rangeLabel}
          </span>
        </div>

        {presence.intent && intentMeta && presence.intent.kind !== 'explore' && (
          <p className="mt-2 truncate rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-amber-700">
            <i className={`fas ${intentMeta.icon} mr-1.5`}></i>
            {presence.intent.label}
          </p>
        )}

        {relationship?.label && (
          <p className="mt-2 truncate rounded-full border border-sky-100 bg-sky-50 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-sky-700">
            <i className="fas fa-heart-circle-check mr-1.5"></i>
            {relationship.label}
          </p>
        )}

        {voiceRoom && (
          <div className="mt-2 rounded-md border border-violet-100/80 bg-white/75 px-2 py-1.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="truncate text-[7px] font-black uppercase tracking-[0.2em] text-violet-700">Voice Link</p>
              <span className="shrink-0 rounded-full bg-violet-50 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-violet-700">
                {voiceMediaLabel || getVoiceKindMeta(voiceRoom.kind).label}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded bg-[#fffaf1]/85 px-1.5 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-[9px] font-black text-stone-800">{voiceRoom.name}</p>
                <p className="truncate text-[7.5px] font-bold text-stone-500">
                  {voiceRoom.members.length} linked / {isVoiceMuted ? 'muted' : `${voiceInputPercent || 0}% mic`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {onToggleVoiceMute && (
                  <button
                    type="button"
                    onClick={onToggleVoiceMute}
                    disabled={isVoiceUpdating}
                    className={`grid h-6 w-6 place-items-center rounded-full transition disabled:cursor-wait disabled:opacity-60 ${
                      isVoiceMuted
                        ? 'bg-stone-800 text-white hover:bg-stone-700'
                        : 'bg-violet-100 text-violet-700 hover:bg-violet-600 hover:text-white'
                    }`}
                    title={isVoiceMuted ? 'Unmute voice' : 'Mute voice'}
                    aria-label={isVoiceMuted ? 'Unmute voice' : 'Mute voice'}
                  >
                    <i className={`fas ${isVoiceMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-[8px]`}></i>
                  </button>
                )}
                {onLeaveVoiceRoom && (
                  <button
                    type="button"
                    onClick={() => onLeaveVoiceRoom(voiceRoom.id)}
                    disabled={isVoiceUpdating}
                    className="grid h-6 w-6 place-items-center rounded-full bg-white text-rose-500 transition hover:bg-rose-500 hover:text-white disabled:cursor-wait disabled:opacity-60"
                    title="Leave voice"
                    aria-label="Leave voice"
                  >
                    <i className="fas fa-phone-slash text-[8px]"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {isDirectChatOpen && (
          <div className="mt-2 rounded-md border border-pink-100/80 bg-white/75 px-2 py-1.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="truncate text-[7px] font-black uppercase tracking-[0.2em] text-pink-500">
                Direct Chat
              </p>
              {onDirectChatClose && (
                <button
                  type="button"
                  onClick={onDirectChatClose}
                  className="grid h-5 w-5 place-items-center rounded-full bg-white text-stone-400 shadow-sm transition hover:bg-stone-800 hover:text-white"
                  title="Close direct chat"
                  aria-label="Close direct chat"
                >
                  <i className="fas fa-times text-[8px]"></i>
                </button>
              )}
            </div>
            <div className="mb-1.5 max-h-[96px] space-y-1 overflow-y-auto rounded bg-[#fffaf1]/80 p-1.5">
              {directChatMessages && directChatMessages.length > 0 ? (
                directChatMessages.slice(-3).map(message => (
                  <div
                    key={message.id}
                    className={`rounded px-1.5 py-1 ${message.fromUserId === presence.userId ? 'bg-white text-left' : 'bg-emerald-50 text-right'}`}
                  >
                    <p className="truncate text-[7px] font-black uppercase tracking-wider text-stone-400">{message.fromName}</p>
                    <p className="break-words text-[9px] font-bold leading-snug text-stone-700">{message.body}</p>
                  </div>
                ))
              ) : (
                <p className="px-2 py-3 text-center text-[8px] font-black text-stone-400">No messages yet</p>
              )}
            </div>
            <form
              onSubmit={(event) => onDirectChatSubmit?.(event)}
              className="grid grid-cols-[1fr_28px] gap-1.5"
            >
              <input
                value={directChatDraft || ''}
                onChange={(event) => onDirectChatDraftChange?.(event.target.value)}
                maxLength={220}
                placeholder={`Message ${presence.name}`}
                className="h-7 min-w-0 rounded border border-pink-100 bg-[#fffaf1] px-2 text-[10px] font-bold text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-pink-300"
              />
              <button
                type="submit"
                disabled={!directChatDraft?.trim() || isDirectChatSending}
                className="grid h-7 w-7 place-items-center rounded bg-stone-800 text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="Send direct message"
                aria-label="Send direct message"
              >
                <i className={`fas ${isDirectChatSending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-[9px]`}></i>
              </button>
            </form>
          </div>
        )}

        {requests && requests.length > 0 && (
          <div className="mt-2 rounded-md border border-violet-100/80 bg-white/75 px-2 py-1.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="truncate text-[7px] font-black uppercase tracking-[0.2em] text-violet-700">Requests</p>
              <span className="shrink-0 rounded-full bg-violet-50 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-violet-700">
                {requests.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {requests.slice(0, 2).map(request => {
                const counterpart = getRequestCounterpart(request, viewerUserId);
                const isIncoming = counterpart.isIncoming;
                const isOutgoing = request.fromUserId === viewerUserId;
                const readyState = isInteractionSessionType(request.type)
                  ? getSessionReadyState(request, viewerUserId)
                  : null;
                const pending = pendingRequestId === request.id;
                const active = request.status === 'accepted';
                const meta = getSocialActionLinkMeta(request.type);
                return (
                  <div key={request.id} className="rounded bg-[#fffaf1]/85 px-1.5 py-1.5">
                    <div className="mb-1 flex items-center justify-between gap-1.5">
                      <p className="min-w-0 truncate text-[8px] font-black text-stone-800">
                        <i className={`fas ${getRequestIcon(request.type)} mr-1`} style={{ color: meta.color }}></i>
                        {getRequestTitle(request.type)}
                      </p>
                      <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-wider text-stone-500">
                        {active ? 'Active' : isIncoming ? 'Incoming' : 'Sent'}
                      </span>
                    </div>
                    <p className="mb-1 truncate text-[7.5px] font-bold text-stone-500">
                      {isIncoming ? `From ${counterpart.name}` : `To ${counterpart.name}`}
                      {readyState ? ` / ${readyState.readyCount}/2 ready` : ''}
                    </p>
                    {isIncoming && request.status === 'requested' && (
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => onRespondRequest?.(request, 'accept')}
                          disabled={pending}
                          className="h-6 rounded bg-emerald-700 text-[7px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60"
                        >
                          {pending ? <i className="fas fa-spinner fa-spin"></i> : 'Accept'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRespondRequest?.(request, 'decline')}
                          disabled={pending}
                          className="h-6 rounded bg-white text-[7px] font-black uppercase tracking-wider text-stone-600 transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {isOutgoing && request.status === 'requested' && (
                      <button
                        type="button"
                        onClick={() => onRespondRequest?.(request, 'cancel')}
                        disabled={pending}
                        className="h-6 w-full rounded bg-white text-[7px] font-black uppercase tracking-wider text-stone-600 transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60"
                      >
                        {pending ? <i className="fas fa-spinner fa-spin"></i> : 'Cancel'}
                      </button>
                    )}
                    {active && isInteractionSessionType(request.type) && readyState && (
                      <div className="grid grid-cols-4 gap-1">
                        {onOpenRequestContext && (
                          <button
                            type="button"
                            onClick={() => onOpenRequestContext(request)}
                            disabled={pending}
                            className="h-6 rounded bg-white text-[7px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60"
                            title={request.type === 'trade' ? 'Open market context' : 'Open event context'}
                            aria-label={request.type === 'trade' ? 'Open market context' : 'Open event context'}
                          >
                            <i className={`fas ${request.type === 'trade' ? 'fa-store' : 'fa-star'} text-[8px]`}></i>
                          </button>
                        )}
                        {onOpenRequestChat && (
                          <button
                            type="button"
                            onClick={() => onOpenRequestChat(request)}
                            disabled={pending}
                            className="h-6 rounded bg-white text-[7px] font-black uppercase tracking-wider text-pink-600 transition hover:bg-pink-50 disabled:cursor-wait disabled:opacity-60"
                            title="Open session chat"
                            aria-label="Open session chat"
                          >
                            <i className="fas fa-comment text-[8px]"></i>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRespondRequest?.(request, readyState.selfReady ? 'unready' : 'ready')}
                          disabled={pending}
                          className={`h-6 rounded text-[7px] font-black uppercase tracking-wider transition disabled:cursor-wait disabled:opacity-60 ${
                            readyState.selfReady
                              ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {readyState.selfReady ? 'Ready' : 'Mark'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRespondRequest?.(request, 'complete')}
                          disabled={pending || !readyState.allReady}
                          className="h-6 rounded bg-stone-800 text-[7px] font-black uppercase tracking-wider text-white transition hover:bg-stone-700 disabled:cursor-wait disabled:opacity-60"
                        >
                          Done
                        </button>
                      </div>
                    )}
                    {active && !isInteractionSessionType(request.type) && (
                      <button
                        type="button"
                        onClick={() => onRespondRequest?.(request, 'complete')}
                        disabled={pending}
                        className="h-6 w-full rounded bg-violet-700 text-[7px] font-black uppercase tracking-wider text-white transition hover:bg-violet-600 disabled:cursor-wait disabled:opacity-60"
                      >
                        {pending ? <i className="fas fa-spinner fa-spin"></i> : 'Complete'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isProfileOpen && (
          <div className="mt-2 rounded-md border border-emerald-100/80 bg-white/70 px-2 py-1.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[7px] font-black uppercase tracking-[0.2em] text-emerald-700">Profile Dossier</p>
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={() => onOpenProfile(presence)}
                  disabled={isProfileLoading}
                  className="grid h-5 w-5 place-items-center rounded-full bg-white text-emerald-600 shadow-sm transition hover:bg-emerald-600 hover:text-white disabled:cursor-wait disabled:opacity-60"
                  title={`Refresh ${presence.name}'s profile`}
                  aria-label={`Refresh ${presence.name}'s profile`}
                >
                  <i className={`fas ${isProfileLoading ? 'fa-spinner fa-spin' : 'fa-id-card'} text-[8px]`}></i>
                </button>
              )}
            </div>
            <div className="grid grid-cols-[38px_1fr] gap-2">
              <div
                className="flex h-[38px] w-[38px] items-center justify-center rounded-md border border-white/80 shadow-inner"
                style={{ background: appearance.bodyColor }}
              >
                <div
                  className="h-6 w-6 rounded-full border-2"
                  style={{
                    background: appearance.skinColor,
                    borderColor: appearance.trimColor,
                  }}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black text-stone-800">{profileTitle}</p>
                <p className="truncate text-[8px] font-black text-emerald-700">{profileActivity}</p>
                <p className="truncate text-[7px] font-black uppercase tracking-wider text-stone-400">
                  {profileStatus} / {formatActionTime(profileUpdatedAt)}
                </p>
              </div>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              {[appearance.bodyColor, appearance.trimColor, appearance.hairColor].map(color => (
                <span
                  key={color}
                  className="h-2 rounded-full border border-white"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            {isProfileLoading && !profileSummary && (
              <p className="mt-1.5 truncate text-[8px] font-black uppercase tracking-wider text-stone-400">
                <i className="fas fa-spinner fa-spin mr-1"></i>
                Inspecting
              </p>
            )}
          </div>
        )}

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {INVENTORY_SLOTS.map(({ slot, icon, label }) => (
            <div key={slot} className="min-w-0 rounded-md bg-white/70 px-2 py-1.5">
              <p className="truncate text-[7px] font-black uppercase tracking-wider text-stone-400">
                <i className={`fas ${icon} mr-1 text-amber-600`}></i>
                {label}
              </p>
              <p className="truncate text-[8px] font-black text-stone-700">{getEquipmentLabel(equipment[slot])}</p>
            </div>
          ))}
        </div>

        {presence.achievements && presence.achievements.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {presence.achievements.slice(0, 4).map(achievement => (
              <span
                key={achievement.achievementKey}
                className="inline-flex max-w-[96px] items-center gap-1 truncate rounded-full bg-amber-100 px-2 py-0.5 text-[7px] font-black uppercase tracking-wider text-amber-700"
                title={achievement.titleReward || achievement.name}
              >
                <i className={`fas ${achievement.icon} shrink-0`}></i>
                <span className="truncate">{achievement.name}</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 rounded-md border border-pink-100/80 bg-white/70 px-2 py-1.5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[7px] font-black uppercase tracking-[0.2em] text-pink-500">
              {isActivityOpen ? 'Activity Feed' : 'Recent Trace'}
            </p>
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-pink-600">
                <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
                {activityStatusLabel}
              </span>
              {onOpenActivityFeed && (
                <button
                  type="button"
                  onClick={() => onOpenActivityFeed(presence)}
                  disabled={isActivityFeedLoading}
                  className="grid h-5 w-5 place-items-center rounded-full bg-white text-pink-500 shadow-sm transition hover:bg-pink-500 hover:text-white disabled:cursor-wait disabled:opacity-60"
                  title={`Sync ${presence.name}'s activity`}
                  aria-label={`Sync ${presence.name}'s activity`}
                >
                  <i className={`fas ${isActivityFeedLoading ? 'fa-spinner fa-spin' : 'fa-rotate'} text-[8px]`}></i>
                </button>
              )}
            </div>
          </div>
          {recentActivityEntries.length > 0 ? (
            <div className="space-y-1">
              {recentActivityEntries.map(entry => {
                const isChat = entry.kind === 'chat';
                return (
                  <div key={entry.id} className="grid grid-cols-[18px_1fr_auto] items-center gap-1.5 rounded bg-[#fffaf1]/80 px-1.5 py-1">
                    <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-pink-50 text-pink-500">
                      <i className={`fas ${isChat ? 'fa-comment' : 'fa-compass'} text-[8px]`}></i>
                    </span>
                    <p className="min-w-0 truncate text-[8px] font-black text-stone-700">
                      {isChat ? entry.message.body : getActivityActionLine(entry.action)}
                    </p>
                    <span className="shrink-0 text-[7px] font-black uppercase tracking-wider text-stone-400">
                      {formatActionTime(entry.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded bg-[#fffaf1]/80 px-2 py-1.5 text-[8px] font-black text-stone-500">
              No visible trace yet
            </p>
          )}
        </div>
      </div>
    </Html>
  );
}

function getLandBaseName(activeLandName?: string | null) {
  const base = (activeLandName || 'Narinyland').replace(/\s+Commons$/i, '').trim();
  return base || 'Narinyland';
}

function getZoneName(activeLandName: string | undefined, district: WorldDistrict) {
  const base = getLandBaseName(activeLandName);
  return district.id === 'commons' ? `${base} Commons` : `${base} · ${district.name}`;
}

function storedZoneBelongsToLand(storedZone: string | null | undefined, activeLandName?: string | null) {
  const zone = storedZone?.trim().toLowerCase();
  if (!zone) return true;

  const base = getLandBaseName(activeLandName).toLowerCase();
  return zone === `${base} commons` || zone.startsWith(`${base} `);
}

function getProfileSpawnPosition(profile: CharacterProfile, activeLandName: string | undefined, landObjects: PurchasedItem[]) {
  const sourcePosition = storedZoneBelongsToLand(profile.lastZone, activeLandName)
    ? profile.lastPosition
    : DEFAULT_POSITION;

  return getSafeSpawnPosition(normalizeSpawnPosition(sourcePosition), landObjects);
}

function getProfileLandSpawnPosition(
  profile: CharacterProfile,
  landKey: string,
  activeLandName: string | undefined,
  landObjects: PurchasedItem[]
) {
  const savedMapPosition = profile.lastMapPositions?.[landKey];
  if (savedMapPosition) {
    return getSafeSpawnPosition(normalizeSpawnPosition(savedMapPosition.position), landObjects);
  }

  return getProfileSpawnPosition(profile, activeLandName, landObjects);
}

function getDistrictPrimaryAction(district: WorldDistrict) {
  switch (district.id) {
    case 'market':
      return { label: 'Browse Market', icon: 'fa-store', hint: 'Keepsakes and avatar gear' };
    case 'guild-hall':
      return { label: 'Guild Hall', icon: 'fa-shield-heart', hint: 'Create or open your guild' };
    case 'event-lawn':
      return { label: 'Join Event', icon: 'fa-star', hint: 'Gather with the world' };
    case 'workshop':
      return { label: 'Customize', icon: 'fa-hammer', hint: 'Avatar style and equipment' };
    default:
      return { label: 'World Chat', icon: 'fa-comment', hint: 'Talk with nearby players' };
  }
}

function getDistrictPresenceMeta(district: WorldDistrict): ZonePresenceMeta {
  switch (district.id) {
    case 'market':
      return { activity: 'Trading', status: 'trading', emote: 'dance', label: 'Trading at Market', icon: 'fa-handshake' };
    case 'guild-hall':
      return { activity: 'Chatting', status: 'chatting', emote: 'wave', label: 'At Guild Hall', icon: 'fa-shield-heart' };
    case 'event-lawn':
      return { activity: 'Attending events', status: 'event', emote: 'heart', label: 'At Event Lawn', icon: 'fa-star' };
    case 'workshop':
      return { activity: 'Working', status: 'working', emote: 'idle', label: 'Working in Workshop', icon: 'fa-hammer' };
    case 'commons':
      return { activity: 'Exploring', status: 'online', emote: 'wave', label: 'In Commons', icon: 'fa-tree-city' };
    default:
      return { activity: 'Exploring', status: 'exploring', emote: 'idle', label: 'Exploring Paths', icon: 'fa-route' };
  }
}

function getDistrictTrafficRoute(
  district: WorldDistrict,
  summary: DistrictPresenceSummary,
  active: boolean
): WorldTrafficRoute {
  const activityMeta = getActivityMeta(summary.topActivity);
  const statusMeta = getStatusMeta(activityMeta.status);
  const intentMeta = summary.topIntentKind ? PRESENCE_INTENT_META[summary.topIntentKind] : null;
  const color = active ? '#ec4899' : intentMeta?.color || statusMeta.color;
  const softColor = active ? '#fbcfe8' : district.color;
  const peopleLabel = summary.count === 1
    ? summary.names[0] || '1 avatar'
    : `${summary.count} avatars`;
  const detail = summary.voiceCount > 0
    ? `${summary.voiceCount} in voice / ${summary.topActivity}`
    : summary.movingCount > 0
      ? `${summary.movingCount} moving / ${summary.topActivity}`
      : intentMeta
        ? `${intentMeta.label} / ${summary.topActivity}`
        : summary.topActivity;

  return {
    id: `traffic:${district.id}`,
    district,
    summary,
    active,
    color,
    softColor,
    icon: intentMeta?.icon || activityMeta.icon,
    label: active ? `${district.name} route` : `${peopleLabel} in ${district.name}`,
    detail,
    particleCount: Math.min(6, Math.max(1, summary.movingCount + Math.ceil(summary.count / 2))),
    speed: 0.18 + summary.movingCount * 0.045 + (active ? 0.04 : 0),
  };
}

function getDistrictById(id: WorldDistrict['id']) {
  return WORLD_DISTRICTS.find(district => district.id === id) || COMMONS_DISTRICT;
}

function getDistrictForPosition(position: WorldPresenceVector): WorldDistrict {
  const district = WORLD_DISTRICTS.find((zone) => {
    const dx = position.x - zone.position[0];
    const dz = position.z - zone.position[2];
    return Math.sqrt(dx * dx + dz * dz) <= zone.radius;
  });

  if (district) return district;

  const dx = position.x - COMMONS_DISTRICT.position[0];
  const dz = position.z - COMMONS_DISTRICT.position[2];
  return Math.sqrt(dx * dx + dz * dz) <= COMMONS_DISTRICT.radius ? COMMONS_DISTRICT : PATHS_DISTRICT;
}

function getAvatarActivityJoinKind(presence: WorldPresence): AvatarActivityJoinKind {
  if (presence.intent?.kind === 'event') return 'event';
  if (presence.intent?.kind === 'trade') return 'trade';
  if (presence.intent?.kind === 'create') return 'create';
  if (presence.intent?.kind === 'voice') return 'voice';
  if (presence.intent?.kind === 'party') return 'party';
  if (presence.intent?.kind === 'guild') return 'guild';
  if (presence.intent?.kind === 'chat') return 'chat';

  const activityText = [
    presence.activity,
    presence.status,
    presence.currentZone,
    presence.intent?.kind,
    presence.intent?.label,
    presence.intent?.detail,
    presence.eventName,
    presence.party,
    presence.guild,
  ].filter(Boolean).join(' ').toLowerCase();

  if (presence.eventId || /\bevent|attending|gathering|lawn/.test(activityText)) return 'event';
  if (/\btrade|trading|market|shop|store/.test(activityText)) return 'trade';
  if (/\bcreate|creating|working|workshop|custom|craft/.test(activityText)) return 'create';
  if (presence.voiceRoomId || /\bvoice|call|talking/.test(activityText)) return 'voice';
  if (presence.partyId || /\bparty|squad/.test(activityText)) return 'party';
  if (presence.guildId || /\bguild|hall/.test(activityText)) return 'guild';
  if (/\bchat|chatting|message/.test(activityText)) return 'chat';
  return 'nearby';
}

function getAvatarActivityDistrict(presence: WorldPresence): WorldDistrict {
  const zoneDistrict = getDistrictForZoneName(presence.currentZone);

  switch (getAvatarActivityJoinKind(presence)) {
    case 'event':
      return zoneDistrict.id !== COMMONS_DISTRICT.id ? zoneDistrict : getDistrictById('event-lawn');
    case 'trade':
      return getDistrictById('market');
    case 'create':
      return getDistrictById('workshop');
    case 'guild':
      return getDistrictById('guild-hall');
    default:
      return zoneDistrict.id !== COMMONS_DISTRICT.id ? zoneDistrict : getDistrictForPosition(presence.position);
  }
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function getAvatarPalette(userId: string) {
  return palette[hashString(userId) % palette.length];
}

function getAvatarAppearance(presence: WorldPresence): CharacterAppearance {
  const fallback = getAvatarPalette(presence.userId);
  return {
    bodyColor: presence.appearance?.bodyColor || fallback.body,
    trimColor: presence.appearance?.trimColor || fallback.trim,
    hairColor: presence.appearance?.hairColor || fallback.hair,
    skinColor: presence.appearance?.skinColor || DEFAULT_APPEARANCE.skinColor,
  };
}

function getEquipment(presence: WorldPresence): CharacterEquipment {
  return {
    head: presence.equipment?.head || DEFAULT_EQUIPMENT.head,
    back: presence.equipment?.back || DEFAULT_EQUIPMENT.back,
    hand: presence.equipment?.hand || DEFAULT_EQUIPMENT.hand,
  };
}

function getEquipmentLabel(itemKey?: string) {
  if (!itemKey || itemKey === 'none') return 'None';
  return EQUIPMENT_LABELS[itemKey] || itemKey
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function vectorToObject(vector: THREE.Vector3): WorldPresenceVector {
  return {
    x: Number(vector.x.toFixed(2)),
    y: Number(vector.y.toFixed(2)),
    z: Number(vector.z.toFixed(2)),
  };
}

function normalizeHeading(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Number(THREE.MathUtils.clamp(value, -Math.PI, Math.PI).toFixed(3));
}

function lerpAngle(from: number, to: number, alpha: number) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * alpha;
}

function createPresenceSample(
  position: WorldPresenceVector,
  moving = false,
  velocity: WorldPresenceVector = ZERO_VECTOR,
  heading = 0
): LocalPresenceSample {
  return {
    position,
    moving,
    velocity,
    heading: normalizeHeading(heading),
  };
}

function tupleToPresenceVector(position: [number, number, number]): WorldPresenceVector {
  return {
    x: Number(position[0].toFixed(2)),
    y: Number(position[1].toFixed(2)),
    z: Number(position[2].toFixed(2)),
  };
}

function normalizeSpawnPosition(position?: WorldPresenceVector | null): WorldPresenceVector {
  if (!position) return DEFAULT_POSITION;

  return {
    x: THREE.MathUtils.clamp(Number.isFinite(position.x) ? position.x : DEFAULT_POSITION.x, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2),
    y: THREE.MathUtils.clamp(Number.isFinite(position.y) ? position.y : DEFAULT_POSITION.y, -1, 4),
    z: THREE.MathUtils.clamp(Number.isFinite(position.z) ? position.z : DEFAULT_POSITION.z, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2),
  };
}

function clampCameraZoom(value: number) {
  return THREE.MathUtils.clamp(Number.isFinite(value) ? value : 1, CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX);
}

function getCameraGestureMetrics(points: CameraTouchPoint[]) {
  if (points.length < 2) return null;
  const [first, second] = points;
  const dx = second.x - first.x;
  const dy = second.y - first.y;

  return {
    distance: Math.max(1, Math.sqrt(dx * dx + dy * dy)),
    angle: Math.atan2(dy, dx),
  };
}

function getNormalizedAngleDelta(current: number, previous: number) {
  let delta = current - previous;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function getPresenceDistance(a: WorldPresenceVector, b: WorldPresenceVector) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function getWorldPointDistance(a: WorldPresenceVector, position: [number, number, number]) {
  return getPresenceDistance(a, { x: position[0], y: position[1], z: position[2] });
}

function formatLivePromptDistance(distance: number) {
  if (distance < 0.8) return 'Here';
  if (distance >= 10) return `${Math.round(distance)}m`;
  return `${distance.toFixed(1)}m`;
}

function getLiveMarkerPromptMeta(marker: WorldLiveActivityMarker) {
  if (marker.kind === 'event') {
    return {
      eyebrow: marker.active ? 'Joined event' : 'World event',
      primaryLabel: marker.active ? 'Open' : 'Join',
      secondaryLabel: 'Rally',
      color: marker.color,
    };
  }

  if (marker.kind === 'session') {
    return {
      eyebrow: 'Shared table',
      primaryLabel: 'Open',
      secondaryLabel: 'Chat',
      color: marker.color,
    };
  }

  if (marker.kind === 'party') {
    return {
      eyebrow: 'Party rally',
      primaryLabel: 'Open',
      secondaryLabel: 'Chat',
      color: '#ec4899',
    };
  }

  return {
    eyebrow: 'Guild rally',
    primaryLabel: 'Open',
    secondaryLabel: 'Chat',
    color: '#059669',
  };
}

function getPresencePromptMeta(presence: WorldPresence, joinKind: AvatarActivityJoinKind) {
  if (joinKind === 'event') {
    return {
      eyebrow: 'Nearby event',
      primaryLabel: 'Join',
      secondaryLabel: 'Chat',
      icon: 'fa-star',
      color: '#ec4899',
      detail: presence.eventName || presence.currentZone || presence.activity,
    };
  }

  if (joinKind === 'trade') {
    return {
      eyebrow: 'Market activity',
      primaryLabel: 'Market',
      secondaryLabel: 'Chat',
      icon: 'fa-handshake',
      color: '#d97706',
      detail: presence.currentZone || presence.activity,
    };
  }

  if (joinKind === 'create') {
    return {
      eyebrow: 'Workshop activity',
      primaryLabel: 'Workshop',
      secondaryLabel: 'Chat',
      icon: 'fa-hammer',
      color: '#0369a1',
      detail: presence.currentZone || presence.activity,
    };
  }

  if (joinKind === 'voice') {
    return {
      eyebrow: 'Voice nearby',
      primaryLabel: 'Voice',
      secondaryLabel: 'Chat',
      icon: 'fa-microphone',
      color: '#7c3aed',
      detail: presence.voiceRoomName || presence.currentZone || presence.activity,
    };
  }

  if (joinKind === 'party') {
    return {
      eyebrow: 'Party member',
      primaryLabel: 'Party',
      secondaryLabel: 'Chat',
      icon: 'fa-users',
      color: '#ec4899',
      detail: presence.party || presence.currentZone || presence.activity,
    };
  }

  if (joinKind === 'guild') {
    return {
      eyebrow: 'Guild member',
      primaryLabel: 'Guild',
      secondaryLabel: 'Chat',
      icon: 'fa-shield-heart',
      color: '#059669',
      detail: presence.guild || presence.currentZone || presence.activity,
    };
  }

  return {
    eyebrow: 'Nearby chat',
    primaryLabel: 'Join',
    secondaryLabel: 'Chat',
    icon: 'fa-comment',
    color: '#10b981',
    detail: presence.currentZone || presence.activity,
  };
}

function getLivePromptPriority(prompt: WorldLivePrompt) {
  if (prompt.marker?.kind === 'session') return 0;
  if (prompt.marker?.kind === 'event') return 1;
  if (prompt.marker?.kind === 'party') return 2;
  if (prompt.marker?.kind === 'guild') return 3;
  if (prompt.joinKind === 'event') return 4;
  if (prompt.joinKind === 'voice') return 5;
  if (prompt.joinKind === 'trade') return 6;
  if (prompt.joinKind === 'create') return 7;
  if (prompt.joinKind === 'party') return 8;
  if (prompt.joinKind === 'guild') return 9;
  return 10;
}

function getVoiceSignalMeta(distance?: number) {
  if (distance === undefined) return { label: 'Room voice', strength: 3 };
  if (distance <= PROXIMITY_VOICE_RANGE * 0.34) return { label: 'Close voice', strength: 3 };
  if (distance <= PROXIMITY_VOICE_RANGE * 0.68) return { label: 'Near voice', strength: 2 };
  return { label: 'Edge voice', strength: 1 };
}

function getVoiceRoomMetadataNumber(room: WorldVoiceRoom | null | undefined, key: string) {
  const value = room?.metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getProximityVoiceRoomDistance(room: WorldVoiceRoom | null | undefined, position: WorldPresenceVector) {
  if (!room || room.kind !== 'proximity') return 0;
  const centerX = getVoiceRoomMetadataNumber(room, 'centerX');
  const centerZ = getVoiceRoomMetadataNumber(room, 'centerZ');
  if (centerX === null || centerZ === null) return 0;
  const dx = position.x - centerX;
  const dz = position.z - centerZ;
  return Math.sqrt(dx * dx + dz * dz);
}

function getFollowDestination(self: WorldPresenceVector, target: WorldPresenceVector) {
  const away = new THREE.Vector3(self.x - target.x, 0, self.z - target.z);
  if (away.lengthSq() < 0.01) away.set(0.8, 0, 1);
  away.normalize().multiplyScalar(2.15);

  return new THREE.Vector3(
    THREE.MathUtils.clamp(target.x + away.x, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2),
    0,
    THREE.MathUtils.clamp(target.z + away.z, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2)
  );
}

function getWorldCycle(now: number, worldId?: string | null): WorldCycle {
  const worldOffset = hashString(worldId || 'narinyland') % WORLD_DAY_MS;
  const worldTime = now + worldOffset;
  const progress = ((worldTime % WORLD_DAY_MS) + WORLD_DAY_MS) % WORLD_DAY_MS / WORLD_DAY_MS;
  const hourFloat = progress * 24;
  const hour = Math.floor(hourFloat);
  const minute = Math.floor((hourFloat - hour) * 60);
  const daylight = THREE.MathUtils.clamp(Math.sin(((hourFloat - 6) / 12) * Math.PI), 0, 1);
  const night = 1 - daylight;
  const phase: WorldCyclePhase = hourFloat >= 5 && hourFloat < 8
    ? 'Dawn'
    : hourFloat >= 8 && hourFloat < 17
      ? 'Day'
      : hourFloat >= 17 && hourFloat < 20
        ? 'Dusk'
        : 'Night';
  const weatherSeed = Math.floor((worldTime + worldOffset) / WORLD_WEATHER_BLOCK_MS) + hashString(`${worldId || 'world'}:${phase}`);
  const weatherRoll = Math.abs(weatherSeed) % 4;
  const weather: WorldWeather = phase === 'Night'
    ? (weatherRoll === 0 ? 'Mist' : 'Fireflies')
    : phase === 'Dawn'
      ? (weatherRoll <= 1 ? 'Mist' : 'Petals')
      : phase === 'Dusk'
        ? (weatherRoll <= 1 ? 'Petals' : 'Fireflies')
        : weatherRoll === 0
          ? 'Petals'
          : weatherRoll === 1
            ? 'Mist'
            : 'Clear';
  const daySky = new THREE.Color('#cfe8cf');
  const nightSky = new THREE.Color('#28324f');
  const dawnSky = new THREE.Color('#f9c9b9');
  const sky = daySky
    .clone()
    .lerp(nightSky, night * 0.78)
    .lerp(dawnSky, phase === 'Dawn' || phase === 'Dusk' ? 0.26 : 0)
    .getStyle();
  const fog = new THREE.Color('#dbeecf')
    .lerp(new THREE.Color('#53607c'), night * 0.62)
    .lerp(new THREE.Color('#f3d6c7'), phase === 'Dawn' || phase === 'Dusk' ? 0.18 : 0)
    .getStyle();
  const sun = new THREE.Color('#fff3d4')
    .lerp(new THREE.Color('#f8b9c9'), phase === 'Dawn' || phase === 'Dusk' ? 0.42 : 0)
    .lerp(new THREE.Color('#b7c7ff'), night * 0.28)
    .getStyle();

  return {
    hour,
    minute,
    phase,
    weather,
    progress,
    daylight,
    night,
    sky,
    fog,
    sun,
    ambientIntensity: THREE.MathUtils.lerp(0.22, 0.68, daylight),
    sunIntensity: THREE.MathUtils.lerp(0.25, 1.45, daylight),
  };
}

function formatWorldTime(cycle: WorldCycle) {
  const hour12 = cycle.hour % 12 || 12;
  const suffix = cycle.hour >= 12 ? 'PM' : 'AM';
  return `${hour12}:${cycle.minute.toString().padStart(2, '0')} ${suffix}`;
}

function getWeatherMeta(weather: WorldWeather) {
  switch (weather) {
    case 'Petals':
      return { label: 'Petal drift', icon: 'fa-seedling' };
    case 'Mist':
      return { label: 'Soft mist', icon: 'fa-cloud' };
    case 'Fireflies':
      return { label: 'Fireflies', icon: 'fa-wand-sparkles' };
    default:
      return { label: 'Clear air', icon: 'fa-sun' };
  }
}

function offsetPosition(position: WorldPresenceVector | [number, number, number], seed: string, radius = 0.92): [number, number, number] {
  const x = Array.isArray(position) ? position[0] : position.x;
  const y = Array.isArray(position) ? position[1] : position.y;
  const z = Array.isArray(position) ? position[2] : position.z;
  const angle = (hashString(seed) % 628) / 100;
  return [
    THREE.MathUtils.clamp(x + Math.cos(angle) * radius, -WORLD_BOUNDS + 1.6, WORLD_BOUNDS - 1.6),
    y,
    THREE.MathUtils.clamp(z + Math.sin(angle) * radius, -WORLD_BOUNDS + 1.6, WORLD_BOUNDS - 1.6),
  ];
}

function getDistrictForZoneName(zone?: string | null) {
  if (!zone) return COMMONS_DISTRICT;
  const lowerZone = zone.toLowerCase();
  return WORLD_DISTRICTS.find(district => lowerZone.includes(district.name.toLowerCase())) ||
    (lowerZone.includes('commons') ? COMMONS_DISTRICT : PATHS_DISTRICT);
}

function getActionBeaconPosition(action: WorldSocialAction, presences: WorldPresence[]) {
  const portalId = typeof action.metadata?.portalId === 'string' ? action.metadata.portalId : '';
  const portal = portalId ? WORLD_PORTALS.find(item => item.id === portalId) : null;
  if (portal) return offsetPosition(portal.position, action.id, 0.52);

  const npcId = typeof action.metadata?.npcId === 'string' ? action.metadata.npcId : '';
  const npcX = typeof action.metadata?.npcX === 'number' ? action.metadata.npcX : null;
  const npcZ = typeof action.metadata?.npcZ === 'number' ? action.metadata.npcZ : null;
  if (npcX !== null && npcZ !== null) return offsetPosition({ x: npcX, y: 0, z: npcZ }, action.id, 0.52);
  const npc = npcId ? WORLD_NPCS.find(item => item.id === npcId) : null;
  if (npc) return offsetPosition(npc.position, action.id, 0.52);

  const actor = presences.find(presence => presence.userId === action.fromUserId) ||
    presences.find(presence => presence.userId === action.toUserId);
  if (actor) return offsetPosition(actor.position, action.id, 1.1);

  const zone = typeof action.metadata?.currentZone === 'string' ? action.metadata.currentZone : '';
  return offsetPosition(getDistrictForZoneName(zone).position, action.id, 1.2);
}

function getChatBeaconPosition(message: WorldChatMessage, presences: WorldPresence[]) {
  const speaker = presences.find(presence => presence.userId === message.fromUserId);
  if (speaker) return offsetPosition(speaker.position, message.id, 1);

  const senderX = typeof message.metadata?.senderX === 'number' ? message.metadata.senderX : null;
  const senderZ = typeof message.metadata?.senderZ === 'number' ? message.metadata.senderZ : null;
  if (senderX !== null && senderZ !== null) {
    return offsetPosition({ x: senderX, y: 0, z: senderZ }, message.id, 1);
  }

  const zone = typeof message.metadata?.currentZone === 'string' ? message.metadata.currentZone : '';
  return offsetPosition(getDistrictForZoneName(zone).position, message.id, 1.2);
}

function getVoiceKindMeta(kind: WorldVoiceKind) {
  switch (kind) {
    case 'party':
      return { label: 'Party Voice', icon: 'fa-people-group', color: '#ec4899' };
    case 'guild':
      return { label: 'Guild Voice', icon: 'fa-shield-heart', color: '#059669' };
    case 'direct':
      return { label: 'Direct Voice', icon: 'fa-phone', color: '#8b5cf6' };
    default:
      return { label: 'Nearby Voice', icon: 'fa-microphone', color: '#38bdf8' };
  }
}

function getVoiceRoomZone(room: WorldVoiceRoom) {
  return typeof room.metadata?.currentZone === 'string' ? room.metadata.currentZone : '';
}

function getVoiceRoomPosition(room: WorldVoiceRoom, presences: WorldPresence[]) {
  const memberIds = new Set(room.members.map(member => member.userId));
  const memberPresences = presences.filter(presence => memberIds.has(presence.userId));

  if (memberPresences.length > 0) {
    const center = memberPresences.reduce<WorldPresenceVector>(
      (acc, presence) => ({
        x: acc.x + presence.position.x / memberPresences.length,
        y: 0,
        z: acc.z + presence.position.z / memberPresences.length,
      }),
      { x: 0, y: 0, z: 0 }
    );
    return offsetPosition(center, `voice-room:${room.id}`, room.kind === 'proximity' ? 1.12 : 0.82);
  }

  const zone = getVoiceRoomZone(room);
  return offsetPosition(getDistrictForZoneName(zone).position, `voice-room:${room.id}`, room.kind === 'guild' ? 1.9 : 1.35);
}

function getVoiceOpenMemberCount(room: WorldVoiceRoom) {
  return room.members.filter(member => member.status === 'active' && !member.isMuted).length;
}

function toRtcSessionDescription(payload: Record<string, unknown>): RTCSessionDescriptionInit | null {
  const type = typeof payload.type === 'string' ? payload.type : '';
  const sdp = typeof payload.sdp === 'string' ? payload.sdp : '';
  if ((type !== 'offer' && type !== 'answer' && type !== 'pranswer' && type !== 'rollback') || !sdp) return null;
  return { type: type as RTCSdpType, sdp };
}

function serializeRtcSessionDescription(description: RTCSessionDescription | RTCSessionDescriptionInit | null) {
  if (!description) return {};
  return {
    type: description.type,
    sdp: description.sdp,
  };
}

function toRtcIceCandidate(payload: Record<string, unknown>): RTCIceCandidateInit | null {
  const candidate = typeof payload.candidate === 'string' ? payload.candidate : '';
  if (!candidate) return null;
  return {
    candidate,
    ...(typeof payload.sdpMid === 'string' ? { sdpMid: payload.sdpMid } : {}),
    ...(typeof payload.sdpMLineIndex === 'number' ? { sdpMLineIndex: payload.sdpMLineIndex } : {}),
    ...(typeof payload.usernameFragment === 'string' ? { usernameFragment: payload.usernameFragment } : {}),
  };
}

function serializeRtcIceCandidate(candidate: RTCIceCandidate) {
  return {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    usernameFragment: candidate.usernameFragment,
  };
}

function getEventDistrict(event?: WorldEvent | null) {
  if (!event) return WORLD_DISTRICTS.find(district => district.id === 'event-lawn') || COMMONS_DISTRICT;
  const eventDistrict = event.district.toLowerCase();
  return WORLD_DISTRICTS.find(district => (
    eventDistrict.includes(district.id) ||
    eventDistrict.includes(district.name.toLowerCase())
  )) || getDistrictForZoneName(event.district);
}

function getEventMarkerPosition(event: WorldEvent) {
  const district = getEventDistrict(event);
  return offsetPosition(district.position, `event:${event.id}`, 0.72);
}

function getSessionZone(session: WorldSocialAction) {
  return typeof session.metadata?.sessionZone === 'string' && session.metadata.sessionZone
    ? session.metadata.sessionZone
    : typeof session.metadata?.currentZone === 'string' && session.metadata.currentZone
      ? session.metadata.currentZone
      : typeof session.metadata?.targetZone === 'string' && session.metadata.targetZone
        ? session.metadata.targetZone
        : '';
}

function getActionMetadataString(action: WorldSocialAction, key: string) {
  const value = action.metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getSessionLandId(session: WorldSocialAction) {
  return getActionMetadataString(session, 'sessionLandId') ||
    getActionMetadataString(session, 'currentLandId') ||
    getActionMetadataString(session, 'targetLandId');
}

function isSameWorldScope(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function isInteractionSessionInLand(session: WorldSocialAction, activeLandScopeKey: string) {
  const sessionLandId = getSessionLandId(session);
  if (!sessionLandId || !activeLandScopeKey) return true;
  return isSameWorldScope(sessionLandId, activeLandScopeKey);
}

function isPresenceDeltaInWorldScope(delta: WorldPresenceDelta, activeLandScopeKey: string, currentZone: string) {
  const deltaLandId = delta.interest?.currentLandId || delta.presence?.currentLandId;
  if (deltaLandId && activeLandScopeKey && !isSameWorldScope(deltaLandId, activeLandScopeKey)) return false;

  const deltaZone = delta.interest?.currentZone || delta.presence?.currentZone;
  if (!deltaLandId && deltaZone && currentZone && !isSameWorldScope(deltaZone, currentZone)) return false;

  return true;
}

function getSessionDistrict(session: WorldSocialAction) {
  if (session.type === 'trade') return WORLD_DISTRICTS.find(district => district.id === 'market') || COMMONS_DISTRICT;
  if (session.type === 'collaborate') return WORLD_DISTRICTS.find(district => district.id === 'workshop') || COMMONS_DISTRICT;
  return getDistrictForZoneName(getSessionZone(session));
}

function getSessionMarkerPosition(session: WorldSocialAction, presences: WorldPresence[]) {
  const participantPresences = presences.filter(presence => (
    presence.userId === session.fromUserId || presence.userId === session.toUserId
  ));

  if (participantPresences.length > 0) {
    const center = participantPresences.reduce<WorldPresenceVector>(
      (acc, presence) => ({
        x: acc.x + presence.position.x / participantPresences.length,
        y: 0,
        z: acc.z + presence.position.z / participantPresences.length,
      }),
      { x: 0, y: 0, z: 0 }
    );
    return offsetPosition(center, `session:${session.id}`, participantPresences.length > 1 ? 0.62 : 1.18);
  }

  const zone = getSessionZone(session);
  return offsetPosition((zone ? getDistrictForZoneName(zone) : getSessionDistrict(session)).position, `session:${session.id}`, 1.2);
}

function getPresenceClusterPosition(presences: WorldPresence[], seed: string, fallback: WorldDistrict) {
  if (presences.length === 0) return offsetPosition(fallback.position, seed, 1.1);

  const center = presences.reduce<WorldPresenceVector>(
    (acc, presence) => ({
      x: acc.x + presence.position.x / presences.length,
      y: 0,
      z: acc.z + presence.position.z / presences.length,
    }),
    { x: 0, y: 0, z: 0 }
  );

  return offsetPosition(center, seed, presences.length > 2 ? 0.56 : 0.84);
}

function getLandObjectMeta(item: PurchasedItem) {
  if (item.type === 'main_tree') return { label: 'Love Tree', icon: 'fa-tree', color: '#059669', scale: 1.25 };
  if (item.type === 'tree1') return { label: 'Garden Tree', icon: 'fa-tree', color: '#15803d', scale: 0.9 };
  if (item.type === 'flower1') return { label: 'Flower Bed', icon: 'fa-seedling', color: '#ec4899', scale: 0.8 };
  if (item.type === 'rock1') return { label: 'Stone Marker', icon: 'fa-mountain', color: '#78716c', scale: 0.82 };
  if (item.type === 'house1') return { label: 'Cozy House', icon: 'fa-house-chimney', color: '#d97706', scale: 0.92 };
  if (item.type === 'dog') return { label: 'Dog Friend', icon: 'fa-dog', color: '#b45309', scale: 0.72 };
  if (item.type === 'cat') return { label: 'Cat Friend', icon: 'fa-cat', color: '#7c3aed', scale: 0.72 };
  if (item.type === 'custom_3d') return { label: 'Custom Model', icon: 'fa-cube', color: '#0369a1', scale: 0.85 };
  return { label: item.type.replace(/[_-]+/g, ' '), icon: 'fa-cube', color: '#8b5e34', scale: 0.8 };
}

function getLandObjectPosition(item: PurchasedItem): [number, number, number] {
  return [
    THREE.MathUtils.clamp(Number.isFinite(item.x) ? item.x : 0, -WORLD_BOUNDS + 1.6, WORLD_BOUNDS - 1.6),
    Number.isFinite(item.y) ? item.y : 0,
    THREE.MathUtils.clamp(Number.isFinite(item.z) ? item.z : 0, -WORLD_BOUNDS + 1.6, WORLD_BOUNDS - 1.6),
  ];
}

function getLandObjectCollisionRadius(item: PurchasedItem) {
  if (item.type === 'main_tree') return 1.05;
  if (item.type === 'house1') return 0.95;
  if (item.type === 'tree1') return 0.78;
  if (item.type === 'custom_3d') return 0.72;
  if (item.type === 'rock1') return 0.58;
  if (item.type === 'flower1') return 0.42;
  if (item.type === 'dog' || item.type === 'cat') return 0.36;
  return 0.52;
}

function buildWorldCollisionBodies(landObjects: PurchasedItem[]): WorldCollisionBody[] {
  const portalBodies = WORLD_PORTALS.map((portal) => ({
    id: `portal:${portal.id}`,
    label: portal.name,
    x: portal.position[0],
    z: portal.position[2],
    radius: 0.74,
  }));
  const npcBodies = WORLD_NPCS.map((npc) => ({
    id: `npc:${npc.id}`,
    label: npc.name,
    x: npc.position[0],
    z: npc.position[2],
    radius: 0.52,
  }));
  const objectBodies = landObjects.map((item) => {
    const [x, , z] = getLandObjectPosition(item);
    return {
      id: `object:${item.id}`,
      label: getLandObjectMeta(item).label,
      x,
      z,
      radius: getLandObjectCollisionRadius(item),
    };
  });

  return [...portalBodies, ...npcBodies, ...objectBodies];
}

function buildRemoteAvatarCollisionBodies(
  remotePresences: WorldPresence[],
  selfPosition: WorldPresenceVector
): WorldCollisionBody[] {
  return remotePresences
    .map((presence) => ({
      presence,
      distance: getPresenceDistance(selfPosition, presence.position),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_REMOTE_AVATAR_COLLISION_BODIES)
    .map(({ presence }) => ({
      id: `avatar:${presence.userId}`,
      label: presence.name,
      x: presence.position.x,
      z: presence.position.z,
      radius: REMOTE_AVATAR_COLLISION_RADIUS,
    }));
}

function resolvePositionAgainstCollisionBodies(position: THREE.Vector3, bodies: WorldCollisionBody[]) {
  if (bodies.length === 0) return;

  for (let pass = 0; pass < 2; pass += 1) {
    bodies.forEach((body) => {
      const minDistance = body.radius + AVATAR_COLLISION_RADIUS;
      const dx = position.x - body.x;
      const dz = position.z - body.z;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq >= minDistance * minDistance) return;

      const distance = Math.sqrt(distanceSq);
      const angle = distance > 0.001 ? Math.atan2(dz, dx) : (hashString(body.id) % 628) / 100;
      const pushX = Math.cos(angle) * minDistance;
      const pushZ = Math.sin(angle) * minDistance;
      position.x = THREE.MathUtils.clamp(body.x + pushX, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2);
      position.z = THREE.MathUtils.clamp(body.z + pushZ, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2);
    });
  }
}

function getNavigationBlocker(start: THREE.Vector3, end: THREE.Vector3, bodies: WorldCollisionBody[]) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq < 0.01) return null;

  let nearest: { body: WorldCollisionBody; t: number; distanceSq: number } | null = null;
  for (const body of bodies) {
    const radius = body.radius + AVATAR_COLLISION_RADIUS + NAVIGATION_OBSTACLE_PADDING;
    const t = THREE.MathUtils.clamp(((body.x - start.x) * dx + (body.z - start.z) * dz) / lengthSq, 0, 1);
    if (t < 0.08 || t > 0.94) continue;

    const closestX = start.x + dx * t;
    const closestZ = start.z + dz * t;
    const distanceX = body.x - closestX;
    const distanceZ = body.z - closestZ;
    const distanceSq = distanceX * distanceX + distanceZ * distanceZ;
    if (distanceSq > radius * radius) continue;

    if (!nearest || t < nearest.t) nearest = { body, t, distanceSq };
  }

  return nearest;
}

function getNavigationWaypoint(start: THREE.Vector3, end: THREE.Vector3, bodies: WorldCollisionBody[]) {
  const blocker = getNavigationBlocker(start, end, bodies);
  if (!blocker) return null;

  const direction = end.clone().sub(start).setY(0);
  if (direction.lengthSq() < 0.01) return null;
  direction.normalize();

  const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
  const bodyVector = new THREE.Vector3(blocker.body.x - start.x, 0, blocker.body.z - start.z);
  const bodySide = Math.sign(direction.x * bodyVector.z - direction.z * bodyVector.x) || 1;
  const clearance = blocker.body.radius + AVATAR_COLLISION_RADIUS + NAVIGATION_OBSTACLE_PADDING;
  const waypoint = new THREE.Vector3(blocker.body.x, 0, blocker.body.z)
    .addScaledVector(perpendicular, -bodySide * clearance)
    .addScaledVector(direction, clearance * 0.36);

  waypoint.x = THREE.MathUtils.clamp(waypoint.x, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2);
  waypoint.z = THREE.MathUtils.clamp(waypoint.z, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2);
  resolvePositionAgainstCollisionBodies(waypoint, bodies.filter(body => body.id !== blocker.body.id));

  if (waypoint.distanceTo(start) < NAVIGATION_WAYPOINT_REACHED_DISTANCE || waypoint.distanceTo(end) < NAVIGATION_WAYPOINT_REACHED_DISTANCE) {
    return null;
  }

  return waypoint;
}

function getSafeSpawnPosition(position: WorldPresenceVector, landObjects: PurchasedItem[]) {
  const safePosition = new THREE.Vector3(position.x, position.y, position.z);
  resolvePositionAgainstCollisionBodies(safePosition, buildWorldCollisionBodies(landObjects));
  safePosition.y = THREE.MathUtils.clamp(Number.isFinite(safePosition.y) ? safePosition.y : DEFAULT_POSITION.y, -1, 4);
  return vectorToObject(safePosition);
}

function StatusPip({ color = '#34d399' }: { color?: string }) {
  return (
    <mesh position={[0.46, 2.34, 0.12]}>
      <sphereGeometry args={[0.07, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function AvatarActivityProp({
  meta,
  selected,
  isSelf,
}: {
  meta: AvatarActivityPropMeta;
  selected?: boolean;
  isSelf?: boolean;
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  const yOffset = isSelf ? 1.56 : 1.48;

  useGameLoop((_, __, elapsed) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = elapsed * 1.2;
    groupRef.current.position.y = yOffset + Math.sin(elapsed * 2.2) * 0.035;
  });

  return (
    <group ref={groupRef} position={[0.58, yOffset, -0.18]} scale={selected ? 1.08 : 1}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <ringGeometry args={[0.18, 0.24, 32]} />
        <meshBasicMaterial color={meta.color} transparent opacity={selected ? 0.58 : 0.38} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {meta.kind === 'chat' && (
        <group>
          <mesh castShadow>
            <boxGeometry args={[0.34, 0.2, 0.08]} />
            <meshStandardMaterial color={meta.accent} roughness={0.62} emissive={meta.color} emissiveIntensity={0.08} />
          </mesh>
          <mesh position={[0.11, -0.12, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
            <boxGeometry args={[0.09, 0.09, 0.07]} />
            <meshStandardMaterial color={meta.accent} roughness={0.66} />
          </mesh>
        </group>
      )}

      {meta.kind === 'voice' && (
        <group>
          <mesh position={[0, 0.03, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.2, 6, 12]} />
            <meshStandardMaterial color={meta.accent} roughness={0.45} emissive={meta.color} emissiveIntensity={0.14} />
          </mesh>
          <mesh position={[0, -0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1, 0.012, 6, 18, Math.PI]} />
            <meshStandardMaterial color={meta.color} roughness={0.52} />
          </mesh>
        </group>
      )}

      {meta.kind === 'trade' && (
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.055, 28]} />
          <meshStandardMaterial color={meta.accent} roughness={0.42} metalness={0.2} emissive={meta.color} emissiveIntensity={0.08} />
        </mesh>
      )}

      {meta.kind === 'event' && (
        <group>
          {[0, 1, 2, 3, 4].map(index => {
            const angle = (index / 5) * Math.PI * 2;
            return (
              <mesh key={index} position={[Math.cos(angle) * 0.1, Math.sin(angle) * 0.1, 0]} rotation={[0, 0, angle]} castShadow>
                <coneGeometry args={[0.045, 0.18, 3]} />
                <meshStandardMaterial color={meta.accent} roughness={0.5} emissive={meta.color} emissiveIntensity={0.12} />
              </mesh>
            );
          })}
          <mesh castShadow>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshStandardMaterial color={meta.color} roughness={0.44} />
          </mesh>
        </group>
      )}

      {(meta.kind === 'create' || meta.kind === 'work') && (
        <group rotation={[0.1, 0, -0.45]}>
          <mesh castShadow>
            <boxGeometry args={[0.25, 0.08, 0.07]} />
            <meshStandardMaterial color={meta.color} roughness={0.7} />
          </mesh>
          <mesh position={[0.17, 0.05, 0]} castShadow>
            <boxGeometry args={[0.11, 0.16, 0.08]} />
            <meshStandardMaterial color={meta.accent} roughness={0.58} />
          </mesh>
        </group>
      )}

      {meta.kind === 'afk' && (
        <group>
          <mesh castShadow>
            <cylinderGeometry args={[0.13, 0.1, 0.14, 18]} />
            <meshStandardMaterial color={meta.accent} roughness={0.42} />
          </mesh>
          <mesh position={[0.12, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.055, 0.011, 6, 14]} />
            <meshStandardMaterial color={meta.accent} roughness={0.45} />
          </mesh>
        </group>
      )}

      {(meta.kind === 'party' || meta.kind === 'guild') && (
        <group>
          <mesh position={[-0.07, 0, 0]} castShadow>
            <sphereGeometry args={[0.085, 14, 12]} />
            <meshStandardMaterial color={meta.accent} roughness={0.52} emissive={meta.color} emissiveIntensity={0.08} />
          </mesh>
          <mesh position={[0.08, 0, 0]} castShadow>
            <sphereGeometry args={[0.085, 14, 12]} />
            <meshStandardMaterial color={meta.color} roughness={0.52} />
          </mesh>
        </group>
      )}

      {meta.kind === 'explore' && (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.14, 0.018, 8, 24]} />
            <meshStandardMaterial color={meta.accent} roughness={0.42} emissive={meta.color} emissiveIntensity={0.08} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
            <coneGeometry args={[0.055, 0.22, 3]} />
            <meshStandardMaterial color={meta.color} roughness={0.5} />
          </mesh>
        </group>
      )}

      <Html center distanceFactor={18} position={[0, 0.32, 0]} className="pointer-events-none">
        <div
          className="flex h-5 min-w-5 items-center justify-center rounded-full border border-white/70 px-1.5 text-[8px] font-black text-white shadow-lg"
          style={{ backgroundColor: meta.color }}
          title={meta.label}
        >
          <i className={`fas ${meta.icon}`}></i>
        </div>
      </Html>
    </group>
  );
}

function LivingWorldAmbience({ cycle, quality }: { cycle: WorldCycle; quality: 'low' | 'medium' | 'high' }) {
  const ambientRef = React.useRef<THREE.AmbientLight>(null);
  const sunRef = React.useRef<THREE.DirectionalLight>(null);
  const sunAngle = cycle.progress * Math.PI * 2 - Math.PI / 2;
  const sunPosition: [number, number, number] = [
    Math.cos(sunAngle) * 20,
    THREE.MathUtils.lerp(4, 18, cycle.daylight),
    Math.sin(sunAngle) * 16,
  ];
  const moonPosition: [number, number, number] = [-sunPosition[0], 16 - sunPosition[1] * 0.24, -sunPosition[2]];

  useGameLoop((_, delta) => {
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        cycle.ambientIntensity,
        1 - Math.exp(-delta * 4)
      );
    }
    if (sunRef.current) {
      sunRef.current.intensity = THREE.MathUtils.lerp(
        sunRef.current.intensity,
        cycle.sunIntensity,
        1 - Math.exp(-delta * 4)
      );
      sunRef.current.position.lerp(new THREE.Vector3(...sunPosition), 1 - Math.exp(-delta * 2));
    }
  });

  return (
    <>
      <color attach="background" args={[cycle.sky]} />
      <fog attach="fog" args={[cycle.fog, cycle.weather === 'Mist' ? 12 : 18, 52]} />
      <ambientLight ref={ambientRef} intensity={cycle.ambientIntensity} />
      <directionalLight
        ref={sunRef}
        position={sunPosition}
        intensity={cycle.sunIntensity}
        color={cycle.sun}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <mesh position={sunPosition}>
        <sphereGeometry args={[quality === 'high' ? 0.58 : 0.42, 24, 24]} />
        <meshBasicMaterial color={cycle.phase === 'Dawn' || cycle.phase === 'Dusk' ? '#fbbf8f' : '#fff4bc'} transparent opacity={THREE.MathUtils.lerp(0.35, 0.92, cycle.daylight)} />
      </mesh>
      {cycle.night > 0.45 && (
        <mesh position={moonPosition}>
          <sphereGeometry args={[0.46, 24, 24]} />
          <meshBasicMaterial color="#e6edf8" transparent opacity={THREE.MathUtils.clamp(cycle.night, 0.45, 0.86)} />
        </mesh>
      )}
    </>
  );
}

function WorldAtmosphereEffects({ cycle, quality }: { cycle: WorldCycle; quality: 'low' | 'medium' | 'high' }) {
  if (quality === 'low') return null;
  const high = quality === 'high';
  const showPetals = cycle.weather === 'Petals' || cycle.phase === 'Dawn' || cycle.phase === 'Dusk';
  const showFireflies = cycle.weather === 'Fireflies' || cycle.night > 0.55;
  const mistOpacity = cycle.weather === 'Mist' ? 0.18 : cycle.phase === 'Dawn' ? 0.08 : 0;

  return (
    <>
      {cycle.night > 0.42 && (
        <Stars
          radius={90}
          depth={36}
          count={high ? 2200 : 1000}
          factor={3.2}
          saturation={0}
          fade
          speed={0.35}
        />
      )}
      {showFireflies && (
        <Sparkles
          count={high ? 82 : 42}
          scale={[28, 5.5, 28]}
          size={3.1}
          speed={0.34}
          opacity={THREE.MathUtils.clamp(cycle.night * 0.72, 0.22, 0.75)}
          color="#fde68a"
          position={[0, 2.3, 0]}
        />
      )}
      {showPetals && (
        <Sparkles
          count={high ? 72 : 34}
          scale={[26, 4.5, 26]}
          size={2.6}
          speed={0.18}
          opacity={cycle.weather === 'Petals' ? 0.52 : 0.28}
          color="#f9a8d4"
          position={[0, 3.4, 0]}
        />
      )}
      {mistOpacity > 0 && (
        <group position={[0, 0.08, 0]}>
          {[0, 1, 2].map(index => (
            <mesh key={index} rotation={[-Math.PI / 2, 0, index * 0.7]} position={[0, index * 0.018, 0]}>
              <ringGeometry args={[6 + index * 5.2, 7.2 + index * 5.4, 96]} />
              <meshBasicMaterial color="#eef7ef" transparent opacity={mistOpacity / (index + 1.2)} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
}

function DistrictActivityAura({
  district,
  summary,
  cycle,
  quality,
}: {
  district: WorldDistrict;
  summary?: DistrictPresenceSummary;
  cycle: WorldCycle;
  quality: 'low' | 'medium' | 'high';
}) {
  const pulseRef = React.useRef<THREE.Group>(null);
  const orbitRef = React.useRef<THREE.Group>(null);
  const lightRef = React.useRef<THREE.PointLight>(null);
  const population = summary?.count || 0;
  const activityMeta = getActivityMeta(summary?.topActivity);
  const statusMeta = getStatusMeta(activityMeta.status);
  const visibleCount = Math.min(population, quality === 'high' ? 8 : 5);
  const wisps = React.useMemo(() => (
    Array.from({ length: visibleCount }).map((_, index) => {
      const angle = (index / Math.max(visibleCount, 1)) * Math.PI * 2 + (hashString(`${district.id}:${index}`) % 80) / 100;
      const radius = district.radius * THREE.MathUtils.lerp(0.34, 0.74, ((index % 4) + 1) / 4);
      return {
        id: `${district.id}-wisp-${index}`,
        angle,
        radius,
        y: 0.34 + (index % 3) * 0.1,
        size: 0.09 + (index % 2) * 0.03,
      };
    })
  ), [district.id, district.radius, visibleCount]);

  useGameLoop((_, delta, elapsed) => {
    if (!population) return;

    if (pulseRef.current) {
      const pulse = 1 + Math.sin(elapsed * 1.7 + district.position[0]) * 0.055;
      pulseRef.current.scale.set(pulse, pulse, pulse);
      pulseRef.current.rotation.y += delta * 0.12;
    }

    if (orbitRef.current) {
      orbitRef.current.rotation.y += delta * (0.18 + population * 0.018);
      orbitRef.current.position.y = Math.sin(elapsed * 1.4 + district.position[2]) * 0.035;
    }

    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.lerp(
        lightRef.current.intensity,
        THREE.MathUtils.clamp(0.35 + population * 0.16 + cycle.night * 0.45, 0.4, 1.65),
        1 - Math.exp(-delta * 3.4)
      );
    }
  });

  if (!population) return null;

  const pulseOpacity = THREE.MathUtils.clamp(0.13 + population * 0.035, 0.16, 0.42);
  const sparkleCount = quality === 'low' ? 0 : Math.min(18 + population * 9, quality === 'high' ? 96 : 54);

  return (
    <group position={district.position}>
      <group ref={pulseRef}>
        <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[district.radius * 0.66, district.radius * 0.72, 96]} />
          <meshBasicMaterial color={statusMeta.color} transparent opacity={pulseOpacity} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[district.radius * 0.22, district.radius * 0.28, 72]} />
          <meshBasicMaterial color={statusMeta.color} transparent opacity={pulseOpacity * 0.75} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <pointLight
        ref={lightRef}
        position={[0, 1.2, 0]}
        color={statusMeta.color}
        intensity={0.5}
        distance={district.radius * 2.2}
      />

      <group ref={orbitRef}>
        {wisps.map(wisp => (
          <group key={wisp.id} position={[Math.cos(wisp.angle) * wisp.radius, wisp.y, Math.sin(wisp.angle) * wisp.radius]}>
            <mesh castShadow>
              <sphereGeometry args={[wisp.size, 14, 14]} />
              <meshStandardMaterial color={statusMeta.color} emissive={statusMeta.color} emissiveIntensity={0.22 + cycle.night * 0.28} roughness={0.58} />
            </mesh>
            <mesh position={[0, 0.16, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.035, 0.28, 0.035]} />
              <meshStandardMaterial color="#8b5e34" roughness={0.82} />
            </mesh>
          </group>
        ))}
      </group>

      {sparkleCount > 0 && (
        <Sparkles
          count={sparkleCount}
          scale={[district.radius * 1.7, 1.8 + Math.min(population, 6) * 0.15, district.radius * 1.7]}
          size={2.1}
          speed={0.2 + Math.min(population, 8) * 0.012}
          opacity={THREE.MathUtils.clamp(0.2 + population * 0.035, 0.22, 0.54)}
          color={statusMeta.color}
          position={[0, 1.2, 0]}
        />
      )}
    </group>
  );
}

function DistrictTrafficRouteMarker({
  route,
  quality,
  onSelect,
}: {
  route: WorldTrafficRoute;
  quality: 'low' | 'medium' | 'high';
  onSelect: (district: WorldDistrict) => void;
}) {
  const particleGroupRef = React.useRef<THREE.Group>(null);
  const endpointRef = React.useRef<THREE.Group>(null);
  const routeLine = React.useMemo(() => {
    const startBase = new THREE.Vector3(COMMONS_DISTRICT.position[0], 0.09, COMMONS_DISTRICT.position[2]);
    const endBase = new THREE.Vector3(route.district.position[0], 0.09, route.district.position[2]);
    const direction = endBase.clone().sub(startBase);
    const rawDistance = direction.length();
    if (rawDistance < 1) return null;

    direction.normalize();
    const laneOffset = ((hashString(route.id) % 5) - 2) * 0.08;
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(laneOffset);
    const start = startBase.clone().add(direction.clone().multiplyScalar(COMMONS_DISTRICT.radius * 0.45)).add(perpendicular);
    const end = endBase.clone().sub(direction.clone().multiplyScalar(route.district.radius * 0.52)).add(perpendicular);
    const distance = start.distanceTo(end);
    const center = start.clone().add(end).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    const labelPosition = center.clone();
    labelPosition.y = 0.82;
    const endpoint = end.clone();
    endpoint.y = 0.11;

    return {
      start,
      end,
      center: [center.x, center.y, center.z] as [number, number, number],
      endpoint: [endpoint.x, endpoint.y, endpoint.z] as [number, number, number],
      labelPosition: [labelPosition.x, labelPosition.y, labelPosition.z] as [number, number, number],
      quaternion,
      distance,
    };
  }, [
    route.district.position,
    route.district.radius,
    route.id,
  ]);
  const particles = React.useMemo(() => (
    Array.from({ length: quality === 'low' ? 0 : route.particleCount }).map((_, index) => ({
      id: `${route.id}:particle:${index}`,
      offset: ((hashString(`${route.id}:${index}`) % 100) / 100 + index / Math.max(route.particleCount, 1)) % 1,
      size: 0.08 + (index % 2) * 0.025,
    }))
  ), [quality, route.id, route.particleCount]);

  useGameLoop((_, __, elapsed) => {
    if (!routeLine) return;

    if (particleGroupRef.current) {
      particleGroupRef.current.children.forEach((child, index) => {
        const particle = particles[index];
        if (!particle) return;
        const progress = (elapsed * route.speed + particle.offset) % 1;
        child.position.lerpVectors(routeLine.start, routeLine.end, progress);
        child.position.y = 0.14 + Math.sin(elapsed * 4.5 + index) * 0.035;
        child.scale.setScalar(1 + Math.sin(elapsed * 3.6 + index) * 0.08);
      });
    }

    if (endpointRef.current) {
      endpointRef.current.rotation.y = elapsed * (0.38 + route.summary.count * 0.015);
      endpointRef.current.scale.setScalar(1 + Math.sin(elapsed * 2.3 + route.summary.count) * 0.035);
    }
  });

  if (!routeLine) return null;

  const routeOpacity = THREE.MathUtils.clamp(
    0.18 + route.summary.count * 0.035 + route.summary.movingCount * 0.04 + (route.active ? 0.2 : 0),
    0.18,
    0.56
  );
  const radius = route.active ? 0.035 : 0.024;

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onSelect(route.district);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <group position={routeLine.center} quaternion={routeLine.quaternion}>
        <mesh renderOrder={2} scale={[1, routeLine.distance, 1]}>
          <cylinderGeometry args={[radius, radius, 1, 10]} />
          <meshBasicMaterial color={route.color} transparent opacity={routeOpacity} depthWrite={false} />
        </mesh>
        <mesh renderOrder={1} scale={[1, routeLine.distance, 1]}>
          <cylinderGeometry args={[radius * 3.8, radius * 3.8, 1, 10]} />
          <meshBasicMaterial color={route.softColor} transparent opacity={routeOpacity * 0.22} depthWrite={false} />
        </mesh>
      </group>

      <group ref={particleGroupRef}>
        {particles.map((particle) => (
          <group key={particle.id}>
            <mesh castShadow>
              <sphereGeometry args={[particle.size, 14, 14]} />
              <meshStandardMaterial color={route.color} emissive={route.color} emissiveIntensity={0.24} roughness={0.48} />
            </mesh>
            <mesh position={[0, -0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
              <ringGeometry args={[particle.size * 1.5, particle.size * 2.15, 20]} />
              <meshBasicMaterial color={route.softColor} transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>

      <group ref={endpointRef} position={routeLine.endpoint}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <ringGeometry args={[0.42, 0.58, 42]} />
          <meshBasicMaterial color={route.color} transparent opacity={route.active ? 0.54 : 0.32} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.08, 0]} castShadow>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshStandardMaterial color={route.color} emissive={route.color} emissiveIntensity={route.active ? 0.28 : 0.16} roughness={0.52} />
        </mesh>
      </group>

      {(route.active || route.summary.count > 1 || route.summary.movingCount > 0 || route.summary.voiceCount > 0) && (
        <Html center distanceFactor={17} position={routeLine.labelPosition} className="pointer-events-none">
          <div className="max-w-[178px] rounded-full border border-white/70 bg-[#fffaf1]/92 px-2.5 py-1 text-center shadow-lg backdrop-blur-md">
            <p className="truncate text-[8px] font-black uppercase tracking-wider" style={{ color: route.color }}>
              <i className={`fas ${route.icon} mr-1`}></i>
              {route.label}
            </p>
            <p className="truncate text-[7px] font-black uppercase tracking-wider text-stone-400">{route.detail}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

type AvatarModelErrorBoundaryProps = {
  children: React.ReactNode;
  fallback: React.ReactNode;
  resetKey?: string | null;
};

class AvatarModelErrorBoundary extends React.Component<AvatarModelErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: AvatarModelErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: unknown) {
    console.warn('Avatar model load failed:', error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function AvatarModelPlaceholder({ colors, loading }: { colors: CharacterAppearance; loading?: boolean }) {
  return (
    <group rotation={[0, Math.PI / 4, 0]}>
      <mesh position={[0, 0.86, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.86, 8, 16]} />
        <meshStandardMaterial color={colors.bodyColor} roughness={0.82} transparent opacity={loading ? 0.55 : 0.9} />
      </mesh>
      <mesh position={[0, 1.48, 0]} castShadow>
        <sphereGeometry args={[0.25, 20, 20]} />
        <meshStandardMaterial color={colors.skinColor} roughness={0.72} transparent opacity={loading ? 0.55 : 0.9} />
      </mesh>
      <mesh position={[0, 0.42, -0.03]} castShadow>
        <boxGeometry args={[0.56, 0.14, 0.08]} />
        <meshStandardMaterial color={colors.trimColor} roughness={0.74} transparent opacity={loading ? 0.55 : 0.9} />
      </mesh>
      {loading && (
        <Html center distanceFactor={11} position={[0, 2.06, 0]} className="pointer-events-none">
          <div className="rounded-full bg-stone-900/75 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white">
            <i className="fas fa-spinner fa-spin mr-1"></i>
            Loading
          </div>
        </Html>
      )}
    </group>
  );
}

function AvatarEquipmentLayer({ equipment, colors }: { equipment: CharacterEquipment; colors: CharacterAppearance }) {
  return (
    <group rotation={[0, Math.PI / 4, 0]}>
      {equipment.head === 'flower_crown' && (
        <mesh position={[0, 1.78, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.26, 0.035, 8, 24]} />
          <meshStandardMaterial color="#f9a8d4" roughness={0.7} />
        </mesh>
      )}
      {equipment.head === 'straw_hat' && (
        <group position={[0, 1.82, 0]} castShadow>
          <mesh>
            <cylinderGeometry args={[0.42, 0.42, 0.06, 28]} />
            <meshStandardMaterial color="#d6a25e" roughness={0.92} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.24, 0.3, 0.16, 24]} />
            <meshStandardMaterial color="#c18b48" roughness={0.9} />
          </mesh>
        </group>
      )}
      {equipment.head === 'cat_ears' && (
        <group position={[0, 1.85, 0]}>
          <mesh position={[-0.14, 0, 0]} rotation={[0, 0, 0.18]} castShadow>
            <coneGeometry args={[0.11, 0.25, 3]} />
            <meshStandardMaterial color={colors.hairColor} roughness={0.9} />
          </mesh>
          <mesh position={[0.14, 0, 0]} rotation={[0, 0, -0.18]} castShadow>
            <coneGeometry args={[0.11, 0.25, 3]} />
            <meshStandardMaterial color={colors.hairColor} roughness={0.9} />
          </mesh>
        </group>
      )}
      {equipment.head === 'rose_halo' && (
        <mesh position={[0, 1.9, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.28, 0.025, 8, 28]} />
          <meshStandardMaterial color="#fb7185" roughness={0.62} emissive="#be123c" emissiveIntensity={0.12} />
        </mesh>
      )}
      {equipment.head === 'moon_pin' && (
        <mesh position={[0.18, 1.72, -0.14]} rotation={[0.2, 0, -0.25]} castShadow>
          <torusGeometry args={[0.09, 0.018, 8, 18, Math.PI * 1.35]} />
          <meshStandardMaterial color="#e0f2fe" roughness={0.48} metalness={0.18} />
        </mesh>
      )}

      {equipment.back === 'ribbon_wings' && (
        <group position={[0, 0.98, 0.24]} rotation={[0.15, 0, 0]}>
          <mesh position={[-0.36, 0, 0]} rotation={[0, 0, 0.45]} castShadow>
            <sphereGeometry args={[0.25, 16, 12]} />
            <meshStandardMaterial color="#fbcfe8" roughness={0.64} transparent opacity={0.82} />
          </mesh>
          <mesh position={[0.36, 0, 0]} rotation={[0, 0, -0.45]} castShadow>
            <sphereGeometry args={[0.25, 16, 12]} />
            <meshStandardMaterial color="#fbcfe8" roughness={0.64} transparent opacity={0.82} />
          </mesh>
        </group>
      )}
      {equipment.back === 'cape' && (
        <mesh position={[0, 0.78, 0.27]} rotation={[0.12, 0, 0]} castShadow>
          <boxGeometry args={[0.6, 0.86, 0.05]} />
          <meshStandardMaterial color={colors.trimColor} roughness={0.78} />
        </mesh>
      )}
      {equipment.back === 'picnic_satchel' && (
        <mesh position={[-0.42, 0.82, 0.25]} rotation={[0.08, 0, 0.22]} castShadow>
          <boxGeometry args={[0.28, 0.34, 0.12]} />
          <meshStandardMaterial color="#a16207" roughness={0.86} />
        </mesh>
      )}
      {equipment.back === 'star_shawl' && (
        <mesh position={[0, 1.02, 0.27]} rotation={[0.14, 0, 0]} castShadow>
          <boxGeometry args={[0.72, 0.5, 0.045]} />
          <meshStandardMaterial color="#bae6fd" roughness={0.64} transparent opacity={0.82} />
        </mesh>
      )}

      {equipment.hand === 'bouquet' && (
        <group position={[0.42, 0.7, -0.05]}>
          <mesh rotation={[0.5, 0, -0.5]}>
            <cylinderGeometry args={[0.015, 0.015, 0.45, 8]} />
            <meshStandardMaterial color="#15803d" />
          </mesh>
          <mesh position={[0.12, 0.15, 0]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color="#fb7185" />
          </mesh>
        </group>
      )}
      {equipment.hand === 'lantern' && (
        <mesh position={[0.46, 0.64, 0]} castShadow>
          <sphereGeometry args={[0.12, 14, 14]} />
          <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={0.7} />
        </mesh>
      )}
      {equipment.hand === 'book' && (
        <mesh position={[0.44, 0.7, -0.04]} rotation={[0.1, 0.3, -0.3]} castShadow>
          <boxGeometry args={[0.18, 0.24, 0.05]} />
          <meshStandardMaterial color="#7c2d12" roughness={0.75} />
        </mesh>
      )}
      {equipment.hand === 'tea_cup' && (
        <mesh position={[0.44, 0.66, -0.03]} castShadow>
          <cylinderGeometry args={[0.09, 0.07, 0.11, 16]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.42} />
        </mesh>
      )}
      {equipment.hand === 'map_scroll' && (
        <mesh position={[0.45, 0.7, -0.04]} rotation={[0.2, 0.3, -0.45]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.28, 12]} />
          <meshStandardMaterial color="#f5deb3" roughness={0.78} />
        </mesh>
      )}
    </group>
  );
}

function AvatarCosmeticLayer({
  cosmetics,
  isMoving,
  selected,
}: {
  cosmetics: ReturnType<typeof getAvatarCosmetics>;
  isMoving: boolean;
  selected?: boolean;
}) {
  const aura = getCosmeticAuraOption(cosmetics.aura);
  const trail = getCosmeticTrailOption(cosmetics.trail);
  const auraRef = React.useRef<THREE.Group>(null);
  const trailRef = React.useRef<THREE.Group>(null);
  const hasAura = aura.id !== 'none';
  const hasTrail = trail.id !== 'none';

  useGameLoop((_, delta, elapsed) => {
    if (auraRef.current) {
      const pulse = 1 + Math.sin(elapsed * 2.2) * 0.045;
      auraRef.current.scale.set(pulse, pulse, pulse);
      auraRef.current.rotation.y += delta * 0.42;
    }

    if (trailRef.current) {
      trailRef.current.rotation.y -= delta * (isMoving ? 1.3 : 0.36);
      trailRef.current.position.z = isMoving ? 0.28 + Math.sin(elapsed * 9) * 0.08 : 0.16;
    }
  }, hasAura || hasTrail);

  if (!hasAura && !hasTrail) return null;

  return (
    <group>
      {hasAura && (
        <group ref={auraRef}>
          <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.74, 0.84, 64]} />
            <meshBasicMaterial color={aura.color} transparent opacity={selected ? 0.44 : 0.28} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 1.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.48, 0.012, 8, 52]} />
            <meshBasicMaterial color={aura.color} transparent opacity={0.3} />
          </mesh>
          <pointLight position={[0, 1.2, 0]} intensity={selected ? 0.58 : 0.34} distance={2.7} color={aura.color} />
          <Sparkles
            count={aura.id === 'moon_mist' ? 12 : 18}
            scale={[1.2, 1.8, 1.2]}
            size={aura.id === 'firefly_ring' ? 2.2 : 1.5}
            speed={aura.id === 'moon_mist' ? 0.12 : 0.26}
            opacity={aura.id === 'moon_mist' ? 0.28 : 0.46}
            color={aura.color}
            position={[0, 1.08, 0]}
          />
        </group>
      )}

      {hasTrail && (
        <group ref={trailRef}>
          <Sparkles
            count={isMoving ? 18 : 7}
            scale={[0.88, 0.28, 0.88]}
            size={1.45}
            speed={isMoving ? 0.42 : 0.16}
            opacity={isMoving ? 0.48 : 0.22}
            color={trail.color}
            position={[0, 0.18, 0.24]}
          />
          <mesh position={[0, 0.035, 0.38]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.18, 0.24, 24]} />
            <meshBasicMaterial color={trail.color} transparent opacity={isMoving ? 0.28 : 0.12} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function getAvatarAnimationKeywords(animation: string, emote: string) {
  if (emote === 'dance') return ['dance', 'dancing', 'groove'];
  if (emote === 'wave') return ['wave', 'hello', 'greet'];
  if (emote === 'heart') return ['heart', 'love', 'kiss'];
  if (emote === 'sit') return ['sit', 'sitting'];
  if (animation === 'walk') return ['walk', 'walking', 'run', 'running', 'locomotion'];
  return ['idle', 'standing', 'breathing', 'default'];
}

function findAvatarAnimationClip(animations: THREE.AnimationClip[], animation: string, emote: string) {
  const normalizedClips = animations.map(clip => ({
    clip,
    name: clip.name.toLowerCase().replace(/[\s_-]/g, ''),
  }));
  const preferredKeywords = getAvatarAnimationKeywords(animation, emote);

  for (const keyword of preferredKeywords) {
    const normalizedKeyword = keyword.toLowerCase().replace(/[\s_-]/g, '');
    const match = normalizedClips.find(item => item.name.includes(normalizedKeyword));
    if (match) return match.clip.name;
  }

  const idle = normalizedClips.find(item => item.name.includes('idle') || item.name.includes('stand'));
  return idle?.clip.name || animations[0]?.name || null;
}

function UploadedAvatarModel({
  modelUrl,
  animation,
  emote,
}: {
  modelUrl: string;
  animation: string;
  emote: string;
}) {
  const modelRootRef = React.useRef<THREE.Group>(null);
  const activeActionRef = React.useRef<THREE.AnimationAction | null>(null);
  const { scene, animations } = useGLTF(modelUrl);
  const { actions } = useAnimations(animations, modelRootRef);
  const model = React.useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Object3D;
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const height = size.y || 1;
    const scale = THREE.MathUtils.clamp(1.72 / height, 0.2, 3);
    const center = box.getCenter(new THREE.Vector3());

    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    clone.scale.setScalar(scale);
    clone.traverse((object) => {
      if ('isMesh' in object && object.isMesh) {
        const mesh = object as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return clone;
  }, [scene]);
  const activeClipName = React.useMemo(
    () => findAvatarAnimationClip(animations, animation, emote),
    [animation, animations, emote]
  );

  React.useEffect(() => {
    if (!activeClipName) return;
    const nextAction = actions[activeClipName];
    if (!nextAction) return;

    const previousAction = activeActionRef.current;
    if (previousAction && previousAction !== nextAction) {
      previousAction.fadeOut(0.18);
    }

    nextAction
      .reset()
      .setEffectiveTimeScale(animation === 'walk' ? 1.08 : 1)
      .setEffectiveWeight(1)
      .fadeIn(0.18)
      .play();
    activeActionRef.current = nextAction;

    return () => {
      nextAction.fadeOut(0.18);
    };
  }, [actions, activeClipName, animation]);

  return (
    <group ref={modelRootRef} rotation={[0, Math.PI / 4, 0]}>
      <primitive object={model} />
    </group>
  );
}

function AvatarAchievementOrbit({
  achievements,
  title,
  selected,
  isSelf,
}: {
  achievements?: WorldAchievementBadge[];
  title?: string;
  selected?: boolean;
  isSelf?: boolean;
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  const visibleAchievements = (achievements || []).slice(0, 5);
  const showTitleRibbon = Boolean(title && (selected || isSelf || visibleAchievements.length > 0));

  useGameLoop((_, delta, elapsed) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * (selected || isSelf ? 0.38 : 0.22);
    groupRef.current.position.y = 1.92 + Math.sin(elapsed * 1.7 + visibleAchievements.length) * 0.025;
  });

  if (!showTitleRibbon && visibleAchievements.length === 0) return null;

  const orbitRadius = selected || isSelf ? 0.72 : 0.62;
  const orbitColor = visibleAchievements[0]
    ? ACHIEVEMENT_RARITY_3D[visibleAchievements[0].rarity].orbit
    : '#fde68a';

  return (
    <group ref={groupRef} position={[0, 1.92, 0]}>
      {visibleAchievements.length > 0 && (
        <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={2}>
          <torusGeometry args={[orbitRadius, 0.008, 8, 48]} />
          <meshBasicMaterial color={orbitColor} transparent opacity={selected || isSelf ? 0.38 : 0.22} depthWrite={false} />
        </mesh>
      )}

      {showTitleRibbon && (
        <group position={[0, 0.2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.54, 0.07, 0.035]} />
            <meshStandardMaterial color="#fef3c7" emissive="#f59e0b" emissiveIntensity={0.1} roughness={0.58} />
          </mesh>
          <mesh position={[-0.33, -0.01, 0]} rotation={[0, 0, 0.18]} castShadow>
            <coneGeometry args={[0.08, 0.16, 3]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.62} />
          </mesh>
          <mesh position={[0.33, -0.01, 0]} rotation={[0, 0, -0.18]} castShadow>
            <coneGeometry args={[0.08, 0.16, 3]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.62} />
          </mesh>
        </group>
      )}

      {visibleAchievements.map((achievement, index) => {
        const count = Math.max(visibleAchievements.length, 1);
        const angle = (index / count) * Math.PI * 2 + hashString(achievement.achievementKey) * 0.0005;
        const meta = ACHIEVEMENT_RARITY_3D[achievement.rarity];
        const x = Math.cos(angle) * orbitRadius;
        const z = Math.sin(angle) * orbitRadius;
        const y = Math.sin(angle * 2) * 0.04;

        return (
          <group key={achievement.achievementKey} position={[x, y, z]} rotation={[0, -angle + Math.PI / 2, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.055, 0.07, 0.16, 6]} />
              <meshStandardMaterial
                color={meta.color}
                emissive={meta.emissive}
                emissiveIntensity={selected || isSelf ? 0.28 : 0.14}
                roughness={0.46}
                metalness={meta.metalness}
              />
            </mesh>
            <mesh position={[0, -0.11, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.085, 0.007, 6, 18]} />
              <meshStandardMaterial color={meta.orbit} emissive={meta.emissive} emissiveIntensity={0.08} roughness={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function useAvatarFootstepTrail(color: string) {
  const [traces, setTraces] = React.useState<AvatarFootstepTrace[]>([]);
  const traceIdRef = React.useRef(0);
  const lastTraceAtRef = React.useRef(0);
  const sideRef = React.useRef(1);
  const timeoutRefs = React.useRef<number[]>([]);

  const clearTraces = React.useCallback(() => {
    timeoutRefs.current.forEach(timeout => window.clearTimeout(timeout));
    timeoutRefs.current = [];
    setTraces([]);
  }, []);

  const addTrace = React.useCallback((position: THREE.Vector3, heading: number, elapsed: number) => {
    if (elapsed - lastTraceAtRef.current < AVATAR_FOOTSTEP_INTERVAL) return;

    lastTraceAtRef.current = elapsed;
    sideRef.current *= -1;

    const rightX = Math.cos(heading);
    const rightZ = -Math.sin(heading);
    const id = ++traceIdRef.current;
    const trace: AvatarFootstepTrace = {
      id,
      x: position.x + rightX * sideRef.current * AVATAR_FOOTSTEP_SIDE_OFFSET,
      z: position.z + rightZ * sideRef.current * AVATAR_FOOTSTEP_SIDE_OFFSET,
      rotation: -heading,
      color,
    };

    setTraces(prev => [...prev.slice(-AVATAR_FOOTSTEP_MAX + 1), trace]);
    const timeout = window.setTimeout(() => {
      setTraces(prev => prev.filter(item => item.id !== id));
      timeoutRefs.current = timeoutRefs.current.filter(item => item !== timeout);
    }, AVATAR_FOOTSTEP_LIFETIME_MS);
    timeoutRefs.current.push(timeout);
  }, [color]);

  React.useEffect(() => clearTraces, [clearTraces]);

  return { traces, addTrace, clearTraces };
}

function AvatarFootstepTrail({ traces }: { traces: AvatarFootstepTrace[] }) {
  if (traces.length === 0) return null;

  return (
    <group>
      {traces.map((trace, index) => {
        const freshness = (index + 1) / traces.length;
        return (
          <mesh
            key={trace.id}
            position={[trace.x, 0.026, trace.z]}
            rotation={[-Math.PI / 2, 0, trace.rotation]}
            scale={[0.08, 0.17, 1]}
            renderOrder={1}
          >
            <circleGeometry args={[1, 14]} />
            <meshBasicMaterial
              color={trace.color}
              transparent
              opacity={0.08 + freshness * 0.18}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function AvatarActivityPulse({ pulse, selected, isSelf }: { pulse: ActivityPulse; selected?: boolean; isSelf?: boolean }) {
  const rootRef = React.useRef<THREE.Group>(null);
  const ringRef = React.useRef<THREE.Mesh>(null);

  useGameLoop((_, __, elapsed) => {
    const ageRatio = THREE.MathUtils.clamp((Date.now() - pulse.createdAt) / AVATAR_ACTIVITY_PULSE_ACTIVE_MS, 0, 1);
    const strength = 1 - ageRatio;
    if (rootRef.current) {
      rootRef.current.position.y = Math.sin(elapsed * 2.4) * 0.025;
      rootRef.current.scale.setScalar(1 + strength * 0.16 + Math.sin(elapsed * 4.2) * 0.025);
    }
    if (ringRef.current) {
      const material = ringRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.16 + strength * 0.32;
    }
  });

  return (
    <group ref={rootRef}>
      <mesh ref={ringRef} position={[0, 0.052, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <ringGeometry args={[0.78, 0.98, 56]} />
        <meshBasicMaterial color={pulse.color} transparent opacity={0.42} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <circleGeometry args={[selected || isSelf ? 0.72 : 0.64, 48]} />
        <meshBasicMaterial color={pulse.color} transparent opacity={0.09} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={12} position={[0, 2.86, 0]} className="pointer-events-none">
        <div className="max-w-[180px] rounded-md border border-white/80 bg-[#fffaf1]/95 px-3 py-1.5 text-center shadow-lg shadow-stone-900/10 backdrop-blur-md">
          <p className="truncate text-[8px] font-black uppercase tracking-[0.2em] text-stone-500">
            <i className={`fas ${pulse.icon} mr-1.5`} style={{ color: pulse.color }}></i>
            {pulse.status}
          </p>
          <p className="truncate text-[10px] font-black text-stone-800">{pulse.label}</p>
        </div>
      </Html>
    </group>
  );
}

function AvatarCharacter({
  presence,
  isSelf,
  selected,
  interactionHint,
  onSelect,
  onRunAction,
  selectedRelationship,
  activeFollowTargetId,
  actionDistance,
  actionReady,
  queuedActionType,
  pendingActionType,
  activityEntries,
  onOpenActivityFeed,
  isActivityFeedLoading,
  isActivityFeedLoaded,
  profileSummary,
  profilePresence,
  onOpenProfile,
  isProfileOpen,
  isProfileLoading,
  isActivityOpen,
  isDirectChatOpen,
  directChatMessages,
  directChatDraft,
  onDirectChatDraftChange,
  onDirectChatSubmit,
  onDirectChatClose,
  isDirectChatSending,
  requests,
  selfUserId,
  pendingRequestId,
  onRespondRequest,
  onOpenRequestContext,
  onOpenRequestChat,
  onOpenCharacterSheet,
  voiceRoom,
  voiceMediaLabel,
  voiceInputPercent,
  isVoiceMuted,
  isVoiceUpdating,
  onToggleVoiceMute,
  onLeaveVoiceRoom,
  position,
  sceneCue,
}: {
  presence: WorldPresence;
  isSelf?: boolean;
  selected?: boolean;
  interactionHint?: boolean;
  onSelect?: (presence: WorldPresence) => void;
  onRunAction?: (action: WorldActionDescriptor, target: WorldPresence) => void;
  selectedRelationship?: ReturnType<typeof getRelationshipStatus> | null;
  activeFollowTargetId?: string | null;
  actionDistance?: number | null;
  actionReady?: boolean;
  queuedActionType?: WorldActionType | null;
  pendingActionType?: WorldActionType | null;
  activityEntries?: SelectedActivityEntry[];
  onOpenActivityFeed?: (presence: WorldPresence) => void;
  isActivityFeedLoading?: boolean;
  isActivityFeedLoaded?: boolean;
  profileSummary?: WorldActivityFeed['profile'];
  profilePresence?: WorldActivityFeed['presence'];
  onOpenProfile?: (presence: WorldPresence) => void;
  isProfileOpen?: boolean;
  isProfileLoading?: boolean;
  isActivityOpen?: boolean;
  isDirectChatOpen?: boolean;
  directChatMessages?: WorldChatMessage[];
  directChatDraft?: string;
  onDirectChatDraftChange?: (value: string) => void;
  onDirectChatSubmit?: (event?: React.FormEvent) => void;
  onDirectChatClose?: () => void;
  isDirectChatSending?: boolean;
  requests?: WorldSocialAction[];
  selfUserId?: string;
  pendingRequestId?: string | null;
  onRespondRequest?: (request: WorldSocialAction, response: WorldRequestResponse) => void;
  onOpenRequestContext?: (request: WorldSocialAction) => void;
  onOpenRequestChat?: (request: WorldSocialAction) => void;
  onOpenCharacterSheet?: (presence: WorldPresence) => void;
  voiceRoom?: WorldVoiceRoom | null;
  voiceMediaLabel?: string;
  voiceInputPercent?: number;
  isVoiceMuted?: boolean;
  isVoiceUpdating?: boolean;
  onToggleVoiceMute?: () => void;
  onLeaveVoiceRoom?: (roomId?: string) => void;
  position?: WorldPresenceVector;
  sceneCue?: AvatarSceneCue;
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  const interactionHintRingRef = React.useRef<THREE.Mesh>(null);
  const colors = getAvatarAppearance(presence);
  const equipment = getEquipment(presence);
  const cosmetics = getAvatarCosmetics(presence);
  const nameplateMeta = getCosmeticNameplateOption(cosmetics.nameplate);
  const avatarPosition = position || presence.position;
  const isMoving = presence.animation === 'walk';
  const emote = presence.emote || 'idle';
  const chatText = sceneCue?.chatMessage?.body.slice(0, 92);
  const actionLabel = sceneCue?.socialAction ? getActionLabel(sceneCue.socialAction) : '';
  const activityMeta = getActivityMeta(presence.activity);
  const statusMeta = getStatusMeta(presence.status);
  const intentMeta = getPresenceIntentMeta(presence.intent);
  const showIntent = Boolean(presence.intent && intentMeta && presence.intent.kind !== 'explore');
  const quickEmote = sceneCue?.quickEmote;
  const activityPulse = sceneCue?.activityPulse;
  const liveBadges = getAvatarLiveBadges(presence, sceneCue);
  const activityProp = getAvatarActivityPropMeta(presence, sceneCue);
  const quickEmoteY = sceneCue?.socialAction || activityPulse ? 3.16 : 2.88;
  const chatBubbleY = quickEmote || activityPulse ? 3.52 : 3.2;
  const showInteractionHint = Boolean(interactionHint && !isSelf && !selected);
  const showSceneQuickActions = showInteractionHint && Boolean(onRunAction);
  const sceneChatAction = getWorldActionDescriptor('start_chat');
  const sceneFollowAction = getWorldActionDescriptor('follow_user');
  const followingThisAvatar = activeFollowTargetId === presence.userId;
  const nameplateTextClass = cosmetics.nameplate === 'night'
    ? 'text-indigo-50'
    : cosmetics.nameplate === 'rose'
      ? 'text-pink-900'
      : cosmetics.nameplate === 'grove'
        ? 'text-emerald-900'
        : 'text-stone-800';
  const nameplateMutedClass = cosmetics.nameplate === 'night'
    ? 'text-indigo-100'
    : cosmetics.nameplate === 'rose'
      ? 'text-pink-600'
      : cosmetics.nameplate === 'grove'
        ? 'text-emerald-700'
        : 'text-emerald-700';

  useGameLoop((_, __, elapsed) => {
    if (!groupRef.current) return;
    const bob = emote === 'dance'
      ? Math.sin(elapsed * 12) * 0.08
      : isMoving ? Math.sin(elapsed * 9) * 0.045 : Math.sin(elapsed * 1.6) * 0.015;
    groupRef.current.position.y = emote === 'sit' ? -0.16 : bob;
    groupRef.current.rotation.z = emote === 'dance' ? Math.sin(elapsed * 6) * 0.08 : 0;

    if (interactionHintRingRef.current) {
      const pulse = (Math.sin(elapsed * 3.4) + 1) / 2;
      interactionHintRingRef.current.scale.setScalar(1 + pulse * 0.1);
      const material = interactionHintRingRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.28 + pulse * 0.18;
    }
  });

  return (
    <group
      position={[avatarPosition.x, avatarPosition.y, avatarPosition.z]}
      onClick={(event) => {
        event.stopPropagation();
        if (!isSelf) onSelect?.(presence);
      }}
      onPointerOver={() => {
        if (!isSelf) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <group ref={groupRef}>
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={selected ? [0.55, 0.66, 40] : [0.44, 0.52, 36]} />
          <meshBasicMaterial
            color={selected ? '#ec4899' : isSelf ? '#ec4899' : '#34d399'}
            transparent
            opacity={selected ? 0.78 : isSelf ? 0.7 : 0.48}
            side={THREE.DoubleSide}
          />
        </mesh>
        {showInteractionHint && (
          <mesh ref={interactionHintRingRef} position={[0, 0.047, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
            <ringGeometry args={[0.68, 0.78, 44]} />
            <meshBasicMaterial
              color="#f59e0b"
              transparent
              opacity={0.36}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}
        <AvatarCosmeticLayer cosmetics={cosmetics} isMoving={isMoving} selected={selected} />

        {presence.modelUrl ? (
          <>
            <AvatarModelErrorBoundary
              resetKey={presence.modelUrl}
              fallback={<AvatarModelPlaceholder colors={colors} />}
            >
              <React.Suspense fallback={<AvatarModelPlaceholder colors={colors} loading />}>
                <UploadedAvatarModel modelUrl={presence.modelUrl} animation={presence.animation} emote={emote} />
              </React.Suspense>
            </AvatarModelErrorBoundary>
            <AvatarEquipmentLayer equipment={equipment} colors={colors} />
          </>
        ) : (
          <group rotation={[0, Math.PI / 4, 0]}>
          <mesh position={[0, 0.82, 0]} castShadow>
            <capsuleGeometry args={[0.28, 0.68, 8, 16]} />
            <meshStandardMaterial color={colors.bodyColor} roughness={0.75} />
          </mesh>
          <mesh position={[0, 1.32, 0]} castShadow>
            <sphereGeometry args={[0.27, 24, 24]} />
            <meshStandardMaterial color={colors.skinColor} roughness={0.65} />
          </mesh>
          <mesh position={[0, 1.52, -0.02]} castShadow>
            <sphereGeometry args={[0.28, 18, 18]} />
            <meshStandardMaterial color={colors.hairColor} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.98, -0.31]} castShadow>
            <boxGeometry args={[0.62, 0.22, 0.08]} />
            <meshStandardMaterial color={colors.trimColor} roughness={0.72} />
          </mesh>
          <mesh position={[-0.23, 0.38, 0]} rotation={[emote === 'dance' ? 0.35 : 0, 0, emote === 'wave' ? -0.72 : 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.34, 6, 10]} />
            <meshStandardMaterial color={colors.skinColor} roughness={0.8} />
          </mesh>
          <mesh position={[0.23, 0.38, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.34, 6, 10]} />
            <meshStandardMaterial color={colors.skinColor} roughness={0.8} />
          </mesh>

          {equipment.head === 'flower_crown' && (
            <mesh position={[0, 1.67, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.25, 0.035, 8, 24]} />
              <meshStandardMaterial color="#f9a8d4" roughness={0.7} />
            </mesh>
          )}
          {equipment.head === 'straw_hat' && (
            <group position={[0, 1.7, 0]} castShadow>
              <mesh>
                <cylinderGeometry args={[0.42, 0.42, 0.06, 28]} />
                <meshStandardMaterial color="#d6a25e" roughness={0.92} />
              </mesh>
              <mesh position={[0, 0.08, 0]}>
                <cylinderGeometry args={[0.24, 0.3, 0.16, 24]} />
                <meshStandardMaterial color="#c18b48" roughness={0.9} />
              </mesh>
            </group>
          )}
          {equipment.head === 'cat_ears' && (
            <group position={[0, 1.72, 0]}>
              <mesh position={[-0.14, 0, 0]} rotation={[0, 0, 0.18]} castShadow>
                <coneGeometry args={[0.11, 0.25, 3]} />
                <meshStandardMaterial color={colors.hairColor} roughness={0.9} />
              </mesh>
              <mesh position={[0.14, 0, 0]} rotation={[0, 0, -0.18]} castShadow>
                <coneGeometry args={[0.11, 0.25, 3]} />
                <meshStandardMaterial color={colors.hairColor} roughness={0.9} />
              </mesh>
            </group>
          )}
          {equipment.head === 'rose_halo' && (
            <group position={[0, 1.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh castShadow>
                <torusGeometry args={[0.28, 0.025, 8, 28]} />
                <meshStandardMaterial color="#fb7185" roughness={0.62} emissive="#be123c" emissiveIntensity={0.12} />
              </mesh>
              {[-0.22, 0, 0.22].map((x) => (
                <mesh key={x} position={[x, 0.02, 0.03]} castShadow>
                  <sphereGeometry args={[0.055, 10, 8]} />
                  <meshStandardMaterial color="#fda4af" roughness={0.7} />
                </mesh>
              ))}
            </group>
          )}
          {equipment.head === 'moon_pin' && (
            <group position={[0.17, 1.64, -0.18]} rotation={[0.2, 0, -0.25]}>
              <mesh castShadow>
                <torusGeometry args={[0.09, 0.018, 8, 18, Math.PI * 1.35]} />
                <meshStandardMaterial color="#e0f2fe" roughness={0.48} metalness={0.18} />
              </mesh>
              <mesh position={[0.035, 0.01, 0]} castShadow>
                <sphereGeometry args={[0.018, 8, 8]} />
                <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.25} />
              </mesh>
            </group>
          )}

          {equipment.back === 'ribbon_wings' && (
            <group position={[0, 0.92, 0.2]} rotation={[0.15, 0, 0]}>
              <mesh position={[-0.32, 0, 0]} rotation={[0, 0, 0.45]} castShadow>
                <sphereGeometry args={[0.23, 16, 12]} />
                <meshStandardMaterial color="#fbcfe8" roughness={0.64} transparent opacity={0.82} />
              </mesh>
              <mesh position={[0.32, 0, 0]} rotation={[0, 0, -0.45]} castShadow>
                <sphereGeometry args={[0.23, 16, 12]} />
                <meshStandardMaterial color="#fbcfe8" roughness={0.64} transparent opacity={0.82} />
              </mesh>
            </group>
          )}
          {equipment.back === 'cape' && (
            <mesh position={[0, 0.76, 0.23]} rotation={[0.12, 0, 0]} castShadow>
              <boxGeometry args={[0.56, 0.78, 0.05]} />
              <meshStandardMaterial color={colors.trimColor} roughness={0.78} />
            </mesh>
          )}
          {equipment.back === 'picnic_satchel' && (
            <group position={[-0.36, 0.82, 0.24]} rotation={[0.08, 0, 0.22]}>
              <mesh castShadow>
                <boxGeometry args={[0.28, 0.34, 0.12]} />
                <meshStandardMaterial color="#a16207" roughness={0.86} />
              </mesh>
              <mesh position={[0, 0.2, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.12, 0.013, 6, 18, Math.PI]} />
                <meshStandardMaterial color="#fef3c7" roughness={0.72} />
              </mesh>
            </group>
          )}
          {equipment.back === 'star_shawl' && (
            <group position={[0, 0.92, 0.23]} rotation={[0.14, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.68, 0.48, 0.045]} />
                <meshStandardMaterial color="#bae6fd" roughness={0.64} transparent opacity={0.82} />
              </mesh>
              {[-0.22, 0.04, 0.25].map((x, index) => (
                <mesh key={x} position={[x, 0.12 - index * 0.12, -0.035]}>
                  <sphereGeometry args={[0.025, 8, 8]} />
                  <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.28} />
                </mesh>
              ))}
            </group>
          )}

          {equipment.hand === 'bouquet' && (
            <group position={[0.38, 0.62, -0.05]}>
              <mesh rotation={[0.5, 0, -0.5]}>
                <cylinderGeometry args={[0.015, 0.015, 0.45, 8]} />
                <meshStandardMaterial color="#15803d" />
              </mesh>
              <mesh position={[0.12, 0.15, 0]}>
                <sphereGeometry args={[0.09, 12, 12]} />
                <meshStandardMaterial color="#fb7185" />
              </mesh>
            </group>
          )}
          {equipment.hand === 'lantern' && (
            <mesh position={[0.42, 0.58, 0]} castShadow>
              <sphereGeometry args={[0.12, 14, 14]} />
              <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={0.7} />
            </mesh>
          )}
          {equipment.hand === 'book' && (
            <mesh position={[0.4, 0.62, -0.04]} rotation={[0.1, 0.3, -0.3]} castShadow>
              <boxGeometry args={[0.18, 0.24, 0.05]} />
              <meshStandardMaterial color="#7c2d12" roughness={0.75} />
            </mesh>
          )}
          {equipment.hand === 'tea_cup' && (
            <group position={[0.4, 0.58, -0.03]} rotation={[0.1, 0.2, -0.25]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.09, 0.07, 0.11, 16]} />
                <meshStandardMaterial color="#fef3c7" roughness={0.42} />
              </mesh>
              <mesh position={[0.08, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.04, 0.009, 6, 14]} />
                <meshStandardMaterial color="#fef3c7" roughness={0.42} />
              </mesh>
            </group>
          )}
          {equipment.hand === 'map_scroll' && (
            <group position={[0.41, 0.62, -0.04]} rotation={[0.2, 0.3, -0.45]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.045, 0.045, 0.28, 12]} />
                <meshStandardMaterial color="#f5deb3" roughness={0.78} />
              </mesh>
              <mesh position={[0, 0.16, 0]} castShadow>
                <cylinderGeometry args={[0.055, 0.055, 0.025, 12]} />
                <meshStandardMaterial color="#92400e" roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.16, 0]} castShadow>
                <cylinderGeometry args={[0.055, 0.055, 0.025, 12]} />
                <meshStandardMaterial color="#92400e" roughness={0.8} />
              </mesh>
            </group>
          )}
          </group>
        )}

        {emote === 'sit' && (
          <mesh position={[0, 0.24, 0.08]} castShadow>
            <cylinderGeometry args={[0.32, 0.36, 0.16, 20]} />
            <meshStandardMaterial color="#d6a25e" roughness={0.84} />
          </mesh>
        )}
        <StatusPip color={statusMeta.color} />
        <AvatarActivityProp meta={activityProp} selected={selected} isSelf={isSelf} />
        <AvatarAchievementOrbit achievements={presence.achievements} title={presence.title} selected={selected} isSelf={isSelf} />
        {activityPulse && <AvatarActivityPulse pulse={activityPulse} selected={selected} isSelf={isSelf} />}
        {emote === 'heart' && (
          <mesh position={[0, 2.08, 0]} scale={[1, 0.85, 0.35]}>
            <sphereGeometry args={[0.16, 16, 12]} />
            <meshStandardMaterial color="#fb7185" emissive="#f43f5e" emissiveIntensity={0.35} />
          </mesh>
        )}
        <Html center distanceFactor={12} position={[0, 2.45, 0]} className="pointer-events-none">
          <div className={`max-w-[160px] rounded-full border px-2.5 py-1 text-center shadow-lg backdrop-blur-md ${nameplateMeta.className}`}>
            <p className={`truncate text-[10px] font-black ${nameplateTextClass}`}>{presence.name}</p>
            <p className={`truncate text-[8px] font-bold uppercase ${nameplateMutedClass}`}>
              <i className={`fas ${activityMeta.icon} mr-1`}></i>
              {presence.activity}
            </p>
            {showIntent && intentMeta && presence.intent && (
              <p
                className={`mt-0.5 truncate rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${intentMeta.className}`}
                title={presence.intent.detail || intentMeta.label}
              >
                <i className={`fas ${intentMeta.icon} mr-1`}></i>
                {intentMeta.label}
              </p>
            )}
            {presence.title && (
              <p className="truncate text-[8px] font-black uppercase tracking-wider text-stone-500">{presence.title}</p>
            )}
            {presence.achievements && presence.achievements.length > 0 && (
              <div className="mt-0.5 flex justify-center gap-1">
                {presence.achievements.slice(0, 3).map(achievement => (
                  <span
                    key={achievement.achievementKey}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[8px] text-amber-700"
                    title={achievement.name}
                  >
                    <i className={`fas ${achievement.icon}`}></i>
                  </span>
                ))}
              </div>
            )}
            {liveBadges.length > 0 && (
              <div className="mt-0.5 flex max-w-[150px] flex-wrap justify-center gap-1">
                {liveBadges.map(badge => (
                  <span
                    key={badge.key}
                    className={`inline-flex max-w-[68px] items-center gap-1 truncate rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider ${badge.className}`}
                    title={badge.title}
                  >
                    <i className={`fas ${badge.icon} shrink-0`}></i>
                    <span className="truncate">{badge.label}</span>
                  </span>
                ))}
              </div>
            )}
        {sceneCue?.relationshipLabel && (
          <p className="truncate text-[8px] font-black uppercase tracking-wider text-sky-600">
            <i className="fas fa-heart-circle-check mr-1"></i>
            {sceneCue.relationshipLabel}
          </p>
        )}
          </div>
        </Html>
        {showSceneQuickActions && (
          <Html center distanceFactor={12} position={[0.74, 1.86, 0]} className="pointer-events-auto" zIndexRange={[72, 0]}>
            <div
              className="flex items-center gap-1 rounded-full border border-amber-100 bg-[#fffaf1]/95 p-1 shadow-lg shadow-amber-900/10 backdrop-blur-md"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onSelect?.(presence)}
                className="grid h-7 w-7 place-items-center rounded-full bg-white text-stone-600 shadow-sm transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-wait disabled:opacity-60"
                title={`Open ${presence.name} actions`}
                aria-label={`Open ${presence.name} actions`}
                disabled={Boolean(pendingActionType)}
              >
                <i className="fas fa-hand-pointer text-[10px]"></i>
              </button>
              {sceneChatAction && (
                <button
                  type="button"
                  onClick={() => onRunAction?.(sceneChatAction, presence)}
                  className="grid h-7 w-7 place-items-center rounded-full bg-pink-50 text-pink-600 shadow-sm transition hover:bg-pink-500 hover:text-white disabled:cursor-wait disabled:opacity-60"
                  title={`Start chat with ${presence.name}`}
                  aria-label={`Start chat with ${presence.name}`}
                  disabled={Boolean(pendingActionType)}
                >
                  <i className="fas fa-comment text-[10px]"></i>
                </button>
              )}
              {sceneFollowAction && (
                <button
                  type="button"
                  onClick={() => onRunAction?.(sceneFollowAction, presence)}
                  className={`grid h-7 w-7 place-items-center rounded-full shadow-sm transition disabled:cursor-wait disabled:opacity-60 ${
                    followingThisAvatar
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-700 hover:text-white'
                  }`}
                  title={followingThisAvatar ? `Stop following ${presence.name}` : `Follow ${presence.name}`}
                  aria-label={followingThisAvatar ? `Stop following ${presence.name}` : `Follow ${presence.name}`}
                  disabled={Boolean(pendingActionType)}
                >
                  <i className="fas fa-shoe-prints text-[10px]"></i>
                </button>
              )}
            </div>
          </Html>
        )}
        {sceneCue?.socialAction && (
          <Html center distanceFactor={12} position={[0, 2.88, 0]} className="pointer-events-none">
            <div className="max-w-[170px] rounded-full border border-amber-100 bg-amber-50/95 px-2.5 py-1 text-center shadow-lg">
              <p className="truncate text-[8px] font-black uppercase tracking-wider text-amber-700">
                <i className="fas fa-bolt mr-1"></i>
                {actionLabel}
              </p>
            </div>
          </Html>
        )}
        {quickEmote && (
          <Html center distanceFactor={11} position={[0, quickEmoteY, 0]} className="pointer-events-none">
            <div className="max-w-[180px] rounded-full border border-pink-100 bg-pink-50/95 px-3 py-1 text-center shadow-lg">
              <p className="truncate text-[9px] font-black uppercase tracking-wider text-pink-600">
                <i className={`fas ${quickEmote.icon} mr-1.5`}></i>
                {quickEmote.label}
              </p>
            </div>
          </Html>
        )}
        {chatText && (
          <Html center distanceFactor={10} position={[0, chatBubbleY, 0]} className="pointer-events-none">
            <div className="max-w-[210px] rounded-md border border-emerald-100 bg-white/95 px-3 py-2 text-center shadow-xl">
              <p className="line-clamp-2 text-[11px] font-bold leading-snug text-stone-700">{chatText}</p>
            </div>
          </Html>
        )}
        {selected && !isSelf && (
          <AvatarWorldPassport
            presence={presence}
            relationship={selectedRelationship}
            actionDistance={actionDistance}
            actionReady={actionReady}
            queuedActionType={queuedActionType}
            activityEntries={activityEntries}
            onOpenActivityFeed={onOpenActivityFeed}
            isActivityFeedLoading={isActivityFeedLoading}
            isActivityFeedLoaded={isActivityFeedLoaded}
            profileSummary={profileSummary}
            profilePresence={profilePresence}
            onOpenProfile={onOpenProfile}
            isProfileOpen={isProfileOpen}
            isProfileLoading={isProfileLoading}
            isActivityOpen={isActivityOpen}
            isDirectChatOpen={isDirectChatOpen}
            directChatMessages={directChatMessages}
            directChatDraft={directChatDraft}
            onDirectChatDraftChange={onDirectChatDraftChange}
            onDirectChatSubmit={onDirectChatSubmit}
            onDirectChatClose={onDirectChatClose}
            isDirectChatSending={isDirectChatSending}
            requests={requests}
            selfUserId={selfUserId}
            pendingRequestId={pendingRequestId}
            onRespondRequest={onRespondRequest}
            onOpenRequestContext={onOpenRequestContext}
            onOpenRequestChat={onOpenRequestChat}
            onOpenCharacterSheet={onOpenCharacterSheet}
            voiceRoom={voiceRoom}
            voiceMediaLabel={voiceMediaLabel}
            voiceInputPercent={voiceInputPercent}
            isVoiceMuted={isVoiceMuted}
            isVoiceUpdating={isVoiceUpdating}
            onToggleVoiceMute={onToggleVoiceMute}
            onLeaveVoiceRoom={onLeaveVoiceRoom}
          />
        )}
        {selected && !isSelf && onRunAction && (
          <AvatarActionMenu
            presence={presence}
            relationship={selectedRelationship}
            activeFollowTargetId={activeFollowTargetId}
            actionDistance={actionDistance}
            actionReady={actionReady}
            queuedActionType={queuedActionType}
            pendingActionType={pendingActionType}
            onRunAction={onRunAction}
          />
        )}
      </group>
    </group>
  );
}

type DistrictWorkshopControls = {
  appearance: CharacterAppearance;
  cosmetics: ReturnType<typeof getAvatarCosmetics>;
  equipment: CharacterEquipment;
  inventory: WorldInventoryItem[];
  isSaving: boolean;
  isEquippingItem: string | null;
  onCycleColor: (key: WorkshopColorKey) => void;
  onCycleCosmetic: (key: WorkshopCosmeticKey) => void;
  onCycleEquipment: (slot: WorldInventorySlot) => void;
};

type DistrictMarketControls = {
  catalog: WorldInventoryCatalogItem[];
  balance: number;
  isPurchasingItem: string | null;
  isEquippingItem: string | null;
  onSelectCatalogItem: (item: WorldInventoryCatalogItem) => void;
};

type DistrictTitleControls = {
  achievements: WorldAchievement[];
  currentTitle: string;
  isEquippingTitle: string | null;
  onEquipTitle: (achievement: WorldAchievement) => void;
};

type DistrictEventControls = {
  event: WorldEvent | null;
  isJoined: boolean;
  isUpdating: boolean;
  rallyCount: number;
  lastRallyBy?: string;
  onJoin: () => void;
  onLeave: () => void;
  onRally: () => void;
};

function DistrictMarker({
  district,
  active,
  selected,
  summary,
  onSelect,
  onRunAction,
  onOpenDetails,
  onClearSelection,
  partyLabel,
  chatCount,
  isPartyUpdating,
  workshopControls,
  marketControls,
  titleControls,
  eventControls,
}: {
  district: WorldDistrict;
  active?: boolean;
  selected?: boolean;
  summary?: DistrictPresenceSummary;
  onSelect: (district: WorldDistrict) => void;
  onRunAction: (district: WorldDistrict, action: WorldDistrictAction) => void | Promise<void>;
  onOpenDetails: (district: WorldDistrict) => void;
  onClearSelection: () => void;
  partyLabel: string;
  chatCount: number;
  isPartyUpdating: boolean;
  workshopControls?: DistrictWorkshopControls;
  marketControls?: DistrictMarketControls;
  titleControls?: DistrictTitleControls;
  eventControls?: DistrictEventControls;
}) {
  const population = summary?.count || 0;
  const activityMeta = getActivityMeta(summary?.topActivity);
  const primaryAction = getDistrictPrimaryAction(district);
  const selectedOrActive = Boolean(selected || active);

  return (
    <group
      position={district.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(district);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[district.radius - 0.08, district.radius, 72]} />
        <meshBasicMaterial color={selected ? '#ec4899' : active ? '#f59e0b' : district.color} transparent opacity={selectedOrActive ? 0.72 : 0.42} side={THREE.DoubleSide} />
      </mesh>
      {selectedOrActive && (
        <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[district.radius, 72]} />
          <meshBasicMaterial color={selected ? '#ec4899' : district.color} transparent opacity={selected ? 0.18 : 0.14} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 40]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.85} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.2, 0.8, 1.2]} />
        <meshStandardMaterial color="#d6a25e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <coneGeometry args={[0.95, 0.65, 4]} />
        <meshStandardMaterial color="#9f6f38" roughness={0.8} />
      </mesh>
      {Array.from({ length: Math.min(population, 5) }).map((_, index) => {
        const angle = (index / Math.max(Math.min(population, 5), 1)) * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 1.55, 0.28, Math.sin(angle) * 1.55]} castShadow>
            <sphereGeometry args={[0.11, 14, 14]} />
            <meshStandardMaterial color={selected ? '#ec4899' : active ? '#f59e0b' : '#34d399'} emissive={selected ? '#be185d' : active ? '#d97706' : '#047857'} emissiveIntensity={0.18} roughness={0.55} />
          </mesh>
        );
      })}
      <Html center distanceFactor={15} position={[0, 1.8, 0]} className="pointer-events-none">
        <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-lg ${
          selected ? 'bg-pink-600/90 text-white' : active ? 'bg-amber-600/85 text-white' : 'bg-stone-900/75 text-white'
        }`}>
          <i className={`fas ${district.icon} mr-1.5 text-amber-200`}></i>
          {district.name}
        </div>
      </Html>
      <Html center distanceFactor={15} position={[0, 2.2, 0]} className="pointer-events-none">
        <div className={`rounded-full border border-white/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider shadow-md ${
          population > 0 ? 'bg-emerald-700/90 text-white' : 'bg-[#fffaf1]/90 text-emerald-700'
        }`}>
          {population > 0 ? (
            <>
              <i className={`fas ${activityMeta.icon} mr-1`}></i>
              {population} here
            </>
          ) : 'Visit'}
        </div>
      </Html>
      {population > 0 && (
        <Html center distanceFactor={17} position={[0, 2.55, 0]} className="pointer-events-none">
          <div className="max-w-[140px] truncate rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-stone-600 shadow-md">
            {summary?.topActivity || 'Exploring'}
          </div>
        </Html>
      )}
      {selected && (
        <Html center distanceFactor={8.5} position={[1.35, 2.58, 0]} className="pointer-events-auto" zIndexRange={[84, 0]}>
          <div
            className="w-[244px] rounded-md border border-white/80 bg-[#fffaf1]/96 p-2.5 text-left shadow-xl shadow-stone-900/10 backdrop-blur-md"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700">District Hub</p>
                <p className="truncate text-sm font-black text-stone-800">
                  <i className={`fas ${district.icon} mr-1.5 text-amber-600`}></i>
                  {district.name}
                </p>
                <p className="truncate text-[10px] font-bold text-stone-500">{summary?.topActivity || 'Quiet paths'}</p>
              </div>
              <button
                type="button"
                onClick={onClearSelection}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/80 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                title="Close district"
                aria-label="Close district"
              >
                <i className="fas fa-times text-[10px]"></i>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => void onRunAction(district, 'walk')}
                className="min-h-10 rounded-md border border-emerald-100 bg-white/85 px-2 py-1.5 text-left text-stone-700 transition hover:bg-emerald-50 hover:text-emerald-700"
              >
                <span className="block truncate text-[9px] font-black uppercase tracking-wider">
                  <i className="fas fa-route mr-1.5 text-emerald-600"></i>
                  Walk
                </span>
                <span className="mt-0.5 block truncate text-[8px] font-bold text-stone-400">Center path</span>
              </button>
              <button
                type="button"
                onClick={() => void onRunAction(district, 'primary')}
                className="min-h-10 rounded-md bg-pink-500 px-2 py-1.5 text-left text-white shadow-sm shadow-pink-200 transition hover:-translate-y-0.5 hover:bg-pink-600"
              >
                <span className="block truncate text-[9px] font-black uppercase tracking-wider">
                  <i className={`fas ${primaryAction.icon} mr-1.5`}></i>
                  {primaryAction.label}
                </span>
                <span className="mt-0.5 block truncate text-[8px] font-bold text-white/75">{primaryAction.hint}</span>
              </button>
              <button
                type="button"
                onClick={() => void onRunAction(district, 'party')}
                disabled={isPartyUpdating}
                className="min-h-10 rounded-md border border-amber-100 bg-white/85 px-2 py-1.5 text-left text-stone-700 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-wait disabled:opacity-60"
              >
                <span className="block truncate text-[9px] font-black uppercase tracking-wider">
                  <i className={`fas ${isPartyUpdating ? 'fa-spinner fa-spin' : 'fa-users'} mr-1.5 text-amber-600`}></i>
                  Party
                </span>
                <span className="mt-0.5 block truncate text-[8px] font-bold text-stone-400">{partyLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => void onRunAction(district, 'chat')}
                className="min-h-10 rounded-md border border-emerald-100 bg-white/85 px-2 py-1.5 text-left text-stone-700 transition hover:bg-emerald-50 hover:text-emerald-700"
              >
                <span className="block truncate text-[9px] font-black uppercase tracking-wider">
                  <i className="fas fa-comment mr-1.5 text-emerald-600"></i>
                  Chat
                </span>
                <span className="mt-0.5 block truncate text-[8px] font-bold text-stone-400">{chatCount} recent messages</span>
              </button>
            </div>
            {district.id === 'market' && marketControls && (
              <div className="mt-2 border-t border-amber-100 pt-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="truncate text-[8px] font-black uppercase tracking-[0.2em] text-amber-700">Market Stall</p>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-800">
                    {marketControls.balance} pts
                  </span>
                </div>
                <div className="space-y-1.5">
                  {marketControls.catalog.slice(0, 4).map(item => {
                    const pending = marketControls.isPurchasingItem === item.itemKey ||
                      marketControls.isEquippingItem === `${item.slot}:${item.itemKey}`;
                    const canBuy = item.isOwned || marketControls.balance >= item.price;
                    const actionLabel = item.isEquipped ? 'Equipped' : item.isOwned ? 'Equip' : `${item.price} pts`;
                    return (
                      <button
                        key={item.itemKey}
                        type="button"
                        onClick={() => marketControls.onSelectCatalogItem(item)}
                        disabled={pending || item.isEquipped || !canBuy}
                        className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          item.isEquipped
                            ? 'border-emerald-200 bg-emerald-50'
                            : item.isOwned
                              ? 'border-amber-200 bg-white/85 hover:bg-amber-50'
                              : canBuy
                                ? 'border-stone-200 bg-white/85 hover:border-amber-300 hover:bg-amber-50'
                                : 'border-stone-100 bg-stone-50'
                        }`}
                        title={`${item.name} - ${item.description}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[9px] font-black uppercase tracking-wider text-stone-700">
                            <i className={`fas ${item.icon} mr-1.5 text-amber-700`}></i>
                            {item.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[8px] font-bold text-stone-400">
                            {item.rarity} {item.slot}
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                          item.isEquipped ? 'bg-emerald-700 text-white' : item.isOwned ? 'bg-stone-800 text-white' : canBuy ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-500'
                        }`}>
                          {pending ? <i className="fas fa-spinner fa-spin"></i> : actionLabel}
                        </span>
                      </button>
                    );
                  })}
                  {marketControls.catalog.length === 0 && (
                    <p className="rounded-md bg-white/80 px-2 py-3 text-center text-[10px] font-bold text-stone-400">
                      The stall is being stocked.
                    </p>
                  )}
                </div>
              </div>
            )}
            {district.id === 'guild-hall' && titleControls && (
              <div className="mt-2 border-t border-emerald-100 pt-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="truncate text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700">Title Board</p>
                  <span className="max-w-[94px] shrink-0 truncate rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-800">
                    {titleControls.currentTitle || 'Explorer'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {titleControls.achievements.slice(0, 4).map(achievement => {
                    const pending = titleControls.isEquippingTitle === achievement.achievementKey;
                    const active = achievement.isTitleEquipped || achievement.titleReward === titleControls.currentTitle;
                    return (
                      <button
                        key={achievement.achievementKey}
                        type="button"
                        onClick={() => titleControls.onEquipTitle(achievement)}
                        disabled={!achievement.titleReward || active || pending}
                        className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          active
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-white/80 bg-white/85 hover:border-emerald-200 hover:bg-emerald-50'
                        }`}
                        title={achievement.titleReward || achievement.name}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[9px] font-black uppercase tracking-wider text-stone-700">
                            <i className={`fas ${achievement.icon} mr-1.5 text-emerald-700`}></i>
                            {achievement.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[8px] font-bold text-stone-400">
                            {achievement.titleReward || 'No title reward'}
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                          active ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-white'
                        }`}>
                          {pending ? <i className="fas fa-spinner fa-spin"></i> : active ? 'Active' : 'Equip'}
                        </span>
                      </button>
                    );
                  })}
                  {titleControls.achievements.length === 0 && (
                    <p className="rounded-md bg-white/80 px-2 py-3 text-center text-[10px] font-bold text-stone-400">
                      Earn title badges by exploring the world.
                    </p>
                  )}
                </div>
              </div>
            )}
            {district.id === 'event-lawn' && eventControls && (
              <div className="mt-2 border-t border-amber-100 pt-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="truncate text-[8px] font-black uppercase tracking-[0.2em] text-amber-700">Event Board</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                    eventControls.isJoined ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {eventControls.isJoined ? 'Joined' : `${eventControls.event?.participants.length || 0} here`}
                  </span>
                </div>
                <div className="rounded-md bg-white/85 px-2 py-1.5">
                  <p className="truncate text-[9px] font-black uppercase tracking-wider text-stone-700">
                    <i className="fas fa-star mr-1.5 text-amber-600"></i>
                    {eventControls.event?.title || 'Garden Gathering'}
                  </p>
                  <p className="mt-0.5 truncate text-[8px] font-bold text-stone-400">
                    {eventControls.rallyCount > 0
                      ? `${eventControls.rallyCount} rallies${eventControls.lastRallyBy ? ` - ${eventControls.lastRallyBy}` : ''}`
                      : eventControls.event?.description || 'Gather at the lawn'}
                  </p>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={eventControls.isJoined ? eventControls.onLeave : eventControls.onJoin}
                    disabled={eventControls.isUpdating}
                    className={`min-h-9 rounded-md px-2 py-1.5 text-left text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-60 ${
                      eventControls.isJoined ? 'bg-stone-700 hover:bg-stone-800' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    <span className="block truncate text-[9px] font-black uppercase tracking-wider">
                      <i className={`fas ${eventControls.isUpdating ? 'fa-spinner fa-spin' : eventControls.isJoined ? 'fa-door-open' : 'fa-star'} mr-1.5`}></i>
                      {eventControls.isJoined ? 'Leave' : 'Join'}
                    </span>
                    <span className="mt-0.5 block truncate text-[8px] font-bold text-white/75">
                      {eventControls.isJoined ? 'Step away' : 'Attend here'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={eventControls.onRally}
                    disabled={eventControls.isUpdating}
                    className="min-h-9 rounded-md border border-rose-100 bg-white/85 px-2 py-1.5 text-left text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="block truncate text-[9px] font-black uppercase tracking-wider">
                      <i className={`fas ${eventControls.isUpdating ? 'fa-spinner fa-spin' : 'fa-bullhorn'} mr-1.5 text-rose-500`}></i>
                      Rally
                    </span>
                    <span className="mt-0.5 block truncate text-[8px] font-bold text-stone-400">Call nearby</span>
                  </button>
                </div>
              </div>
            )}
            {district.id === 'workshop' && workshopControls && (
              <div className="mt-2 border-t border-amber-100 pt-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="truncate text-[8px] font-black uppercase tracking-[0.2em] text-amber-700">Avatar Tuning</p>
                  <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-stone-500">
                    {workshopControls.isSaving ? <i className="fas fa-spinner fa-spin"></i> : 'Live'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { key: 'bodyColor', label: 'Body', color: workshopControls.appearance.bodyColor },
                    { key: 'trimColor', label: 'Trim', color: workshopControls.appearance.trimColor },
                    { key: 'hairColor', label: 'Hair', color: workshopControls.appearance.hairColor },
                  ] as Array<{ key: WorkshopColorKey; label: string; color: string }>).map(control => (
                    <button
                      key={control.key}
                      type="button"
                      onClick={() => workshopControls.onCycleColor(control.key)}
                      disabled={workshopControls.isSaving}
                      className="min-h-9 rounded-md border border-white/80 bg-white/80 px-1.5 py-1 text-left transition hover:bg-amber-50 disabled:cursor-wait disabled:opacity-60"
                      title={`Cycle ${control.label.toLowerCase()} color`}
                    >
                      <span className="mb-0.5 block h-2.5 rounded-full shadow-inner" style={{ backgroundColor: control.color }} />
                      <span className="block truncate text-[8px] font-black uppercase tracking-wider text-stone-600">{control.label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {([
                    {
                      key: 'aura',
                      label: 'Aura',
                      meta: getCosmeticAuraOption(workshopControls.cosmetics.aura),
                    },
                    {
                      key: 'trail',
                      label: 'Trail',
                      meta: getCosmeticTrailOption(workshopControls.cosmetics.trail),
                    },
                    {
                      key: 'nameplate',
                      label: 'Plate',
                      meta: getCosmeticNameplateOption(workshopControls.cosmetics.nameplate),
                    },
                  ] as Array<{
                    key: WorkshopCosmeticKey;
                    label: string;
                    meta: { id: string; label: string; icon: string; color?: string };
                  }>).map(control => (
                    <button
                      key={control.key}
                      type="button"
                      onClick={() => workshopControls.onCycleCosmetic(control.key)}
                      disabled={workshopControls.isSaving}
                      className="min-h-9 rounded-md border border-pink-100 bg-white/80 px-1.5 py-1 text-left transition hover:bg-pink-50 disabled:cursor-wait disabled:opacity-60"
                      title={`Cycle ${control.label.toLowerCase()}: ${control.meta.label}`}
                    >
                      <span className="block truncate text-[8px] font-black uppercase tracking-wider text-stone-600">
                        <i className={`fas ${control.meta.icon} mr-1`} style={{ color: control.meta.color || '#ec4899' }}></i>
                        {control.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[8px] font-bold text-stone-400">{control.meta.label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {INVENTORY_SLOTS.map(({ slot, label, icon }) => {
                    const equippedKey = workshopControls.equipment[slot] || 'none';
                    const ownedCount = workshopControls.inventory.filter(item => item.slot === slot).length;
                    const pending = Boolean(workshopControls.isEquippingItem?.startsWith(`${slot}:`));
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => workshopControls.onCycleEquipment(slot)}
                        disabled={pending}
                        className="min-h-9 rounded-md border border-emerald-100 bg-white/80 px-1.5 py-1 text-left transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
                        title={`Cycle ${label.toLowerCase()} gear`}
                      >
                        <span className="block truncate text-[8px] font-black uppercase tracking-wider text-stone-600">
                          <i className={`fas ${pending ? 'fa-spinner fa-spin' : icon} mr-1 text-emerald-600`}></i>
                          {label}
                        </span>
                        <span className="mt-0.5 block truncate text-[8px] font-bold text-stone-400">
                          {equippedKey === 'none' ? `${ownedCount} owned` : getEquipmentLabel(equippedKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => onOpenDetails(district)}
              className="mt-2 flex min-h-8 w-full items-center justify-between gap-2 rounded-md bg-emerald-50 px-2 py-1.5 text-left text-emerald-700 transition hover:bg-emerald-100"
            >
              <span className="min-w-0 truncate text-[9px] font-black uppercase tracking-wider">
                <i className="fas fa-location-dot mr-1.5"></i>
                Roster
              </span>
              <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[8px] font-black">
                {population} here
              </span>
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

function WorldPopulationBoard({
  districts,
  activeDistrict,
  districtPresenceSummary,
  onSelectDistrict,
}: {
  districts: WorldDistrict[];
  activeDistrict: WorldDistrict;
  districtPresenceSummary: Record<string, DistrictPresenceSummary>;
  onSelectDistrict: (district: WorldDistrict) => void;
}) {
  const boardRef = React.useRef<THREE.Group>(null);
  const pinRef = React.useRef<THREE.Group>(null);
  const entries = React.useMemo(() => (
    districts
      .map(district => {
        const summary = districtPresenceSummary[district.id];
        const population = summary?.count || 0;
        return {
          district,
          summary,
          population,
          activityMeta: getActivityMeta(summary?.topActivity),
          active: activeDistrict.id === district.id,
        };
      })
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return b.population - a.population || a.district.name.localeCompare(b.district.name);
      })
  ), [activeDistrict.id, districtPresenceSummary, districts]);
  const totalOnline = React.useMemo(
    () => Object.values(districtPresenceSummary).reduce((sum, summary) => sum + summary.count, 0),
    [districtPresenceSummary]
  );

  useGameLoop((_, __, elapsed) => {
    if (boardRef.current) {
      boardRef.current.position.y = Math.sin(elapsed * 1.2) * 0.012;
    }

    if (pinRef.current) {
      pinRef.current.rotation.y = Math.sin(elapsed * 0.9) * 0.08;
    }
  });

  return (
    <group position={WORLD_POPULATION_BOARD_POSITION}>
      <group ref={boardRef} rotation={[0, Math.PI, 0]}>
        <mesh position={[-1.38, 0.72, -0.06]} castShadow>
          <boxGeometry args={[0.12, 1.42, 0.12]} />
          <meshStandardMaterial color="#8b5e34" roughness={0.82} />
        </mesh>
        <mesh position={[1.38, 0.72, -0.06]} castShadow>
          <boxGeometry args={[0.12, 1.42, 0.12]} />
          <meshStandardMaterial color="#8b5e34" roughness={0.82} />
        </mesh>
        <mesh position={[0, 1.18, 0]} castShadow>
          <boxGeometry args={[3.18, 1.32, 0.16]} />
          <meshStandardMaterial color="#f5deb3" roughness={0.86} />
        </mesh>
        <mesh position={[0, 1.87, 0.01]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[2.34, 0.2, 0.18]} />
          <meshStandardMaterial color="#d6a25e" roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.46, 0.04]} castShadow>
          <boxGeometry args={[2.78, 0.14, 0.18]} />
          <meshStandardMaterial color="#a16207" roughness={0.84} />
        </mesh>
        <pointLight position={[0, 1.55, 0.45]} intensity={0.22 + Math.min(totalOnline, 6) * 0.035} distance={4.2} color="#f59e0b" />
        <group ref={pinRef}>
          {entries.map((entry, index) => {
            const x = -1.05 + index * 0.7;
            return (
              <group key={entry.district.id} position={[x, 1.55, 0.16]}>
                <mesh castShadow>
                  <sphereGeometry args={[entry.active ? 0.095 : 0.075, 14, 14]} />
                  <meshStandardMaterial
                    color={entry.population > 0 || entry.active ? entry.district.color : '#d6d3d1'}
                    emissive={entry.active ? '#ec4899' : entry.population > 0 ? '#047857' : '#000000'}
                    emissiveIntensity={entry.active ? 0.24 : entry.population > 0 ? 0.1 : 0}
                    roughness={0.54}
                  />
                </mesh>
                {entry.population > 0 && (
                  <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.1, 0.14, 18]} />
                    <meshBasicMaterial color="#34d399" transparent opacity={0.34} side={THREE.DoubleSide} />
                  </mesh>
                )}
              </group>
            );
          })}
        </group>
      </group>

      <Html center distanceFactor={11} position={[0, 1.24, -0.26]} className="pointer-events-auto" zIndexRange={[62, 0]}>
        <div
          className="w-[260px] rounded-md border border-amber-100 bg-[#fffaf1]/95 p-2.5 shadow-xl shadow-amber-900/10 backdrop-blur-md"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.22em] text-amber-700">World Pulse</p>
              <p className="truncate text-[10px] font-bold text-stone-500">{totalOnline} online across the land</p>
            </div>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-700">
              <i className="fas fa-map-location-dot text-[10px]"></i>
            </span>
          </div>
          <div className="space-y-1">
            {entries.map(entry => (
              <button
                key={entry.district.id}
                type="button"
                onClick={() => onSelectDistrict(entry.district)}
                className={`flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition ${
                  entry.active ? 'bg-pink-500 text-white shadow-sm shadow-pink-200' : 'bg-white/80 text-stone-700 hover:bg-amber-50'
                }`}
              >
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-wider">
                    <i className={`fas ${entry.district.icon} shrink-0`} style={{ color: entry.active ? undefined : '#d97706' }}></i>
                    <span className="truncate">{entry.district.name}</span>
                  </span>
                  <span className={`block truncate text-[8px] font-bold ${entry.active ? 'text-white/75' : 'text-stone-400'}`}>
                    {entry.summary?.topActivity || 'Quiet paths'}
                  </span>
                </span>
                <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                  entry.active ? 'bg-white/20 text-white' : entry.population > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                }`}>
                  <i className={`fas ${entry.activityMeta.icon}`}></i>
                  {entry.population}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Html>
    </group>
  );
}

function WorldPortalMarker({
  portal,
  active,
  onSelect,
  onOpen,
  onOpenBoard,
}: {
  portal: WorldPortal;
  active?: boolean;
  onSelect: (portal: WorldPortal) => void;
  onOpen?: (portal: WorldPortal) => void | Promise<void>;
  onOpenBoard?: (portal: WorldPortal) => void;
}) {
  const portalStatus = getStatusMeta(portal.status);

  return (
    <group
      position={portal.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(portal);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 1.08, 40]} />
        <meshBasicMaterial color={portal.color} transparent opacity={active ? 0.46 : 0.28} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.72, 36]} />
        <meshStandardMaterial color="#fff7ed" roughness={0.8} />
      </mesh>
      <mesh position={[-0.38, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 1.18, 12]} />
        <meshStandardMaterial color="#8b5e34" roughness={0.82} />
      </mesh>
      <mesh position={[0.38, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 1.18, 12]} />
        <meshStandardMaterial color="#8b5e34" roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.28, 0]} castShadow>
        <boxGeometry args={[0.92, 0.18, 0.16]} />
        <meshStandardMaterial color={portal.color} roughness={0.66} />
      </mesh>
      <mesh position={[0, 0.74, 0.035]} castShadow>
        <boxGeometry args={[0.58, 0.5, 0.1]} />
        <meshStandardMaterial color="#fffaf1" roughness={0.72} />
      </mesh>
      <pointLight position={[0, 1.15, 0.35]} intensity={active ? 0.9 : 0.42} distance={4} color={portal.color} />
      <Html center distanceFactor={13} position={[0, 1.72, 0]} className="pointer-events-none">
        <div className={`max-w-[170px] rounded-md border px-3 py-1.5 text-center shadow-lg ${
          active ? 'border-pink-200 bg-white/95' : 'border-white/70 bg-[#fffaf1]/92'
        }`}>
          <p className="truncate text-[10px] font-black text-stone-800">
            <i className={`fas ${portal.icon} mr-1.5`} style={{ color: portal.color }}></i>
            {portal.name}
          </p>
          <p className="truncate text-[8px] font-black uppercase tracking-wider text-stone-400">{portal.actionLabel}</p>
        </div>
      </Html>
      {active && (
        <Html center distanceFactor={8.5} position={[1.12, 2.28, 0]} className="pointer-events-auto" zIndexRange={[82, 0]}>
          <div
            className="w-[222px] rounded-md border border-white/80 bg-[#fffaf1]/96 p-2.5 text-left shadow-xl shadow-stone-900/10 backdrop-blur-md"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-pink-500">World Portal</p>
                <p className="truncate text-sm font-black text-stone-800">{portal.name}</p>
                <p className="truncate text-[10px] font-bold text-emerald-700">{portal.subtitle}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-stone-600">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: portalStatus.color }} />
                {portalStatus.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => void onOpen?.(portal)}
                className="min-h-10 rounded-md px-2 py-1.5 text-left text-white shadow-sm transition hover:-translate-y-0.5"
                style={{ backgroundColor: portal.color }}
              >
                <span className="block truncate text-[9px] font-black uppercase tracking-wider">
                  <i className={`fas ${portal.icon} mr-1.5`}></i>
                  Open
                </span>
                <span className="mt-0.5 block truncate text-[8px] font-bold text-white/75">{portal.actionLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenBoard?.(portal)}
                className="min-h-10 rounded-md border border-pink-100 bg-white/85 px-2 py-1.5 text-left text-stone-700 transition hover:bg-pink-50 hover:text-pink-700"
              >
                <span className="block truncate text-[9px] font-black uppercase tracking-wider">
                  <i className="fas fa-table-list mr-1.5 text-pink-500"></i>
                  Board
                </span>
                <span className="mt-0.5 block truncate text-[8px] font-bold text-stone-400">Preview here</span>
              </button>
            </div>
            <p className="mt-2 truncate rounded-md bg-emerald-50 px-2 py-1.5 text-[8px] font-black uppercase tracking-wider text-emerald-700">
              <i className="fas fa-signal mr-1.5"></i>
              Broadcasts {portal.activity}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}

function ActivityBeaconMarker({
  beacon,
  onSelect,
}: {
  beacon: WorldActivityBeacon;
  onSelect: (beacon: WorldActivityBeacon) => void;
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  const speechRippleRef = React.useRef<THREE.Group>(null);
  const isNearbySpeech = Boolean(beacon.message && isNearbySpeechChannel(beacon.message));
  const speechRange = isNearbySpeech
    ? THREE.MathUtils.clamp(getChatMetadataNumber(beacon.message!, 'speechRange') || NEARBY_SPEECH_RANGE, 3, NEARBY_SPEECH_RANGE)
    : 0;

  useGameLoop((_, __, elapsed) => {
    const seed = hashString(beacon.id) * 0.01;

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(elapsed * 1.6 + seed) * 0.08;
      groupRef.current.rotation.y = elapsed * 0.45 + seed;
    }

    if (speechRippleRef.current) {
      const pulse = 1 + ((Math.sin(elapsed * 1.9 + seed) + 1) / 2) * 0.035;
      speechRippleRef.current.scale.set(pulse, pulse, 1);
      speechRippleRef.current.rotation.z = elapsed * 0.06 + seed;
    }
  });

  return (
    <group
      position={beacon.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(beacon);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {isNearbySpeech && (
        <group ref={speechRippleRef}>
          <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
            <ringGeometry args={[speechRange - 0.05, speechRange + 0.05, 96]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.13} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
            <ringGeometry args={[speechRange * 0.46, speechRange * 0.46 + 0.04, 72]} />
            <meshBasicMaterial color="#fff7ed" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {[0, 1, 2].map(index => {
            const angle = index * ((Math.PI * 2) / 3) + hashString(`${beacon.id}:${index}`) * 0.002;
            const radius = speechRange * 0.72;

            return (
              <mesh
                key={index}
                position={[Math.cos(angle) * radius, 0.055, Math.sin(angle) * radius]}
                rotation={[-Math.PI / 2, 0, 0]}
                renderOrder={2}
              >
                <circleGeometry args={[0.08, 14]} />
                <meshBasicMaterial color="#fbbf24" transparent opacity={0.22} depthWrite={false} />
              </mesh>
            );
          })}
        </group>
      )}
      <group ref={groupRef}>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.58, 28]} />
          <meshBasicMaterial color={beacon.color} transparent opacity={0.34} side={THREE.DoubleSide} />
        </mesh>
        {isNearbySpeech && (
          <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <ringGeometry args={[0.66, 0.82, 36]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
        <mesh position={[0, 1.08, 0]} castShadow>
          <sphereGeometry args={[0.18, 18, 18]} />
          <meshStandardMaterial color={beacon.color} emissive={beacon.color} emissiveIntensity={0.28} roughness={0.48} />
        </mesh>
        <pointLight position={[0, 1.15, 0]} intensity={isNearbySpeech ? 0.42 : 0.32} distance={isNearbySpeech ? 4.2 : 3.4} color={beacon.color} />
        <Html center distanceFactor={12} position={[0, 1.72, 0]} className="pointer-events-none">
          <div className="max-w-[190px] rounded-md border border-white/70 bg-[#fffaf1]/94 px-3 py-1.5 text-center shadow-lg">
            <p className="truncate text-[10px] font-black text-stone-800">
              <i className={`fas ${beacon.icon} mr-1.5`} style={{ color: beacon.color }}></i>
              {beacon.label}
            </p>
            <p className="truncate text-[8px] font-black uppercase tracking-wider text-stone-400">{beacon.detail}</p>
            {isNearbySpeech && (
              <p className="truncate text-[8px] font-black uppercase tracking-wider text-amber-600">
                <i className="fas fa-volume-low mr-1"></i>
                {Math.round(speechRange)}m speech
              </p>
            )}
          </div>
        </Html>
      </group>
    </group>
  );
}

function VoiceMarker({
  marker,
  onSelect,
}: {
  marker: WorldVoiceMarker;
  onSelect: (marker: WorldVoiceMarker) => void;
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  const inputLevel = marker.muted ? 0 : marker.inputLevel || 0;

  useGameLoop((_, __, elapsed) => {
    if (!groupRef.current) return;
    const seed = hashString(marker.id) * 0.008;
    const pulse = Math.sin(elapsed * 2.2 + seed);
    groupRef.current.position.y = pulse * 0.045;
    groupRef.current.rotation.y = Math.sin(elapsed * 0.7 + seed) * 0.12;
    groupRef.current.scale.setScalar(marker.active ? 1.06 + pulse * 0.025 + inputLevel * 0.08 : 1 + pulse * 0.018);
  });

  const ringOpacity = marker.active ? 0.42 : 0.24;
  const icon = marker.muted ? 'fa-microphone-slash' : marker.icon;
  const signalStrength = marker.signalStrength ?? (marker.active ? 3 : 2);
  const rangeOpacity = marker.distance === undefined
    ? 0.16
    : 0.1 + (1 - THREE.MathUtils.clamp(marker.distance / PROXIMITY_VOICE_RANGE, 0, 1)) * 0.2;

  return (
    <group
      position={marker.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(marker);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <group ref={groupRef}>
        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 0.96, 48]} />
          <meshBasicMaterial color={marker.color} transparent opacity={rangeOpacity} side={THREE.DoubleSide} />
        </mesh>
        {marker.active && !marker.muted && (
          <mesh position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1 + inputLevel * 0.26, 1 + inputLevel * 0.26, 1]}>
            <ringGeometry args={[1.0, 1.08, 48]} />
            <meshBasicMaterial color={marker.color} transparent opacity={0.12 + inputLevel * 0.28} side={THREE.DoubleSide} />
          </mesh>
        )}
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, marker.active ? 0.78 : 0.66, 38]} />
          <meshBasicMaterial color={marker.color} transparent opacity={ringOpacity} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 36]} />
          <meshStandardMaterial color="#fff7ed" roughness={0.78} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0.62, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.07, 0.86, 12]} />
          <meshStandardMaterial color="#8b5e34" roughness={0.84} />
        </mesh>
        <mesh position={[0, 1.12, 0]} castShadow>
          <sphereGeometry args={[0.18, 20, 20]} />
          <meshStandardMaterial
            color={marker.active ? marker.color : '#f8d7a8'}
            emissive={marker.color}
            emissiveIntensity={marker.active ? 0.36 : 0.14}
            roughness={0.48}
          />
        </mesh>
        <mesh position={[0, 1.12, 0.16]} castShadow>
          <boxGeometry args={[0.18, 0.08, 0.05]} />
          <meshStandardMaterial color="#fffaf1" roughness={0.58} />
        </mesh>
        {[0, 1, 2].map(index => (
          <mesh key={index} position={[-0.24 + index * 0.16, 0.36 + index * 0.055, 0.46]} castShadow>
            <boxGeometry args={[0.08, 0.16 + index * 0.08, 0.045]} />
            <meshStandardMaterial
              color={index < signalStrength ? marker.color : '#d6d3d1'}
              emissive={index < signalStrength ? marker.color : '#000000'}
              emissiveIntensity={index < signalStrength ? 0.16 : 0}
              roughness={0.58}
              transparent
              opacity={index < signalStrength ? 0.92 : 0.42}
            />
          </mesh>
        ))}
        <pointLight position={[0, 1.18, 0]} intensity={marker.active ? 0.48 : 0.24} distance={3.2} color={marker.color} />
        <Html center distanceFactor={12} position={[0, 1.72, 0]} className="pointer-events-none">
          <div className={`max-w-[190px] rounded-md border px-3 py-1.5 text-center shadow-lg ${
            marker.active ? 'border-violet-200 bg-white/96' : 'border-white/70 bg-[#fffaf1]/92'
          }`}>
            <p className="truncate text-[10px] font-black text-stone-800">
              <i className={`fas ${icon} mr-1.5`} style={{ color: marker.color }}></i>
              {marker.label}
            </p>
            <p className="truncate text-[8px] font-black uppercase tracking-wider text-stone-400">{marker.detail}</p>
            {marker.rangeLabel && (
              <p className="truncate text-[8px] font-black uppercase tracking-wider text-violet-500">{marker.rangeLabel}</p>
            )}
          </div>
        </Html>
      </group>
    </group>
  );
}

function LiveActivityMarker({
  marker,
  onSelect,
}: {
  marker: WorldLiveActivityMarker;
  onSelect: (marker: WorldLiveActivityMarker) => void;
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  const isEvent = marker.kind === 'event';
  const isGroup = marker.kind === 'party' || marker.kind === 'guild';
  const sessionReadyState = marker.session ? getSessionReadyState(marker.session, marker.session.fromUserId) : null;
  const sessionAllReady = Boolean(sessionReadyState?.allReady);
  const markerGlowColor = sessionAllReady ? '#10b981' : marker.color;
  const participantTokens = isEvent
    ? (marker.event?.participants || [])
      .filter(participant => participant.status !== 'left')
      .slice(0, 8)
      .map((participant, index) => ({
        id: participant.userId,
        name: participant.name,
        status: participant.status,
          color: participant.status === 'attending' ? marker.color : '#d6a25f',
        index,
      }))
    : isGroup
      ? (marker.groupMembers || []).slice(0, 8).map((member, index) => ({
        id: member.id,
        name: member.name,
        status: member.status,
        color: member.color,
        index,
      }))
      : marker.session
      ? [
        {
          id: marker.session.fromUserId,
          name: marker.session.fromName,
          status: sessionReadyState?.senderReady ? 'ready' : 'waiting',
          color: sessionReadyState?.senderReady ? '#10b981' : marker.color,
          index: 0,
          ready: Boolean(sessionReadyState?.senderReady),
        },
        ...(marker.session.toUserId ? [{
          id: marker.session.toUserId,
          name: marker.session.toName || 'Explorer',
          status: sessionReadyState?.recipientReady ? 'ready' : 'waiting',
          color: sessionReadyState?.recipientReady ? '#10b981' : '#f59e0b',
          index: 1,
          ready: Boolean(sessionReadyState?.recipientReady),
        }] : []),
      ].filter((participant, index, participants) => (
        participant.id && participants.findIndex(item => item.id === participant.id) === index
      ))
      : [];
  const participantOverflow = isEvent
    ? Math.max(0, (marker.event?.participants.length || 0) - participantTokens.length)
    : isGroup
      ? Math.max(0, (marker.groupMembers?.length || 0) - participantTokens.length)
    : 0;
  const rosterPreview = (isEvent || isGroup) ? participantTokens.slice(0, 4) : [];
  const rosterLabel = isEvent ? 'Attending' : marker.kind === 'party' ? 'Party nearby' : 'Guild nearby';

  useGameLoop((_, __, elapsed) => {
    if (!groupRef.current) return;
    const seed = hashString(marker.id) * 0.01;
    const pulse = Math.sin(elapsed * 1.8 + seed);
    groupRef.current.position.y = pulse * 0.035;
    groupRef.current.rotation.y = Math.sin(elapsed * 0.5 + seed) * 0.08;
    groupRef.current.scale.setScalar(marker.active || sessionAllReady ? 1.05 + pulse * 0.018 : 1 + pulse * 0.012);
  });

  return (
    <group
      position={marker.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(marker);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <group ref={groupRef}>
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.68, marker.active || sessionAllReady ? 1.02 : 0.9, 44]} />
          <meshBasicMaterial color={markerGlowColor} transparent opacity={marker.active || sessionAllReady ? 0.38 : 0.24} side={THREE.DoubleSide} />
        </mesh>
        {sessionAllReady && (
          <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <ringGeometry args={[0.96, 1.1, 52]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.58, 40]} />
          <meshStandardMaterial color="#fff7ed" roughness={0.82} />
        </mesh>
        {isEvent ? (
          <>
            <mesh position={[0, 0.34, 0]} castShadow>
              <cylinderGeometry args={[0.52, 0.62, 0.22, 8]} />
              <meshStandardMaterial color="#d6a25f" roughness={0.74} />
            </mesh>
            <mesh position={[-0.24, 0.84, 0]} rotation={[0, 0, -0.18]} castShadow>
              <boxGeometry args={[0.08, 0.92, 0.08]} />
              <meshStandardMaterial color="#8b5e34" roughness={0.78} />
            </mesh>
            <mesh position={[0.24, 0.84, 0]} rotation={[0, 0, 0.18]} castShadow>
              <boxGeometry args={[0.08, 0.92, 0.08]} />
              <meshStandardMaterial color="#8b5e34" roughness={0.78} />
            </mesh>
            <mesh position={[0, 1.24, 0]} castShadow>
              <sphereGeometry args={[0.2, 20, 20]} />
              <meshStandardMaterial color={marker.color} emissive={marker.color} emissiveIntensity={0.2} roughness={0.52} />
            </mesh>
            {participantTokens.map((participant, index) => {
              const angle = (index / Math.max(participantTokens.length, 1)) * Math.PI * 2 + hashString(participant.id) * 0.0008;
              const radius = 0.95 + (index % 2) * 0.1;
              return (
                <group key={participant.id} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
                  <mesh position={[0, 0.2, 0]} castShadow>
                    <cylinderGeometry args={[0.06, 0.08, 0.28, 10]} />
                    <meshStandardMaterial color="#8b5e34" roughness={0.82} />
                  </mesh>
                  <mesh position={[0, 0.44, 0]} castShadow>
                    <sphereGeometry args={[0.12, 16, 16]} />
                    <meshStandardMaterial color={participant.color} emissive={participant.color} emissiveIntensity={marker.active ? 0.18 : 0.08} roughness={0.52} />
                  </mesh>
                </group>
              );
            })}
          </>
        ) : isGroup ? (
          <>
            <mesh position={[0, 0.28, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.16, 0.44, 16]} />
              <meshStandardMaterial color="#8b5e34" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.92, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.045, 1.38, 10]} />
              <meshStandardMaterial color="#6b4a2e" roughness={0.82} />
            </mesh>
            <mesh position={[0.3, 1.28, 0]} castShadow>
              <boxGeometry args={[0.58, 0.36, 0.045]} />
              <meshStandardMaterial color={marker.color} emissive={marker.color} emissiveIntensity={marker.active ? 0.2 : 0.08} roughness={0.55} />
            </mesh>
            <mesh position={[0.02, 1.53, 0]} castShadow>
              <sphereGeometry args={[0.13, 18, 18]} />
              <meshStandardMaterial color="#fffaf1" roughness={0.48} />
            </mesh>
            {participantTokens.map((participant, index) => {
              const angle = (index / Math.max(participantTokens.length, 1)) * Math.PI * 2 + (marker.kind === 'guild' ? 0.42 : 0);
              const radius = 0.82 + (index % 3) * 0.08;
              return (
                <group key={participant.id} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
                  <mesh position={[0, 0.18, 0]} castShadow>
                    <cylinderGeometry args={[0.045, 0.06, 0.24, 10]} />
                    <meshStandardMaterial color="#8b5e34" roughness={0.82} />
                  </mesh>
                  <mesh position={[0, 0.4, 0]} castShadow>
                    <sphereGeometry args={[0.105, 14, 14]} />
                    <meshStandardMaterial color={participant.color} emissive={participant.color} emissiveIntensity={marker.active ? 0.16 : 0.06} roughness={0.54} />
                  </mesh>
                </group>
              );
            })}
          </>
        ) : (
          <>
            <mesh position={[0, 0.48, 0]} castShadow>
              <boxGeometry args={[0.82, 0.18, 0.52]} />
              <meshStandardMaterial color="#9a6b3a" roughness={0.8} />
            </mesh>
            <mesh position={[-0.24, 0.25, -0.16]} castShadow>
              <cylinderGeometry args={[0.05, 0.06, 0.36, 10]} />
              <meshStandardMaterial color="#6b4a2e" roughness={0.85} />
            </mesh>
            <mesh position={[0.24, 0.25, 0.16]} castShadow>
              <cylinderGeometry args={[0.05, 0.06, 0.36, 10]} />
              <meshStandardMaterial color="#6b4a2e" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.76, 0]} castShadow>
              <boxGeometry args={[0.34, 0.06, 0.42]} />
              <meshStandardMaterial color="#fffaf1" roughness={0.68} />
            </mesh>
            <mesh position={[0.3, 0.86, 0.02]} castShadow>
              <sphereGeometry args={[0.12, 18, 18]} />
              <meshStandardMaterial color={markerGlowColor} emissive={markerGlowColor} emissiveIntensity={sessionAllReady ? 0.32 : 0.18} roughness={0.55} />
            </mesh>
            <group position={[0, 0.84, 0.29]}>
              {participantTokens.slice(0, 2).map((participant, index) => {
                const ready = 'ready' in participant && Boolean(participant.ready);
                return (
                  <mesh key={`ready-${participant.id}`} position={[index === 0 ? -0.16 : 0.16, 0, 0]} castShadow>
                    <sphereGeometry args={[0.045, 12, 12]} />
                    <meshStandardMaterial
                      color={ready ? '#10b981' : '#d6a25f'}
                      emissive={ready ? '#10b981' : '#8b5e34'}
                      emissiveIntensity={ready ? 0.26 : 0.05}
                      roughness={0.54}
                    />
                  </mesh>
                );
              })}
            </group>
            {participantTokens.map((participant, index) => {
              const side = index === 0 ? -1 : 1;
              const ready = 'ready' in participant && Boolean(participant.ready);
              return (
                <group key={participant.id} position={[side * 0.58, 0, index === 0 ? -0.22 : 0.22]} rotation={[0, side * -0.35, 0]}>
                  <mesh position={[0, 0.24, 0]} castShadow>
                    <cylinderGeometry args={[0.06, 0.08, 0.34, 10]} />
                    <meshStandardMaterial color="#6b4a2e" roughness={0.84} />
                  </mesh>
                  <mesh position={[0, 0.54, 0]} castShadow>
                    <sphereGeometry args={[0.13, 16, 16]} />
                    <meshStandardMaterial color={participant.color} emissive={participant.color} emissiveIntensity={ready ? 0.32 : marker.active ? 0.2 : 0.08} roughness={0.52} />
                  </mesh>
                  {ready && (
                    <mesh position={[0, 0.56, 0]} rotation={[Math.PI / 2, 0, 0]}>
                      <torusGeometry args={[0.17, 0.011, 8, 22]} />
                      <meshStandardMaterial color="#bbf7d0" emissive="#10b981" emissiveIntensity={0.24} roughness={0.48} />
                    </mesh>
                  )}
                </group>
              );
            })}
          </>
        )}
        {rosterPreview.length > 0 && (
          <group position={[0, 0.74, -0.72]} rotation={[0.08, 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.92, 0.4, 0.045]} />
              <meshStandardMaterial color="#fef3c7" roughness={0.72} />
            </mesh>
            <mesh position={[0, 0.22, -0.015]} castShadow>
              <boxGeometry args={[0.72, 0.055, 0.05]} />
              <meshStandardMaterial color={marker.color} emissive={marker.color} emissiveIntensity={marker.active ? 0.12 : 0.05} roughness={0.58} />
            </mesh>
            {rosterPreview.map((participant, index) => (
              <group key={`roster-${participant.id}`} position={[-0.3 + index * 0.2, 0.02, -0.035]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.045, 0.052, 0.045, 12]} />
                  <meshStandardMaterial color={participant.color} emissive={participant.color} emissiveIntensity={0.12} roughness={0.5} />
                </mesh>
                <mesh position={[0, -0.09, 0]} castShadow>
                  <boxGeometry args={[0.11, 0.028, 0.028]} />
                  <meshStandardMaterial color="#d6a25f" roughness={0.7} />
                </mesh>
              </group>
            ))}
          </group>
        )}
        <pointLight position={[0, 1.2, 0]} intensity={marker.active || sessionAllReady ? 0.48 : 0.24} distance={4} color={markerGlowColor} />
        <Html center distanceFactor={12} position={[0, 1.82, 0]} className="pointer-events-none">
          <div className={`max-w-[230px] rounded-md border px-3 py-1.5 text-center shadow-lg ${
            marker.active ? 'border-pink-200 bg-white/96' : 'border-white/70 bg-[#fffaf1]/93'
          }`}>
            <p className="truncate text-[10px] font-black text-stone-800">
              <i className={`fas ${marker.icon} mr-1.5`} style={{ color: marker.color }}></i>
              {marker.label}
            </p>
            <p className="truncate text-[8px] font-black uppercase tracking-wider text-stone-400">
              {marker.detail}
              {participantOverflow > 0 ? ` +${participantOverflow} nearby` : ''}
            </p>
            {rosterPreview.length > 0 && (
              <div className="mt-1 border-t border-stone-100 pt-1">
                <p className="truncate text-[7px] font-black uppercase tracking-[0.2em] text-stone-400">{rosterLabel}</p>
                <div className="mt-1 flex justify-center gap-1">
                  {rosterPreview.map(participant => (
                    <span
                      key={`label-${participant.id}`}
                      className="inline-flex max-w-[48px] items-center gap-1 truncate rounded-full bg-white/80 px-1.5 py-0.5 text-[7px] font-black text-stone-600"
                      title={`${participant.name} - ${participant.status}`}
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: participant.color }} />
                      <span className="truncate">{participant.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Html>
      </group>
    </group>
  );
}

function EventRallyPulse({
  rally,
  onSelect,
}: {
  rally: WorldEventRallyState;
  onSelect: () => void;
}) {
  const pulseRef = React.useRef<THREE.Group>(null);
  const sparkRef = React.useRef<THREE.Group>(null);

  useGameLoop((_, __, elapsed) => {
    if (pulseRef.current) {
      const pulse = 1 + Math.sin(elapsed * 2.2) * 0.035;
      pulseRef.current.scale.setScalar(pulse);
      pulseRef.current.rotation.y = elapsed * 0.18;
    }

    if (sparkRef.current) {
      sparkRef.current.rotation.y = -elapsed * 0.85;
      sparkRef.current.position.y = 0.16 + Math.sin(elapsed * 3.1) * 0.035;
    }
  });

  if (!rally.visible) return null;

  const opacity = 0.1 + rally.intensity * 0.26;
  const outerRadius = 1.58 + Math.min(0.9, rally.participantCount * 0.1);
  const sparkCount = Math.min(8, Math.max(3, rally.participantCount || 3));

  return (
    <group
      position={rally.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <group ref={pulseRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <ringGeometry args={[outerRadius - 0.08, outerRadius + 0.08, 96]} />
          <meshBasicMaterial
            color={rally.color}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <ringGeometry args={[outerRadius * 0.62, outerRadius * 0.66, 80]} />
          <meshBasicMaterial
            color="#fffaf1"
            transparent
            opacity={0.12 + rally.intensity * 0.14}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group ref={sparkRef}>
        {Array.from({ length: sparkCount }).map((_, index) => {
          const angle = (index / sparkCount) * Math.PI * 2;
          const radius = outerRadius * 0.78;

          return (
            <mesh
              key={index}
              position={[Math.cos(angle) * radius, 0.18, Math.sin(angle) * radius]}
              castShadow
            >
              <sphereGeometry args={[0.065 + rally.intensity * 0.025, 12, 12]} />
              <meshStandardMaterial
                color={index % 2 ? '#fff7ed' : rally.color}
                emissive={rally.color}
                emissiveIntensity={0.12 + rally.intensity * 0.2}
                roughness={0.48}
              />
            </mesh>
          );
        })}
      </group>

      <pointLight
        position={[0, 0.82, 0]}
        intensity={0.16 + rally.intensity * 0.34}
        distance={4.4}
        color={rally.color}
      />
      <Html center distanceFactor={14} position={[0, 2.18, 0]} className="pointer-events-none">
        <div className="max-w-[210px] rounded-md border border-amber-200 bg-[#fffaf1]/95 px-3 py-1.5 text-center shadow-lg backdrop-blur-md">
          <p className="truncate text-[10px] font-black text-stone-800">
            <i className="fas fa-bullhorn mr-1.5 text-amber-500"></i>
            {rally.label}
          </p>
          <p className="truncate text-[8px] font-black uppercase tracking-wider text-stone-400">{rally.detail}</p>
        </div>
      </Html>
    </group>
  );
}

function LandObjectMarker({
  item,
  selected,
  onSelect,
}: {
  item: PurchasedItem;
  selected?: boolean;
  onSelect: (item: PurchasedItem) => void;
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  const meta = getLandObjectMeta(item);
  const position = getLandObjectPosition(item);

  useGameLoop((_, __, elapsed) => {
    if (!groupRef.current) return;
    const seed = hashString(item.id) * 0.01;
    groupRef.current.position.y = Math.sin(elapsed * 1.1 + seed) * (selected ? 0.035 : 0.018);
  });

  const renderObject = () => {
    if (item.type === 'custom_3d' && item.modelUrl) {
      return (
        <React.Suspense fallback={<LandObjectPlaceholder color={meta.color} />}>
          <GameModelAsset url={item.modelUrl} scale={meta.scale} />
        </React.Suspense>
      );
    }

    if (item.type === 'flower1') {
      return (
        <group>
          {[0, 1, 2, 3, 4].map(index => {
            const angle = (index / 5) * Math.PI * 2;
            return (
              <group key={index} position={[Math.cos(angle) * 0.25, 0, Math.sin(angle) * 0.25]}>
                <mesh position={[0, 0.24, 0]} castShadow>
                  <cylinderGeometry args={[0.025, 0.035, 0.42, 6]} />
                  <meshStandardMaterial color="#166534" roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.5, 0]} castShadow>
                  <sphereGeometry args={[0.11, 12, 12]} />
                  <meshStandardMaterial color={index % 2 ? '#f9a8d4' : '#f472b6'} roughness={0.58} />
                </mesh>
              </group>
            );
          })}
        </group>
      );
    }

    if (item.type === 'rock1') {
      return (
        <mesh position={[0, 0.22, 0]} rotation={[0.2, 0.4, -0.08]} castShadow>
          <dodecahedronGeometry args={[0.44, 0]} />
          <meshStandardMaterial color="#78716c" roughness={0.92} />
        </mesh>
      );
    }

    if (item.type === 'tree1' || item.type === 'main_tree') {
      return (
        <group scale={item.type === 'main_tree' ? 1.25 : 0.92}>
          <mesh position={[0, 0.56, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 1.12, 12]} />
            <meshStandardMaterial color="#8b5e34" roughness={0.86} />
          </mesh>
          <mesh position={[0, 1.18, 0]} castShadow>
            <sphereGeometry args={[0.54, 18, 18]} />
            <meshStandardMaterial color={item.type === 'main_tree' ? '#fb7185' : '#2f855a'} roughness={0.72} />
          </mesh>
          <mesh position={[0.25, 1.38, -0.08]} castShadow>
            <sphereGeometry args={[0.34, 14, 14]} />
            <meshStandardMaterial color={item.type === 'main_tree' ? '#f9a8d4' : '#6abf69'} roughness={0.72} />
          </mesh>
        </group>
      );
    }

    if (item.type === 'house1') {
      return (
        <group scale={0.72}>
          <mesh position={[0, 0.48, 0]} castShadow>
            <boxGeometry args={[1.2, 0.86, 1]} />
            <meshStandardMaterial color="#fcd34d" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.08, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.92, 0.64, 4]} />
            <meshStandardMaterial color="#ef4444" roughness={0.78} />
          </mesh>
          <mesh position={[0, 0.26, 0.51]} castShadow>
            <boxGeometry args={[0.28, 0.46, 0.04]} />
            <meshStandardMaterial color="#8b5e34" roughness={0.8} />
          </mesh>
        </group>
      );
    }

    if (item.type === 'dog' || item.type === 'cat') {
      return (
        <group scale={0.7}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <capsuleGeometry args={[0.24, 0.42, 8, 14]} />
            <meshStandardMaterial color={item.type === 'dog' ? '#b45309' : '#7c3aed'} roughness={0.82} />
          </mesh>
          <mesh position={[0.24, 0.76, 0.04]} castShadow>
            <sphereGeometry args={[0.21, 14, 14]} />
            <meshStandardMaterial color={item.type === 'dog' ? '#d97706' : '#a78bfa'} roughness={0.74} />
          </mesh>
          {item.type === 'cat' && (
            <>
              <mesh position={[0.14, 0.96, 0.02]} rotation={[0, 0, 0.2]} castShadow>
                <coneGeometry args={[0.08, 0.16, 3]} />
                <meshStandardMaterial color="#a78bfa" roughness={0.74} />
              </mesh>
              <mesh position={[0.34, 0.96, 0.02]} rotation={[0, 0, -0.2]} castShadow>
                <coneGeometry args={[0.08, 0.16, 3]} />
                <meshStandardMaterial color="#a78bfa" roughness={0.74} />
              </mesh>
            </>
          )}
        </group>
      );
    }

    return <LandObjectPlaceholder color={meta.color} />;
  };

  return (
    <group
      position={position}
      rotation={[0, item.rotation || 0, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <group ref={groupRef}>
        <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[selected ? 0.74 : 0.52, selected ? 0.92 : 0.66, 40]} />
          <meshBasicMaterial color={meta.color} transparent opacity={selected ? 0.42 : 0.22} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.48, 36]} />
          <meshStandardMaterial color="#fff7ed" roughness={0.84} transparent opacity={0.72} />
        </mesh>
        {renderObject()}
        {selected && (
          <Html center distanceFactor={12} position={[0, 1.82, 0]} className="pointer-events-none">
            <div className="max-w-[170px] rounded-md border border-amber-100 bg-[#fffaf1]/95 px-3 py-1.5 text-center shadow-lg">
              <p className="truncate text-[10px] font-black text-stone-800">
                <i className={`fas ${meta.icon} mr-1.5`} style={{ color: meta.color }}></i>
                {meta.label}
              </p>
              <p className="truncate text-[8px] font-black uppercase tracking-wider text-stone-400">Land Object</p>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

function LandObjectPlaceholder({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[0.54, 0.54, 0.54]} />
        <meshStandardMaterial color={color} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.66, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[0.38, 0.12, 0.38]} />
        <meshStandardMaterial color="#fffaf1" roughness={0.68} />
      </mesh>
    </group>
  );
}

function NpcCharacter({
  npc,
  dialogue,
  selected,
  actionDistance,
  queuedActionIntent,
  pendingActionIntent,
  onSelect,
  onRunAction,
  onPositionUpdate,
}: {
  npc: WorldNpc;
  dialogue?: NpcDialoguePulse | null;
  selected?: boolean;
  actionDistance?: number | null;
  queuedActionIntent?: string | null;
  pendingActionIntent?: string | null;
  onSelect: (npc: WorldNpc) => void;
  onRunAction?: (npc: WorldNpc, action: WorldNpc['actions'][number]) => void;
  onPositionUpdate: (npcId: string, position: THREE.Vector3) => void;
}) {
  const rootRef = React.useRef<THREE.Group>(null);
  const groupRef = React.useRef<THREE.Group>(null);
  const dialogueRef = React.useRef<THREE.Group>(null);
  const actionReady = actionDistance !== null && actionDistance !== undefined && actionDistance <= NPC_INTERACTION_RANGE;
  const actionRangeLabel = queuedActionIntent
    ? 'Approaching'
    : actionReady
      ? 'Talk nearby'
      : actionDistance !== null && actionDistance !== undefined
        ? `${actionDistance.toFixed(1)}m away`
        : npc.district;
  const route = React.useMemo(
    () => (npc.patrolRoute && npc.patrolRoute.length > 1 ? npc.patrolRoute : [npc.position])
      .map(point => new THREE.Vector3(point[0], point[1], point[2])),
    [npc]
  );
  const routeSegments = React.useMemo(() => {
    const segments: Array<{ from: THREE.Vector3; to: THREE.Vector3; length: number }> = [];
    for (let index = 0; index < route.length; index += 1) {
      const from = route[index];
      const to = route[(index + 1) % route.length];
      const length = from.distanceTo(to);
      if (length > 0.01) segments.push({ from, to, length });
    }
    return segments;
  }, [route]);
  const routeLength = React.useMemo(
    () => routeSegments.reduce((total, segment) => total + segment.length, 0),
    [routeSegments]
  );
  const patrolSeed = React.useMemo(() => (hashString(npc.id) % 1000) / 1000, [npc.id]);
  const currentPosition = React.useRef(route[0]?.clone() || new THREE.Vector3(...npc.position));
  const nextPosition = React.useRef(route[0]?.clone() || new THREE.Vector3(...npc.position));
  const previousPosition = React.useRef(route[0]?.clone() || new THREE.Vector3(...npc.position));

  useGameLoop((_, __, elapsed) => {
    if (!rootRef.current || !groupRef.current) return;

    if (routeSegments.length > 0 && routeLength > 0) {
      const speed = npc.patrolSpeed || 0.32;
      const loopDuration = routeLength / Math.max(0.08, speed);
      let distance = ((elapsed + patrolSeed * loopDuration) % loopDuration) * speed;

      for (const segment of routeSegments) {
        if (distance <= segment.length) {
          const progress = THREE.MathUtils.clamp(distance / segment.length, 0, 1);
          nextPosition.current.lerpVectors(segment.from, segment.to, progress);
          currentPosition.current.copy(nextPosition.current);
          break;
        }
        distance -= segment.length;
      }

      rootRef.current.position.copy(currentPosition.current);
      const heading = nextPosition.current.clone().sub(previousPosition.current);
      if (heading.lengthSq() > 0.0001) {
        rootRef.current.rotation.y = THREE.MathUtils.lerp(
          rootRef.current.rotation.y,
          Math.atan2(heading.x, heading.z),
          0.12
        );
        previousPosition.current.copy(nextPosition.current);
      }
    }

    groupRef.current.position.y = Math.sin(elapsed * 1.4 + hashString(npc.id)) * 0.015;
    groupRef.current.rotation.y = Math.sin(elapsed * 0.6 + hashString(npc.name)) * 0.08;
    if (dialogueRef.current) {
      dialogueRef.current.position.y = 2.68 + Math.sin(elapsed * 2.5 + patrolSeed) * 0.045;
      dialogueRef.current.scale.setScalar(1 + Math.sin(elapsed * 4.2 + patrolSeed) * 0.035);
    }
    onPositionUpdate(npc.id, currentPosition.current);
  });

  return (
    <group
      ref={rootRef}
      position={npc.position}
      onClick={(event) => {
        event.stopPropagation();
        onPositionUpdate(npc.id, currentPosition.current);
        onSelect(npc);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <group ref={groupRef}>
        <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={selected ? [0.52, 0.68, 42] : [0.48, 0.56, 36]} />
          <meshBasicMaterial color={selected ? '#ec4899' : '#f59e0b'} transparent opacity={selected ? 0.68 : 0.42} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.78, 0]} castShadow>
          <capsuleGeometry args={[0.27, 0.62, 8, 16]} />
          <meshStandardMaterial color={npc.bodyColor} roughness={0.78} />
        </mesh>
        <mesh position={[0, 1.28, 0]} castShadow>
          <sphereGeometry args={[0.25, 20, 20]} />
          <meshStandardMaterial color="#f5d0b6" roughness={0.66} />
        </mesh>
        <mesh position={[0, 1.5, -0.02]} castShadow>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial color="#4a2c2a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.04, -0.29]} castShadow>
          <boxGeometry args={[0.58, 0.18, 0.08]} />
          <meshStandardMaterial color={npc.trimColor} roughness={0.72} />
        </mesh>
        <mesh position={[0.36, 0.68, 0]} rotation={[0.45, 0, -0.45]} castShadow>
          <capsuleGeometry args={[0.05, 0.34, 6, 10]} />
          <meshStandardMaterial color={npc.trimColor} roughness={0.74} />
        </mesh>
        {dialogue && (
          <group ref={dialogueRef} position={[0, 2.68, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
              <ringGeometry args={[0.42, 0.58, 40]} />
              <meshBasicMaterial color={npc.trimColor} transparent opacity={0.48} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <pointLight position={[0, -0.35, 0]} intensity={0.26} distance={2.4} color={npc.trimColor} />
            <Html center distanceFactor={11} position={[0, 0.18, 0]} className="pointer-events-none">
              <div className="max-w-[220px] rounded-md border border-amber-100 bg-[#fffaf1]/96 px-3 py-2 text-center shadow-xl shadow-amber-900/10 backdrop-blur-md">
                <p className="truncate text-[8px] font-black uppercase tracking-[0.2em] text-amber-700">
                  <i className={`fas ${npc.icon} mr-1.5`}></i>
                  {npc.role}
                </p>
                <p className="line-clamp-2 text-[10px] font-bold leading-snug text-stone-700">{dialogue.text}</p>
              </div>
            </Html>
          </group>
        )}
        {routeSegments.length > 0 && (
          <mesh position={[0, 0.055, -0.72]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <ringGeometry args={[0.09, 0.14, 18]} />
            <meshBasicMaterial color={npc.trimColor} transparent opacity={0.42} side={THREE.DoubleSide} />
          </mesh>
        )}
        <Html center distanceFactor={12} position={[0, 2.18, 0]} className="pointer-events-none">
          <div className={`max-w-[170px] rounded-md border px-3 py-1.5 text-center shadow-lg ${
            selected ? 'border-pink-200 bg-white/96' : 'border-amber-100 bg-[#fffaf1]/95'
          }`}>
            <p className="truncate text-[10px] font-black text-stone-800">
              <i className={`fas ${npc.icon} mr-1 text-amber-600`}></i>
              {npc.name}
            </p>
            <p className="truncate text-[8px] font-black uppercase tracking-wider text-amber-700">
              {npc.role}{routeSegments.length > 0 ? ' / Patrolling' : ''}
            </p>
          </div>
        </Html>
        {selected && (
          <Html center distanceFactor={8.5} position={[1.08, 2.42, 0]} className="pointer-events-auto" zIndexRange={[84, 0]}>
            <div
              className="w-[230px] rounded-md border border-amber-100 bg-[#fffaf1]/96 p-2.5 text-left shadow-xl shadow-amber-900/10 backdrop-blur-md"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-600">Talk Nearby</p>
                  <p className="truncate text-sm font-black text-stone-800">{npc.name}</p>
                  <p className="truncate text-[10px] font-bold text-emerald-700">{npc.role}</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-amber-700">
                  {actionRangeLabel}
                </span>
              </div>
              <div className="grid gap-1.5">
                {npc.actions.map((action) => {
                  const pending = pendingActionIntent === action.intent;
                  const queued = queuedActionIntent === action.intent;
                  return (
                    <button
                      key={action.intent}
                      type="button"
                      disabled={Boolean(pendingActionIntent)}
                      onClick={() => onRunAction?.(npc, action)}
                      className={`flex min-h-9 items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-[10px] font-black transition disabled:cursor-wait disabled:opacity-60 ${
                        queued
                          ? 'border-amber-200 bg-amber-100 text-amber-800'
                          : actionReady
                            ? 'border-white/70 bg-white/85 text-stone-700 hover:border-pink-100 hover:bg-pink-50 hover:text-pink-700'
                            : 'border-amber-100 bg-amber-50/90 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        <i className={`fas ${pending ? 'fa-spinner fa-spin' : getNpcActionIcon(action.intent)} mr-1.5 text-amber-600`}></i>
                        {action.label}
                      </span>
                      <span className="shrink-0 text-[8px] uppercase tracking-wider opacity-70">
                        {queued ? 'Walking' : actionReady ? 'Run' : 'Walk'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

function MemoryMarker({ item, index, onFlagClick }: { item: Interaction; index: number; onFlagClick: (item: Interaction) => void }) {
  const angle = (index / 8) * Math.PI * 2;
  const radius = 10 + (index % 3) * 1.4;
  const position: [number, number, number] = [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];

  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onFlagClick(item);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 1.3, 12]} />
        <meshStandardMaterial color="#7c5a3d" roughness={0.86} />
      </mesh>
      <mesh position={[0.34, 1.04, 0]} castShadow>
        <boxGeometry args={[0.7, 0.42, 0.05]} />
        <meshStandardMaterial color="#ec4899" roughness={0.7} />
      </mesh>
      <Html center distanceFactor={13} position={[0.34, 1.55, 0]} className="pointer-events-none">
        <div className="max-w-[140px] rounded-md border border-pink-100 bg-white/90 px-2 py-1 text-[9px] font-bold text-stone-700 shadow-lg">
          <p className="truncate">{item.location || item.text}</p>
        </div>
      </Html>
    </group>
  );
}

function CommonsGround({ onMoveTo }: { onMoveTo: (point: THREE.Vector3) => void }) {
  return (
    <group>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onMoveTo(event.point);
        }}
      >
        <circleGeometry args={[WORLD_BOUNDS, 96]} />
        <meshStandardMaterial color="#8fbf73" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[5.2, 5.9, 80]} />
        <meshStandardMaterial color="#d6c29a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.1, 48]} />
        <meshStandardMaterial color="#c6d9ef" roughness={0.62} transparent opacity={0.9} />
      </mesh>
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 8.5, 0.04, Math.sin(angle) * 8.5]} rotation={[0, -angle, 0]} castShadow>
            <boxGeometry args={[1.8, 0.18, 0.38]} />
            <meshStandardMaterial color="#b98e5e" roughness={0.88} />
          </mesh>
        );
      })}
    </group>
  );
}

function CameraRig({
  targetRef,
  cameraMode,
  rotation,
  zoom,
}: {
  targetRef: React.MutableRefObject<THREE.Vector3>;
  cameraMode: 'isometric' | 'third';
  rotation: number;
  zoom: number;
}) {
  const { camera } = useThree();
  const lookTarget = React.useRef(new THREE.Vector3());
  const desired = React.useRef(new THREE.Vector3());

  useGameLoop((_, delta) => {
    const target = targetRef.current;
    const baseOffset = cameraMode === 'third'
      ? new THREE.Vector3(0, 4.6 * zoom, 7.4 * zoom)
      : new THREE.Vector3(9.5 * zoom, 8.2 * zoom, 9.5 * zoom);
    baseOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);

    desired.current.copy(target).add(baseOffset);
    camera.position.lerp(desired.current, 1 - Math.exp(-delta * 5));
    lookTarget.current.lerp(new THREE.Vector3(target.x, target.y + 1.1, target.z), 1 - Math.exp(-delta * 7));
    camera.lookAt(lookTarget.current);
  });

  return null;
}

function MoveTargetGuide({
  cameraTargetRef,
  moveTargetRef,
  activeFollowTargetId,
  collisionBodies,
}: {
  cameraTargetRef: React.MutableRefObject<THREE.Vector3>;
  moveTargetRef: React.MutableRefObject<THREE.Vector3>;
  activeFollowTargetId: string | null;
  collisionBodies: WorldCollisionBody[];
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  const markerRef = React.useRef<THREE.Group>(null);
  const pathRef = React.useRef<THREE.Mesh>(null);
  const pathBRef = React.useRef<THREE.Mesh>(null);
  const waypointRef = React.useRef<THREE.Group>(null);
  const startRef = React.useRef(new THREE.Vector3());
  const endRef = React.useRef(new THREE.Vector3());
  const waypointVectorRef = React.useRef(new THREE.Vector3());
  const directionRef = React.useRef(new THREE.Vector3());
  const midpointRef = React.useRef(new THREE.Vector3());
  const quaternionRef = React.useRef(new THREE.Quaternion());
  const upRef = React.useRef(new THREE.Vector3(0, 1, 0));

  const updatePathSegment = React.useCallback((mesh: THREE.Mesh | null, start: THREE.Vector3, end: THREE.Vector3) => {
    if (!mesh) return 0;
    const distance = start.distanceTo(end);
    mesh.visible = distance > 0.08;
    if (!mesh.visible) return distance;

    directionRef.current.copy(end).sub(start).normalize();
    midpointRef.current.copy(start).add(end).multiplyScalar(0.5);
    quaternionRef.current.setFromUnitVectors(upRef.current, directionRef.current);
    mesh.position.copy(midpointRef.current);
    mesh.quaternion.copy(quaternionRef.current);
    mesh.scale.set(1, distance, 1);
    return distance;
  }, []);

  useGameLoop((_, __, elapsed) => {
    startRef.current.copy(cameraTargetRef.current).setY(0.05);
    endRef.current.copy(moveTargetRef.current).setY(0.05);

    const distance = startRef.current.distanceTo(endRef.current);
    const visible = distance > MOVE_TARGET_VISIBLE_DISTANCE;
    if (groupRef.current) groupRef.current.visible = visible;
    if (!visible) return;

    if (markerRef.current) {
      markerRef.current.position.copy(endRef.current);
      markerRef.current.rotation.y = elapsed * 1.4;
      markerRef.current.scale.setScalar(1 + Math.sin(elapsed * 5.5) * 0.045);
    }

    const waypoint = getNavigationWaypoint(startRef.current, endRef.current, collisionBodies);
    if (waypoint) {
      waypointVectorRef.current.copy(waypoint).setY(0.055);
      updatePathSegment(pathRef.current, startRef.current, waypointVectorRef.current);
      updatePathSegment(pathBRef.current, waypointVectorRef.current, endRef.current);
      if (waypointRef.current) {
        waypointRef.current.visible = true;
        waypointRef.current.position.copy(waypointVectorRef.current);
        waypointRef.current.rotation.y = -elapsed * 1.1;
      }
    } else {
      updatePathSegment(pathRef.current, startRef.current, endRef.current);
      if (pathBRef.current) pathBRef.current.visible = false;
      if (waypointRef.current) waypointRef.current.visible = false;
    }
  });

  const markerColor = activeFollowTargetId ? '#38bdf8' : '#f59e0b';
  const pathColor = activeFollowTargetId ? '#7dd3fc' : '#fbbf24';

  return (
    <group ref={groupRef} visible={false}>
      <mesh ref={pathRef} position={[0, 0.05, 0]} renderOrder={2}>
        <cylinderGeometry args={[0.026, 0.026, 1, 8]} />
        <meshBasicMaterial color={pathColor} transparent opacity={0.5} />
      </mesh>
      <mesh ref={pathBRef} position={[0, 0.05, 0]} renderOrder={2} visible={false}>
        <cylinderGeometry args={[0.024, 0.024, 1, 8]} />
        <meshBasicMaterial color={pathColor} transparent opacity={0.38} />
      </mesh>

      <group ref={waypointRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
          <ringGeometry args={[0.2, 0.28, 28]} />
          <meshBasicMaterial color={pathColor} transparent opacity={0.54} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <group ref={markerRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
          <ringGeometry args={[0.38, 0.54, 36]} />
          <meshBasicMaterial color={markerColor} transparent opacity={0.72} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <circleGeometry args={[0.13, 24]} />
          <meshBasicMaterial color="#fffaf1" transparent opacity={0.88} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.28, 0]} rotation={[Math.PI, 0, 0]} castShadow>
          <coneGeometry args={[0.16, 0.32, 18]} />
          <meshStandardMaterial color={markerColor} roughness={0.55} emissive={markerColor} emissiveIntensity={0.12} />
        </mesh>
      </group>
    </group>
  );
}

function AvatarInspectionCamera() {
  const { camera } = useThree();

  React.useEffect(() => {
    camera.position.set(3.4, 2.65, 4.6);
    camera.lookAt(0, 1.12, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function AvatarInspectionPreview({
  presence,
  quality,
  relationshipLabel,
  rangeLabel,
}: {
  presence: WorldPresence;
  quality: 'low' | 'medium' | 'high';
  relationshipLabel?: string;
  rangeLabel: string;
}) {
  const stageRef = React.useRef<THREE.Group>(null);
  const previewPresence = React.useMemo<WorldPresence>(() => ({
    ...presence,
    position: ZERO_VECTOR,
    moving: false,
    animation: presence.emote === 'dance' ? 'idle' : presence.animation,
  }), [presence]);

  useGameLoop((_, __, elapsed) => {
    if (!stageRef.current) return;
    stageRef.current.rotation.y = Math.sin(elapsed * 0.58) * 0.22 + Math.PI / 10;
  });

  return (
    <div className="mb-3 overflow-hidden rounded-md border border-amber-100 bg-[#f7e7cc] shadow-inner">
      <div className="relative h-44">
        <GameEngine3D
          quality={quality}
          dpr={quality === 'high' ? 1.35 : 1}
          camera={{ position: [3.4, 2.65, 4.6], fov: 34 }}
          alpha={false}
          shadows={quality !== 'low'}
        >
          <color attach="background" args={['#f7e7cc']} />
          <AvatarInspectionCamera />
          <ambientLight intensity={0.92} />
          <directionalLight position={[3, 4, 2]} intensity={1.2} castShadow={quality !== 'low'} />
          <hemisphereLight args={['#fff7ed', '#b7d7bb', 0.7]} />
          <group ref={stageRef} position={[0, -0.06, 0]} scale={0.92}>
            <AvatarCharacter presence={previewPresence} selected position={ZERO_VECTOR} />
          </group>
          <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[1.28, 48]} />
            <meshStandardMaterial color="#e8c690" roughness={0.86} />
          </mesh>
          <ContactShadows scale={3.4} blur={1.6} far={3} opacity={0.26} resolution={quality === 'high' ? 512 : 256} />
        </GameEngine3D>
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          <div className="min-w-0 rounded-full border border-white/80 bg-[#fffaf1]/92 px-3 py-1 shadow-sm backdrop-blur-md">
            <p className="truncate text-[9px] font-black uppercase tracking-wider text-stone-700">
              <i className="fas fa-user-astronaut mr-1.5 text-pink-500"></i>
              {presence.title || 'Explorer'}
            </p>
          </div>
          <div className="flex min-w-0 flex-col items-end gap-1">
            {relationshipLabel && (
              <span className="max-w-[130px] truncate rounded-full bg-sky-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-sky-700">
                {relationshipLabel}
              </span>
            )}
            <span className="max-w-[130px] truncate rounded-full bg-emerald-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-700">
              {rangeLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocalPlayerController({
  movement,
  selfPresence,
  sceneCue,
  collisionBodies,
  onSample,
  cameraTargetRef,
  moveTargetRef,
  initialPosition,
  spawnRevision,
}: {
  movement: MovementInput;
  selfPresence: WorldPresence;
  sceneCue?: AvatarSceneCue;
  collisionBodies: WorldCollisionBody[];
  onSample: (sample: LocalPresenceSample) => void;
  cameraTargetRef: React.MutableRefObject<THREE.Vector3>;
  moveTargetRef: React.MutableRefObject<THREE.Vector3>;
  initialPosition: WorldPresenceVector;
  spawnRevision: number;
}) {
  const playerRef = React.useRef<THREE.Group>(null);
  const positionRef = React.useRef(new THREE.Vector3(initialPosition.x, initialPosition.y, initialPosition.z));
  const velocityRef = React.useRef(new THREE.Vector3());
  const waypointRef = React.useRef(new THREE.Vector3());
  const targetMemoryRef = React.useRef(new THREE.Vector3(initialPosition.x, initialPosition.y, initialPosition.z));
  const hasWaypointRef = React.useRef(false);
  const sampleElapsedRef = React.useRef(0);
  const movingRef = React.useRef(false);
  const footstepColor = getStatusMeta(selfPresence.status).color || '#ec4899';
  const {
    traces: footstepTraces,
    addTrace: addFootstepTrace,
    clearTraces: clearFootstepTraces,
  } = useAvatarFootstepTrail(footstepColor);

  React.useEffect(() => {
    positionRef.current.set(initialPosition.x, initialPosition.y, initialPosition.z);
    velocityRef.current.set(0, 0, 0);
    waypointRef.current.copy(positionRef.current);
    targetMemoryRef.current.copy(positionRef.current);
    hasWaypointRef.current = false;
    clearFootstepTraces();
    if (playerRef.current) {
      playerRef.current.position.copy(positionRef.current);
      playerRef.current.rotation.y = 0;
    }
    cameraTargetRef.current.copy(positionRef.current);
    moveTargetRef.current.copy(positionRef.current);
    onSample(createPresenceSample(vectorToObject(positionRef.current), false));
  }, [cameraTargetRef, clearFootstepTraces, initialPosition.x, initialPosition.y, initialPosition.z, moveTargetRef, onSample, spawnRevision]);

  useGameLoop((_, delta, elapsed) => {
    const input = new THREE.Vector3(
      (movement.right ? 1 : 0) - (movement.left ? 1 : 0),
      0,
      (movement.back ? 1 : 0) - (movement.forward ? 1 : 0)
    );

    if (input.lengthSq() > 0) {
      input.normalize().multiplyScalar(5.2);
      moveTargetRef.current.copy(positionRef.current);
      hasWaypointRef.current = false;
      targetMemoryRef.current.copy(moveTargetRef.current);
    } else {
      resolvePositionAgainstCollisionBodies(moveTargetRef.current, collisionBodies);
    }

    if (targetMemoryRef.current.distanceTo(moveTargetRef.current) > NAVIGATION_TARGET_CHANGE_DISTANCE) {
      hasWaypointRef.current = false;
      targetMemoryRef.current.copy(moveTargetRef.current);
    }

    if (input.lengthSq() === 0) {
      if (hasWaypointRef.current && positionRef.current.distanceTo(waypointRef.current) <= NAVIGATION_WAYPOINT_REACHED_DISTANCE) {
        hasWaypointRef.current = false;
      }

      if (!hasWaypointRef.current) {
        const waypoint = getNavigationWaypoint(positionRef.current, moveTargetRef.current, collisionBodies);
        if (waypoint) {
          waypointRef.current.copy(waypoint);
          hasWaypointRef.current = true;
        }
      }

      const steeringTarget = hasWaypointRef.current ? waypointRef.current : moveTargetRef.current;
      const toTarget = steeringTarget.clone().sub(positionRef.current);
      if (toTarget.length() > 0.18) {
        input.copy(toTarget.normalize().multiplyScalar(4.2));
      }
    }

    velocityRef.current.lerp(input, 1 - Math.exp(-delta * 8));
    positionRef.current.addScaledVector(velocityRef.current, delta);
    positionRef.current.x = THREE.MathUtils.clamp(positionRef.current.x, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2);
    positionRef.current.z = THREE.MathUtils.clamp(positionRef.current.z, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2);
    resolvePositionAgainstCollisionBodies(positionRef.current, collisionBodies);
    cameraTargetRef.current.copy(positionRef.current);

    let heading = playerRef.current?.rotation.y || 0;
    if (playerRef.current) {
      playerRef.current.position.copy(positionRef.current);
      if (velocityRef.current.lengthSq() > 0.05) {
        heading = Math.atan2(velocityRef.current.x, velocityRef.current.z);
        playerRef.current.rotation.y = heading;
      }
    }

    const moving = velocityRef.current.lengthSq() > 0.07;
    if (moving) {
      addFootstepTrace(positionRef.current, heading, elapsed);
    }
    if (moving !== movingRef.current || elapsed - sampleElapsedRef.current > 0.2) {
      movingRef.current = moving;
      sampleElapsedRef.current = elapsed;
      onSample(createPresenceSample(vectorToObject(positionRef.current), moving, vectorToObject(velocityRef.current), heading));
    }
  });

  return (
    <>
      <AvatarFootstepTrail traces={footstepTraces} />
      <group ref={playerRef} position={[initialPosition.x, initialPosition.y, initialPosition.z]}>
        <AvatarCharacter presence={selfPresence} isSelf position={{ x: 0, y: 0, z: 0 }} sceneCue={sceneCue} />
      </group>
    </>
  );
}

function NetworkAvatarCharacter({
  presence,
  selected,
  interactionHint,
  selectedRelationship,
  activeFollowTargetId,
  actionDistance,
  actionReady,
  queuedActionType,
  pendingActionType,
  activityEntries,
  onOpenActivityFeed,
  isActivityFeedLoading,
  isActivityFeedLoaded,
  profileSummary,
  profilePresence,
  onOpenProfile,
  isProfileOpen,
  isProfileLoading,
  isActivityOpen,
  isDirectChatOpen,
  directChatMessages,
  directChatDraft,
  onDirectChatDraftChange,
  onDirectChatSubmit,
  onDirectChatClose,
  isDirectChatSending,
  requests,
  selfUserId,
  pendingRequestId,
  onRespondRequest,
  onOpenRequestContext,
  onOpenRequestChat,
  onOpenCharacterSheet,
  voiceRoom,
  voiceMediaLabel,
  voiceInputPercent,
  isVoiceMuted,
  isVoiceUpdating,
  onToggleVoiceMute,
  onLeaveVoiceRoom,
  sceneCue,
  onSelect,
  onRunAction,
}: {
  presence: WorldPresence;
  selected?: boolean;
  interactionHint?: boolean;
  selectedRelationship?: ReturnType<typeof getRelationshipStatus> | null;
  activeFollowTargetId?: string | null;
  actionDistance?: number | null;
  actionReady?: boolean;
  queuedActionType?: WorldActionType | null;
  pendingActionType?: WorldActionType | null;
  activityEntries?: SelectedActivityEntry[];
  onOpenActivityFeed?: (presence: WorldPresence) => void;
  isActivityFeedLoading?: boolean;
  isActivityFeedLoaded?: boolean;
  profileSummary?: WorldActivityFeed['profile'];
  profilePresence?: WorldActivityFeed['presence'];
  onOpenProfile?: (presence: WorldPresence) => void;
  isProfileOpen?: boolean;
  isProfileLoading?: boolean;
  isActivityOpen?: boolean;
  isDirectChatOpen?: boolean;
  directChatMessages?: WorldChatMessage[];
  directChatDraft?: string;
  onDirectChatDraftChange?: (value: string) => void;
  onDirectChatSubmit?: (event?: React.FormEvent) => void;
  onDirectChatClose?: () => void;
  isDirectChatSending?: boolean;
  requests?: WorldSocialAction[];
  selfUserId?: string;
  pendingRequestId?: string | null;
  onRespondRequest?: (request: WorldSocialAction, response: WorldRequestResponse) => void;
  onOpenRequestContext?: (request: WorldSocialAction) => void;
  onOpenRequestChat?: (request: WorldSocialAction) => void;
  onOpenCharacterSheet?: (presence: WorldPresence) => void;
  voiceRoom?: WorldVoiceRoom | null;
  voiceMediaLabel?: string;
  voiceInputPercent?: number;
  isVoiceMuted?: boolean;
  isVoiceUpdating?: boolean;
  onToggleVoiceMute?: () => void;
  onLeaveVoiceRoom?: (roomId?: string) => void;
  sceneCue?: AvatarSceneCue;
  onSelect: (presence: WorldPresence) => void;
  onRunAction: (action: WorldActionDescriptor, target: WorldPresence) => void;
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  const positionRef = React.useRef(new THREE.Vector3(presence.position.x, presence.position.y, presence.position.z));
  const targetRef = React.useRef(new THREE.Vector3(presence.position.x, presence.position.y, presence.position.z));
  const predictedTargetRef = React.useRef(new THREE.Vector3(presence.position.x, presence.position.y, presence.position.z));
  const velocityRef = React.useRef(new THREE.Vector3(presence.velocity?.x || 0, presence.velocity?.y || 0, presence.velocity?.z || 0));
  const headingRef = React.useRef(presence.heading || 0);
  const lastNetworkUpdateAtRef = React.useRef(Date.now());
  const movingRef = React.useRef(false);
  const [isNetworkMoving, setIsNetworkMoving] = React.useState(false);
  const footstepColor = getStatusMeta(presence.status).color || '#34d399';
  const {
    traces: footstepTraces,
    addTrace: addFootstepTrace,
    clearTraces: clearFootstepTraces,
  } = useAvatarFootstepTrail(footstepColor);

  React.useEffect(() => {
    targetRef.current.set(presence.position.x, presence.position.y, presence.position.z);
    velocityRef.current.set(presence.velocity?.x || 0, presence.velocity?.y || 0, presence.velocity?.z || 0);
    lastNetworkUpdateAtRef.current = Date.now();
    if (typeof presence.heading === 'number' && Number.isFinite(presence.heading)) {
      headingRef.current = presence.heading;
    }
  }, [presence.heading, presence.position.x, presence.position.y, presence.position.z, presence.velocity?.x, presence.velocity?.y, presence.velocity?.z]);

  useGameLoop((_, delta, elapsed) => {
    const velocitySpeed = velocityRef.current.length();
    const velocityMoving = velocitySpeed > REMOTE_AVATAR_VELOCITY_EPSILON;
    const networkMoving = velocityMoving || presence.moving === true;
    predictedTargetRef.current.copy(targetRef.current);

    if (velocityMoving) {
      const updateAgeSeconds = THREE.MathUtils.clamp(
        (Date.now() - lastNetworkUpdateAtRef.current) / 1000,
        0,
        REMOTE_AVATAR_MAX_PREDICTION_SECONDS
      );
      const predictionSeconds = THREE.MathUtils.clamp(
        updateAgeSeconds + REMOTE_AVATAR_PREDICTION_LEAD_SECONDS,
        0,
        REMOTE_AVATAR_MAX_PREDICTION_SECONDS
      );
      const predictedDistance = Math.min(
        REMOTE_AVATAR_MAX_PREDICTION_DISTANCE,
        velocitySpeed * predictionSeconds
      );
      predictedTargetRef.current.addScaledVector(velocityRef.current, predictedDistance / velocitySpeed);
      predictedTargetRef.current.x = THREE.MathUtils.clamp(predictedTargetRef.current.x, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2);
      predictedTargetRef.current.z = THREE.MathUtils.clamp(predictedTargetRef.current.z, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2);
    }

    const authoritativeDistance = positionRef.current.distanceTo(targetRef.current);
    const distance = positionRef.current.distanceTo(predictedTargetRef.current);
    const previousPosition = positionRef.current.clone();
    let snapped = false;

    if (authoritativeDistance > REMOTE_AVATAR_SNAP_DISTANCE) {
      positionRef.current.copy(targetRef.current);
      clearFootstepTraces();
      snapped = true;
    } else if (distance > 0.001) {
      positionRef.current.lerp(predictedTargetRef.current, 1 - Math.exp(-delta * REMOTE_AVATAR_LERP_SPEED));
    }

    const movementDelta = positionRef.current.clone().sub(previousPosition);
    const moving = distance > REMOTE_AVATAR_MOVING_EPSILON || networkMoving;
    const heading = movementDelta.lengthSq() > 0.0004
      ? Math.atan2(movementDelta.x, movementDelta.z)
      : velocityMoving
        ? Math.atan2(velocityRef.current.x, velocityRef.current.z)
        : headingRef.current;

    if (groupRef.current) {
      groupRef.current.position.copy(positionRef.current);
      groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, heading, 1 - Math.exp(-delta * 10));
    }

    if (moving && !snapped && movementDelta.lengthSq() > 0.002) {
      addFootstepTrace(positionRef.current, heading, elapsed);
    }
    if (moving !== movingRef.current) {
      movingRef.current = moving;
      setIsNetworkMoving(moving);
    }
  });

  const displayPresence = React.useMemo<WorldPresence>(() => (
    isNetworkMoving && presence.animation !== 'walk'
      ? { ...presence, animation: 'walk' }
      : presence
  ), [isNetworkMoving, presence]);

  return (
    <>
      <AvatarFootstepTrail traces={footstepTraces} />
      <group ref={groupRef} position={[presence.position.x, presence.position.y, presence.position.z]}>
        <AvatarCharacter
          presence={displayPresence}
          selected={selected}
          interactionHint={interactionHint}
          selectedRelationship={selectedRelationship}
          activeFollowTargetId={activeFollowTargetId}
          actionDistance={actionDistance}
          actionReady={actionReady}
          queuedActionType={queuedActionType}
          pendingActionType={pendingActionType}
          activityEntries={activityEntries}
          onOpenActivityFeed={onOpenActivityFeed}
          isActivityFeedLoading={isActivityFeedLoading}
          isActivityFeedLoaded={isActivityFeedLoaded}
          profileSummary={profileSummary}
          profilePresence={profilePresence}
          onOpenProfile={onOpenProfile}
          isProfileOpen={isProfileOpen}
          isProfileLoading={isProfileLoading}
          isActivityOpen={isActivityOpen}
          isDirectChatOpen={isDirectChatOpen}
          directChatMessages={directChatMessages}
          directChatDraft={directChatDraft}
          onDirectChatDraftChange={onDirectChatDraftChange}
          onDirectChatSubmit={onDirectChatSubmit}
          onDirectChatClose={onDirectChatClose}
          isDirectChatSending={isDirectChatSending}
          requests={requests}
          selfUserId={selfUserId}
          pendingRequestId={pendingRequestId}
          onRespondRequest={onRespondRequest}
          onOpenRequestContext={onOpenRequestContext}
          onOpenRequestChat={onOpenRequestChat}
          onOpenCharacterSheet={onOpenCharacterSheet}
          voiceRoom={voiceRoom}
          voiceMediaLabel={voiceMediaLabel}
          voiceInputPercent={voiceInputPercent}
          isVoiceMuted={isVoiceMuted}
          isVoiceUpdating={isVoiceUpdating}
          onToggleVoiceMute={onToggleVoiceMute}
          onLeaveVoiceRoom={onLeaveVoiceRoom}
          position={{ x: 0, y: 0, z: 0 }}
          sceneCue={sceneCue}
          onSelect={onSelect}
          onRunAction={onRunAction}
        />
      </group>
    </>
  );
}

function PresenceSocialLink({
  selfPresence,
  presence,
  kind,
  selected,
}: {
  selfPresence: WorldPresence;
  presence: WorldPresence;
  kind: PresenceSocialLinkKind;
  selected?: boolean;
}) {
  const endpointRef = React.useRef<THREE.Group>(null);
  const meta = PRESENCE_SOCIAL_LINK_META[kind];
  const link = React.useMemo(() => {
    const start = new THREE.Vector3(selfPresence.position.x, 0.08, selfPresence.position.z);
    const end = new THREE.Vector3(presence.position.x, 0.08, presence.position.z);
    const distance = start.distanceTo(end);
    if (distance < 0.9 || distance > meta.maxDistance) return null;

    const center = start.clone().add(end).multiplyScalar(0.5);
    const direction = end.clone().sub(start).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    return {
      center: [center.x, center.y, center.z] as [number, number, number],
      endpoint: [end.x, end.y, end.z] as [number, number, number],
      labelPosition: [center.x, 0.42, center.z] as [number, number, number],
      quaternion,
      distance,
    };
  }, [
    meta.maxDistance,
    presence.position.x,
    presence.position.z,
    selfPresence.position.x,
    selfPresence.position.z,
  ]);

  useGameLoop((_, __, elapsed) => {
    if (!endpointRef.current) return;
    const pulse = 1 + Math.sin(elapsed * (kind === 'follow' ? 5.2 : 3.4)) * (kind === 'follow' ? 0.1 : 0.055);
    endpointRef.current.scale.setScalar(pulse);
  });

  if (!link) return null;

  const showLabel = selected || kind === 'follow' || link.distance < 7;

  return (
    <>
      <group position={link.center} quaternion={link.quaternion}>
        <mesh renderOrder={1} scale={[1, link.distance, 1]}>
          <cylinderGeometry args={[kind === 'follow' ? 0.026 : 0.018, kind === 'follow' ? 0.026 : 0.018, 1, 8]} />
          <meshBasicMaterial color={meta.color} transparent opacity={selected ? Math.min(meta.opacity + 0.18, 0.72) : meta.opacity} depthWrite={false} />
        </mesh>
      </group>
      <group ref={endpointRef} position={link.endpoint}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <ringGeometry args={[0.42, 0.52, 32]} />
          <meshBasicMaterial color={meta.color} transparent opacity={selected ? 0.72 : 0.42} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
          <circleGeometry args={[0.12, 24]} />
          <meshBasicMaterial color={meta.softColor} transparent opacity={0.72} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      {showLabel && (
        <Html center distanceFactor={16} position={link.labelPosition} className="pointer-events-none">
          <div className="rounded-full border border-white/70 bg-[#fffaf1]/90 px-2.5 py-1 text-center shadow-lg backdrop-blur-md">
            <p className="truncate text-[8px] font-black uppercase tracking-wider" style={{ color: meta.color }}>
              <i className={`fas ${meta.icon} mr-1`}></i>
              {meta.label}
            </p>
          </div>
        </Html>
      )}
    </>
  );
}

function SocialActionLink({
  link,
  onSelectPresence,
}: {
  link: WorldSocialActionLink;
  onSelectPresence: (presence: WorldPresence) => void;
}) {
  const pulseRef = React.useRef<THREE.Group>(null);
  const actionLine = React.useMemo(() => {
    const start = new THREE.Vector3(link.fromPresence.position.x, 0.12, link.fromPresence.position.z);
    const end = new THREE.Vector3(link.toPresence.position.x, 0.12, link.toPresence.position.z);
    const distance = start.distanceTo(end);
    if (distance < 0.85 || distance > WORLD_BOUNDS * 1.65) return null;

    const center = start.clone().add(end).multiplyScalar(0.5);
    const direction = end.clone().sub(start).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    const labelPosition = center.clone();
    labelPosition.y = 0.68;

    return {
      center: [center.x, center.y, center.z] as [number, number, number],
      labelPosition: [labelPosition.x, labelPosition.y, labelPosition.z] as [number, number, number],
      toPosition: [end.x, 0.08, end.z] as [number, number, number],
      quaternion,
      distance,
    };
  }, [
    link.fromPresence.position.x,
    link.fromPresence.position.z,
    link.toPresence.position.x,
    link.toPresence.position.z,
  ]);

  useGameLoop((_, __, elapsed) => {
    if (!pulseRef.current) return;
    const seed = hashString(link.id) * 0.01;
    pulseRef.current.rotation.y = elapsed * 1.45 + seed;
    pulseRef.current.scale.setScalar(1 + Math.sin(elapsed * 4.6 + seed) * 0.07);
  });

  if (!actionLine) return null;

  const opacity = 0.2 + link.ageRatio * 0.4;

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onSelectPresence(link.focusPresence);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <group position={actionLine.center} quaternion={actionLine.quaternion}>
        <mesh renderOrder={3} scale={[1, actionLine.distance, 1]}>
          <cylinderGeometry args={[0.018, 0.018, 1, 8]} />
          <meshBasicMaterial color={link.color} transparent opacity={opacity} depthWrite={false} />
        </mesh>
      </group>
      <group ref={pulseRef} position={actionLine.toPosition}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <ringGeometry args={[0.36, 0.48, 34]} />
          <meshBasicMaterial color={link.color} transparent opacity={0.36 + link.ageRatio * 0.26} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
          <circleGeometry args={[0.11, 24]} />
          <meshBasicMaterial color={link.softColor} transparent opacity={0.82} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      <Html center distanceFactor={16} position={actionLine.labelPosition} className="pointer-events-none">
        <div className="max-w-[170px] rounded-full border border-white/70 bg-[#fffaf1]/92 px-2.5 py-1 text-center shadow-lg backdrop-blur-md">
          <p className="truncate text-[8px] font-black uppercase tracking-wider" style={{ color: link.color }}>
            <i className={`fas ${link.icon} mr-1`}></i>
            {link.label}
          </p>
          <p className="truncate text-[7px] font-black uppercase tracking-wider text-stone-400">{link.detail}</p>
        </div>
      </Html>
    </group>
  );
}

function ProximityVoiceRange({
  selfPresence,
  state,
}: {
  selfPresence: WorldPresence;
  state: ProximityVoiceRangeState;
}) {
  const rangeRef = React.useRef<THREE.Group>(null);
  const iconRef = React.useRef<THREE.Group>(null);

  useGameLoop((_, __, elapsed) => {
    if (rangeRef.current) {
      const pulse = 1 + Math.sin(elapsed * (state.active ? 2.4 : 1.5)) * (state.active ? 0.026 : 0.014);
      rangeRef.current.scale.setScalar(pulse);
    }
    if (iconRef.current) {
      const signalPulse = state.muted ? 0.02 : Math.min(0.12, state.inputPercent / 420);
      iconRef.current.position.y = 0.82 + Math.sin(elapsed * 2.8) * (0.025 + signalPulse);
      iconRef.current.rotation.y = elapsed * 0.9;
    }
  });

  if (!state.visible) return null;

  const opacity = state.active ? 0.2 : 0.12;
  const innerOpacity = state.active ? 0.09 : 0.05;

  return (
    <group position={[selfPresence.position.x, 0.045, selfPresence.position.z]}>
      <group ref={rangeRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <ringGeometry args={[PROXIMITY_VOICE_RANGE - 0.06, PROXIMITY_VOICE_RANGE + 0.06, 96]} />
          <meshBasicMaterial color={state.color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <circleGeometry args={[PROXIMITY_VOICE_RANGE, 96]} />
          <meshBasicMaterial color={state.color} transparent opacity={innerOpacity} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      <group ref={iconRef} position={[0, 0.82, -0.72]}>
        <mesh castShadow>
          <sphereGeometry args={[0.13, 18, 18]} />
          <meshStandardMaterial color={state.color} emissive={state.color} emissiveIntensity={state.active && !state.muted ? 0.28 : 0.12} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.016, 8, 24, Math.PI]} />
          <meshStandardMaterial color={state.color} roughness={0.54} />
        </mesh>
      </group>
      <Html center distanceFactor={15} position={[0, 1.22, -1.05]} className="pointer-events-none">
        <div className="max-w-[180px] rounded-full border border-white/70 bg-[#fffaf1]/92 px-3 py-1 text-center shadow-lg backdrop-blur-md">
          <p className="truncate text-[8px] font-black uppercase tracking-wider" style={{ color: state.color }}>
            <i className={`fas ${state.muted ? 'fa-microphone-slash' : 'fa-microphone'} mr-1.5`}></i>
            {state.label}
          </p>
          <p className="truncate text-[7px] font-black uppercase tracking-wider text-stone-400">{state.detail}</p>
        </div>
      </Html>
    </group>
  );
}

function WorldInterestBoundary({
  interest,
  stats,
  fresh,
  quality,
}: {
  interest: WorldInterestWindow;
  stats?: WorldSnapshot['interest'] | null;
  fresh: boolean;
  quality: 'low' | 'medium' | 'high';
}) {
  const ringRef = React.useRef<THREE.Group>(null);
  const markerRef = React.useRef<THREE.Group>(null);
  const radius = THREE.MathUtils.clamp(interest.radius || WORLD_STREAM_INTEREST_RADIUS, 6, WORLD_BOUNDS * 1.05);
  const center: [number, number, number] = [
    THREE.MathUtils.clamp(interest.x, -WORLD_BOUNDS + 1, WORLD_BOUNDS - 1),
    0,
    THREE.MathUtils.clamp(interest.z, -WORLD_BOUNDS + 1, WORLD_BOUNDS - 1),
  ];
  const visibleOnline = stats?.visibleOnline;
  const totalOnline = stats?.totalOnline;
  const hasPopulationSplit = typeof visibleOnline === 'number' && typeof totalOnline === 'number' && totalOnline > visibleOnline;
  const color = fresh ? '#10b981' : '#f59e0b';
  const softColor = fresh ? '#bbf7d0' : '#fde68a';
  const labelPosition: [number, number, number] = [
    THREE.MathUtils.clamp(center[0] + radius * 0.42, -WORLD_BOUNDS + 2.2, WORLD_BOUNDS - 2.2),
    0.72,
    THREE.MathUtils.clamp(center[2] - radius * 0.36, -WORLD_BOUNDS + 2.2, WORLD_BOUNDS - 2.2),
  ];

  useGameLoop((_, delta, elapsed) => {
    if (ringRef.current) {
      const pulse = 1 + Math.sin(elapsed * (fresh ? 1.3 : 0.82)) * (fresh ? 0.008 : 0.015);
      ringRef.current.scale.set(pulse, 1, pulse);
      ringRef.current.rotation.y += delta * (fresh ? 0.04 : 0.018);
    }

    if (markerRef.current) {
      markerRef.current.rotation.y = elapsed * (fresh ? 0.9 : 0.42);
      markerRef.current.position.y = 0.11 + Math.sin(elapsed * 2.1) * 0.02;
    }
  });

  return (
    <group position={center}>
      <group ref={ringRef}>
        <mesh position={[0, 0.024, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <ringGeometry args={[radius - 0.07, radius + 0.07, 128]} />
          <meshBasicMaterial color={color} transparent opacity={fresh ? 0.2 : 0.28} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
          <circleGeometry args={[radius, 128]} />
          <meshBasicMaterial color={softColor} transparent opacity={fresh ? 0.035 : 0.055} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} renderOrder={2}>
          <ringGeometry args={[radius * 0.62, radius * 0.62 + 0.035, 96]} />
          <meshBasicMaterial color={color} transparent opacity={fresh ? 0.075 : 0.13} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <group ref={markerRef} position={[0, 0.1, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
          <ringGeometry args={[0.4, 0.56, 38]} />
          <meshBasicMaterial color={color} transparent opacity={fresh ? 0.42 : 0.5} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <circleGeometry args={[0.13, 24]} />
          <meshBasicMaterial color="#fffaf1" transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {quality === 'high' && fresh && (
        <Sparkles
          count={24}
          scale={[radius * 1.45, 0.28, radius * 1.45]}
          size={1.25}
          speed={0.12}
          opacity={0.16}
          color={color}
          position={[0, 0.16, 0]}
        />
      )}

      <Html center distanceFactor={18} position={labelPosition} className="pointer-events-none">
        <div className="max-w-[178px] rounded-full border border-white/70 bg-[#fffaf1]/90 px-2.5 py-1 text-center shadow-lg backdrop-blur-md">
          <p className="truncate text-[8px] font-black uppercase tracking-wider" style={{ color }}>
            <i className={`fas ${fresh ? 'fa-satellite-dish' : 'fa-rotate'} mr-1`}></i>
            {fresh ? 'Live Sync' : 'Fallback Sync'}
          </p>
          <p className="truncate text-[7px] font-black uppercase tracking-wider text-stone-400">
            {hasPopulationSplit
              ? `${visibleOnline}/${totalOnline} visible`
              : `${Math.round(radius)}m activity radius`}
          </p>
        </div>
      </Html>
    </group>
  );
}

function AvatarInteractionGuide({
  selfPresence,
  target,
  queuedAction,
  activeFollowTargetId,
}: {
  selfPresence: WorldPresence;
  target: WorldPresence | null;
  queuedAction?: QueuedAvatarAction | null;
  activeFollowTargetId: string | null;
}) {
  const markerRef = React.useRef<THREE.Group>(null);
  const rangeRef = React.useRef<THREE.Group>(null);

  const guide = React.useMemo(() => {
    if (!target) return null;

    const start = new THREE.Vector3(selfPresence.position.x, 0.08, selfPresence.position.z);
    const end = new THREE.Vector3(target.position.x, 0.08, target.position.z);
    const distance = start.distanceTo(end);
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    const direction = end.clone().sub(start);
    const hasPath = distance > 0.9;
    const quaternion = hasPath
      ? new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize())
      : new THREE.Quaternion();
    const queuedDescriptor = queuedAction?.targetUserId === target.userId
      ? getWorldActionDescriptor(queuedAction.type)
      : null;
    const ready = distance <= AVATAR_INTERACTION_RANGE;
    const following = activeFollowTargetId === target.userId;
    const color = following ? '#38bdf8' : queuedDescriptor ? '#f59e0b' : ready ? '#10b981' : '#ec4899';
    const label = following
      ? 'Following'
      : queuedDescriptor
        ? `Approaching ${queuedDescriptor.label}`
        : ready
          ? 'Ready nearby'
          : 'Walk closer';

    return {
      end,
      midpoint,
      quaternion,
      hasPath,
      distance,
      ready,
      label,
      icon: following ? 'fa-route' : queuedDescriptor?.icon || (ready ? 'fa-circle-check' : 'fa-location-dot'),
      color,
      lineOpacity: queuedDescriptor || following ? 0.62 : 0.34,
    };
  }, [
    activeFollowTargetId,
    queuedAction,
    selfPresence.position.x,
    selfPresence.position.z,
    target,
  ]);

  useGameLoop((_, __, elapsed) => {
    if (markerRef.current) {
      markerRef.current.rotation.y = elapsed * 1.1;
      markerRef.current.scale.setScalar(1 + Math.sin(elapsed * 4.8) * 0.045);
    }
    if (rangeRef.current) {
      rangeRef.current.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.018);
    }
  });

  if (!guide) return null;

  return (
    <group>
      {guide.hasPath && (
        <group position={[guide.midpoint.x, 0.07, guide.midpoint.z]} quaternion={guide.quaternion}>
          <mesh renderOrder={2} scale={[1, guide.distance, 1]}>
            <cylinderGeometry args={[0.022, 0.022, 1, 8]} />
            <meshBasicMaterial color={guide.color} transparent opacity={guide.lineOpacity} depthWrite={false} />
          </mesh>
        </group>
      )}

      <group ref={rangeRef} position={[guide.end.x, 0.035, guide.end.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <ringGeometry args={[AVATAR_INTERACTION_RANGE - 0.04, AVATAR_INTERACTION_RANGE + 0.04, 80]} />
          <meshBasicMaterial color={guide.color} transparent opacity={guide.ready ? 0.13 : 0.18} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>

      <group ref={markerRef} position={[guide.end.x, 0.08, guide.end.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
          <ringGeometry args={[0.72, 0.88, 40]} />
          <meshBasicMaterial color={guide.color} transparent opacity={0.66} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <circleGeometry args={[0.2, 28]} />
          <meshBasicMaterial color="#fffaf1" transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>

      <Html center distanceFactor={14} position={[guide.end.x, 0.72, guide.end.z]} className="pointer-events-none">
        <div className="max-w-[178px] rounded-full border border-white/80 bg-[#fffaf1]/92 px-3 py-1 text-center shadow-lg backdrop-blur-md">
          <p className="truncate text-[8px] font-black uppercase tracking-wider" style={{ color: guide.color }}>
            <i className={`fas ${guide.icon} mr-1.5`}></i>
            {guide.label}
          </p>
          <p className="truncate text-[8px] font-bold text-stone-500">{guide.distance.toFixed(1)}m from you</p>
        </div>
      </Html>
    </group>
  );
}

function PresenceIntentTrail({
  presence,
  onSelect,
}: {
  presence: WorldPresence;
  onSelect: (presence: WorldPresence) => void;
}) {
  const markerRef = React.useRef<THREE.Group>(null);
  const intent = presence.intent;
  const target = intent?.targetPosition;
  const meta = getPresenceIntentMeta(intent);

  const trail = React.useMemo(() => {
    if (!intent || !target || !meta || intent.kind === 'explore') return null;

    const start = new THREE.Vector3(presence.position.x, 0.1, presence.position.z);
    const end = new THREE.Vector3(target.x, 0.1, target.z);
    const distance = start.distanceTo(end);
    if (distance < 1.05 || distance > WORLD_BOUNDS * 1.8) return null;

    const center = start.clone().add(end).multiplyScalar(0.5);
    const direction = end.clone().sub(start).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    return {
      center: [center.x, center.y, center.z] as [number, number, number],
      endpoint: [end.x, end.y, end.z] as [number, number, number],
      labelPosition: [end.x, 0.62, end.z] as [number, number, number],
      quaternion,
      distance,
    };
  }, [
    intent,
    meta,
    presence.position.x,
    presence.position.z,
    target,
  ]);

  useGameLoop((_, __, elapsed) => {
    if (!markerRef.current) return;
    markerRef.current.rotation.y = elapsed * 1.2;
    markerRef.current.scale.setScalar(1 + Math.sin(elapsed * 4.8) * 0.055);
  });

  if (!trail || !intent || !meta) return null;

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onSelect(presence);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <group position={trail.center} quaternion={trail.quaternion}>
        <mesh renderOrder={1} scale={[1, trail.distance, 1]}>
          <cylinderGeometry args={[0.017, 0.017, 1, 8]} />
          <meshBasicMaterial color={meta.color} transparent opacity={0.34} depthWrite={false} />
        </mesh>
      </group>
      <group ref={markerRef} position={trail.endpoint}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <ringGeometry args={[0.34, 0.48, 32]} />
          <meshBasicMaterial color={meta.color} transparent opacity={0.58} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
          <circleGeometry args={[0.12, 24]} />
          <meshBasicMaterial color="#fffaf1" transparent opacity={0.84} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.26, 0]} rotation={[Math.PI, 0, 0]} castShadow>
          <coneGeometry args={[0.13, 0.28, 18]} />
          <meshStandardMaterial color={meta.color} roughness={0.58} emissive={meta.color} emissiveIntensity={0.1} />
        </mesh>
      </group>
      <Html center distanceFactor={16} position={trail.labelPosition} className="pointer-events-none">
        <div className="max-w-[150px] rounded-full border border-white/70 bg-[#fffaf1]/90 px-2.5 py-1 text-center shadow-lg backdrop-blur-md">
          <p className="truncate text-[8px] font-black uppercase tracking-wider" style={{ color: meta.color }}>
            <i className={`fas ${meta.icon} mr-1`}></i>
            {intent.label}
          </p>
        </div>
      </Html>
    </group>
  );
}

function LocalPresenceIntentGuide({
  selfPresence,
  intent,
}: {
  selfPresence: WorldPresence;
  intent?: WorldPresenceIntent;
}) {
  const markerRef = React.useRef<THREE.Group>(null);
  const meta = getPresenceIntentMeta(intent);
  const target = intent?.targetPosition;

  const guide = React.useMemo(() => {
    if (!intent || !target || !meta || intent.kind === 'explore') return null;

    const start = new THREE.Vector3(selfPresence.position.x, 0.12, selfPresence.position.z);
    const end = new THREE.Vector3(target.x, 0.12, target.z);
    const distance = start.distanceTo(end);
    if (distance < 0.95 || distance > WORLD_BOUNDS * 1.8) return null;

    const center = start.clone().add(end).multiplyScalar(0.5);
    const direction = end.clone().sub(start).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    const labelPosition = end.clone().lerp(start, 0.14);
    labelPosition.y = 0.76;

    return {
      center: [center.x, center.y, center.z] as [number, number, number],
      endpoint: [end.x, end.y, end.z] as [number, number, number],
      labelPosition: [labelPosition.x, labelPosition.y, labelPosition.z] as [number, number, number],
      quaternion,
      distance,
    };
  }, [intent, meta, selfPresence.position.x, selfPresence.position.z, target]);

  useGameLoop((_, __, elapsed) => {
    if (!markerRef.current) return;
    markerRef.current.rotation.y = elapsed * 1.55;
    markerRef.current.scale.setScalar(1 + Math.sin(elapsed * 5.2) * 0.06);
  });

  if (!guide || !intent || !meta) return null;

  return (
    <group>
      <group position={guide.center} quaternion={guide.quaternion}>
        <mesh renderOrder={3} scale={[1, guide.distance, 1]}>
          <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
          <meshBasicMaterial color={meta.color} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      </group>
      <group ref={markerRef} position={guide.endpoint}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <ringGeometry args={[0.44, 0.62, 44]} />
          <meshBasicMaterial color={meta.color} transparent opacity={0.68} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
          <ringGeometry args={[0.72, 0.76, 56]} />
          <meshBasicMaterial color="#fffaf1" transparent opacity={0.58} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
          <circleGeometry args={[0.16, 28]} />
          <meshBasicMaterial color="#fffaf1" transparent opacity={0.92} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.33, 0]} rotation={[Math.PI, 0, 0]} castShadow>
          <coneGeometry args={[0.16, 0.34, 20]} />
          <meshStandardMaterial color={meta.color} roughness={0.5} emissive={meta.color} emissiveIntensity={0.14} />
        </mesh>
      </group>
      <Html center distanceFactor={15} position={guide.labelPosition} className="pointer-events-none">
        <div className="max-w-[170px] rounded-full border border-white/80 bg-[#fffaf1]/94 px-3 py-1 text-center shadow-lg backdrop-blur-md">
          <p className="truncate text-[8px] font-black uppercase tracking-wider" style={{ color: meta.color }}>
            <i className={`fas ${meta.icon} mr-1.5`}></i>
            {intent.label}
          </p>
          {intent.detail && (
            <p className="truncate text-[8px] font-bold text-stone-500">{intent.detail}</p>
          )}
        </div>
      </Html>
    </group>
  );
}

function LivePromptGuide({
  selfPresence,
  prompt,
  onActivate,
}: {
  selfPresence: WorldPresence;
  prompt: WorldLivePrompt | null;
  onActivate: () => void;
}) {
  const markerRef = React.useRef<THREE.Group>(null);
  const waypointRef = React.useRef<THREE.Group>(null);

  const guide = React.useMemo(() => {
    if (!prompt) return null;
    const targetSource = prompt.marker?.position || (
      prompt.presence ? [prompt.presence.position.x, prompt.presence.position.y, prompt.presence.position.z] as [number, number, number] : null
    );
    if (!targetSource) return null;

    const start = new THREE.Vector3(selfPresence.position.x, 0.13, selfPresence.position.z);
    const end = new THREE.Vector3(targetSource[0], 0.13, targetSource[2]);
    const distance = start.distanceTo(end);
    if (distance < 1.1 || distance > WORLD_BOUNDS * 1.8) return null;

    const center = start.clone().add(end).multiplyScalar(0.5);
    const direction = end.clone().sub(start).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    const labelPosition = end.clone().lerp(start, 0.18);
    labelPosition.y = 0.72;

    const waypoints = [0.28, 0.5, 0.72].map((step, index) => {
      const point = start.clone().lerp(end, step);
      point.y = 0.16;
      return {
        key: `${prompt.key}:waypoint:${index}`,
        position: [point.x, point.y, point.z] as [number, number, number],
        scale: 0.08 + index * 0.012,
      };
    });

    return {
      center: [center.x, center.y, center.z] as [number, number, number],
      endpoint: [end.x, end.y, end.z] as [number, number, number],
      labelPosition: [labelPosition.x, labelPosition.y, labelPosition.z] as [number, number, number],
      quaternion,
      distance,
      waypoints,
    };
  }, [prompt, selfPresence.position.x, selfPresence.position.z]);

  useGameLoop((_, __, elapsed) => {
    if (markerRef.current) {
      markerRef.current.rotation.y = elapsed * 1.35;
      markerRef.current.scale.setScalar(1 + Math.sin(elapsed * 4.4) * 0.05);
    }
    if (waypointRef.current) {
      waypointRef.current.children.forEach((child, index) => {
        child.scale.setScalar(1 + Math.sin(elapsed * 3.8 + index * 0.7) * 0.14);
      });
    }
  });

  if (!guide || !prompt) return null;

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <group position={guide.center} quaternion={guide.quaternion}>
        <mesh renderOrder={2} scale={[1, guide.distance, 1]}>
          <cylinderGeometry args={[0.026, 0.026, 1, 10]} />
          <meshBasicMaterial color={prompt.color} transparent opacity={0.44} depthWrite={false} />
        </mesh>
      </group>

      <group ref={waypointRef}>
        {guide.waypoints.map((waypoint) => (
          <mesh key={waypoint.key} position={waypoint.position} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <ringGeometry args={[waypoint.scale, waypoint.scale + 0.04, 22]} />
            <meshBasicMaterial color={prompt.color} transparent opacity={0.46} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        ))}
      </group>

      <group ref={markerRef} position={guide.endpoint}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <ringGeometry args={[0.5, 0.68, 40]} />
          <meshBasicMaterial color={prompt.color} transparent opacity={0.52} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
          <circleGeometry args={[0.18, 28]} />
          <meshBasicMaterial color="#fffaf1" transparent opacity={0.88} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.36, 0]} castShadow>
          <sphereGeometry args={[0.14, 18, 18]} />
          <meshStandardMaterial color={prompt.color} roughness={0.52} emissive={prompt.color} emissiveIntensity={0.18} />
        </mesh>
        <pointLight position={[0, 0.7, 0]} intensity={0.22} distance={3.2} color={prompt.color} />
      </group>

      <Html center distanceFactor={15} position={guide.labelPosition} className="pointer-events-none">
        <div className="max-w-[170px] rounded-full border border-white/75 bg-[#fffaf1]/92 px-2.5 py-1 text-center shadow-lg backdrop-blur-md">
          <p className="truncate text-[8px] font-black uppercase tracking-wider" style={{ color: prompt.color }}>
            <i className={`fas ${prompt.icon} mr-1`}></i>
            {prompt.primaryLabel}
          </p>
          <p className="truncate text-[8px] font-bold text-stone-500">{prompt.title}</p>
        </div>
      </Html>
    </group>
  );
}

function CommonsScene({
  movement,
  selfPresence,
  sceneCues,
  activeDistrict,
  selectedDistrict,
  selectedPortal,
  selectedLandObject,
  activityBeacons,
  voiceMarkers,
  liveActivityMarkers,
  livePrompt,
  currentWorldIntent,
  socialActionLinks,
  proximityVoiceRange,
  worldInterest,
  worldInterestStats,
  isWorldStreamFresh,
  npcDialogues,
  eventRallyPulse,
  districtPresenceSummary,
  landObjects,
  remotePresences,
  selectedNpc,
  selectedNpcDistance,
  selectedPresence,
  selectedRelationship,
  selectedActivityEntries,
  selectedActivityFeedUserId,
  isSelectedActivityLoading,
  isSelectedActivityOpen,
  selectedProfileSummary,
  selectedProfilePresence,
  isSelectedProfileOpen,
  isSelectedProfileLoading,
  isSelectedDirectChatOpen,
  selectedDirectChatMessages,
  directChatDraft,
  isSendingDirectChat,
  selectedRequests,
  pendingRequestId,
  selectedVoiceRoom,
  voiceMediaLabel,
  voiceInputPercent,
  isVoiceMuted,
  isVoiceUpdating,
  activeFollowTargetId,
  queuedAvatarAction,
  queuedNpcAction,
  pendingActionType,
  pendingNpcIntent,
  spawnPosition,
  spawnRevision,
  timeline,
  quality,
  worldCycle,
  cameraMode,
  rotation,
  zoom,
  cameraTargetRef,
  moveTargetRef,
  onMoveTarget,
  onSelfSample,
  onSelectDistrict,
  onRunDistrictAction,
  onOpenDistrictDetails,
  onClearDistrictSelection,
  onSelectPortal,
  onOpenPortal,
  onOpenPortalBoard,
  onSelectActivityBeacon,
  onSelectVoiceMarker,
  onSelectLiveActivityMarker,
  onRunLivePromptPrimary,
  onSelectLandObject,
  onSelectPresence,
  onRefreshPresenceActivity,
  onRefreshPresenceProfile,
  onDirectChatDraftChange,
  onDirectChatSubmit,
  onDirectChatClose,
  onRespondRequest,
  onOpenRequestContext,
  onOpenRequestChat,
  onOpenPresenceSheet,
  onToggleVoiceMute,
  onLeaveVoiceRoom,
  onRunPresenceAction,
  onSelectNpc,
  onRunNpcAction,
  onNpcPositionUpdate,
  onFlagClick,
  districtPartyLabel,
  districtChatCount,
  isDistrictPartyUpdating,
  workshopControls,
  marketControls,
  titleControls,
  eventControls,
}: {
  movement: MovementInput;
  selfPresence: WorldPresence;
  sceneCues: Record<string, AvatarSceneCue>;
  activeDistrict: WorldDistrict;
  selectedDistrict: WorldDistrict | null;
  selectedPortal: WorldPortal | null;
  selectedLandObject: PurchasedItem | null;
  activityBeacons: WorldActivityBeacon[];
  voiceMarkers: WorldVoiceMarker[];
  liveActivityMarkers: WorldLiveActivityMarker[];
  livePrompt: WorldLivePrompt | null;
  currentWorldIntent?: WorldPresenceIntent;
  socialActionLinks: WorldSocialActionLink[];
  proximityVoiceRange: ProximityVoiceRangeState;
  worldInterest: WorldInterestWindow;
  worldInterestStats: WorldSnapshot['interest'] | null;
  isWorldStreamFresh: boolean;
  npcDialogues: Record<string, NpcDialoguePulse>;
  eventRallyPulse: WorldEventRallyState;
  districtPresenceSummary: Record<string, DistrictPresenceSummary>;
  landObjects: PurchasedItem[];
  remotePresences: WorldPresence[];
  selectedNpc: WorldNpc | null;
  selectedNpcDistance: number | null;
  selectedPresence: WorldPresence | null;
  selectedRelationship: ReturnType<typeof getRelationshipStatus> | null;
  selectedActivityEntries: SelectedActivityEntry[];
  selectedActivityFeedUserId?: string | null;
  isSelectedActivityLoading: boolean;
  isSelectedActivityOpen: boolean;
  selectedProfileSummary?: WorldActivityFeed['profile'];
  selectedProfilePresence?: WorldActivityFeed['presence'];
  isSelectedProfileOpen: boolean;
  isSelectedProfileLoading: boolean;
  isSelectedDirectChatOpen: boolean;
  selectedDirectChatMessages: WorldChatMessage[];
  directChatDraft: string;
  isSendingDirectChat: boolean;
  selectedRequests: WorldSocialAction[];
  pendingRequestId: string | null;
  selectedVoiceRoom: WorldVoiceRoom | null;
  voiceMediaLabel: string;
  voiceInputPercent: number;
  isVoiceMuted: boolean;
  isVoiceUpdating: boolean;
  activeFollowTargetId: string | null;
  queuedAvatarAction: QueuedAvatarAction | null;
  queuedNpcAction: QueuedNpcAction | null;
  pendingActionType: WorldActionType | null;
  pendingNpcIntent: string | null;
  spawnPosition: WorldPresenceVector;
  spawnRevision: number;
  timeline: Interaction[];
  quality: 'low' | 'medium' | 'high';
  worldCycle: WorldCycle;
  cameraMode: 'isometric' | 'third';
  rotation: number;
  zoom: number;
  cameraTargetRef: React.MutableRefObject<THREE.Vector3>;
  moveTargetRef: React.MutableRefObject<THREE.Vector3>;
  onMoveTarget: (point: THREE.Vector3) => void;
  onSelfSample: (sample: LocalPresenceSample) => void;
  onSelectDistrict: (district: WorldDistrict) => void;
  onRunDistrictAction: (district: WorldDistrict, action: WorldDistrictAction) => void | Promise<void>;
  onOpenDistrictDetails: (district: WorldDistrict) => void;
  onClearDistrictSelection: () => void;
  onSelectPortal: (portal: WorldPortal) => void;
  onOpenPortal: (portal: WorldPortal) => void | Promise<void>;
  onOpenPortalBoard: (portal: WorldPortal) => void;
  onSelectActivityBeacon: (beacon: WorldActivityBeacon) => void;
  onSelectVoiceMarker: (marker: WorldVoiceMarker) => void;
  onSelectLiveActivityMarker: (marker: WorldLiveActivityMarker) => void;
  onRunLivePromptPrimary: () => void;
  onSelectLandObject: (item: PurchasedItem) => void;
  onSelectPresence: (presence: WorldPresence) => void;
  onRefreshPresenceActivity: (presence: WorldPresence) => void;
  onRefreshPresenceProfile: (presence: WorldPresence) => void;
  onDirectChatDraftChange: (value: string) => void;
  onDirectChatSubmit: (event?: React.FormEvent) => void;
  onDirectChatClose: () => void;
  onRespondRequest: (request: WorldSocialAction, response: WorldRequestResponse) => void;
  onOpenRequestContext: (request: WorldSocialAction) => void;
  onOpenRequestChat: (request: WorldSocialAction) => void;
  onOpenPresenceSheet: (presence: WorldPresence) => void;
  onToggleVoiceMute: () => void;
  onLeaveVoiceRoom: (roomId?: string) => void;
  onRunPresenceAction: (action: WorldActionDescriptor, target: WorldPresence) => void;
  onSelectNpc: (npc: WorldNpc) => void;
  onRunNpcAction: (npc: WorldNpc, action: WorldNpc['actions'][number]) => void;
  onNpcPositionUpdate: (npcId: string, position: THREE.Vector3) => void;
  onFlagClick: (item: Interaction) => void;
  districtPartyLabel: string;
  districtChatCount: number;
  isDistrictPartyUpdating: boolean;
  workshopControls?: DistrictWorkshopControls;
  marketControls?: DistrictMarketControls;
  titleControls?: DistrictTitleControls;
  eventControls?: DistrictEventControls;
}) {
  const memoryItems = React.useMemo(() => timeline.slice(0, 8), [timeline]);
  const collisionBodies = React.useMemo(() => [
    ...buildWorldCollisionBodies(landObjects),
    ...buildRemoteAvatarCollisionBodies(remotePresences, selfPresence.position),
  ], [landObjects, remotePresences, selfPresence.position]);
  const trafficRoutes = React.useMemo<WorldTrafficRoute[]>(() => (
    WORLD_DISTRICTS
      .map((district) => {
        const summary = districtPresenceSummary[district.id];
        const active = activeDistrict.id === district.id;
        if (!summary && !active) return null;

        const normalizedSummary: DistrictPresenceSummary = summary || {
          count: 0,
          topActivity: 'Exploring',
          movingCount: 0,
          voiceCount: 0,
          names: [],
        };

        if (!active && normalizedSummary.count === 0) return null;
        return getDistrictTrafficRoute(district, normalizedSummary, active);
      })
      .filter((route): route is WorldTrafficRoute => route !== null)
  ), [activeDistrict.id, districtPresenceSummary]);

  return (
    <GameEngine3D
      quality={quality}
      dpr={quality === 'high' ? 1.5 : 1}
      camera={{ position: [9, 8, 9], fov: 43 }}
      shadows
      alpha={false}
    >
      <LivingWorldAmbience cycle={worldCycle} quality={quality} />
      <Environment preset="forest" background={false} blur={0.7} />
      <WorldAtmosphereEffects cycle={worldCycle} quality={quality} />
      <CameraRig targetRef={cameraTargetRef} cameraMode={cameraMode} rotation={rotation} zoom={zoom} />
      <MoveTargetGuide
        cameraTargetRef={cameraTargetRef}
        moveTargetRef={moveTargetRef}
        activeFollowTargetId={activeFollowTargetId}
        collisionBodies={collisionBodies}
      />
      <LocalPresenceIntentGuide selfPresence={selfPresence} intent={currentWorldIntent} />
      <ProximityVoiceRange selfPresence={selfPresence} state={proximityVoiceRange} />
      <WorldInterestBoundary
        interest={worldInterest}
        stats={worldInterestStats}
        fresh={isWorldStreamFresh}
        quality={quality}
      />

      <SpawnIn delay={0.1}>
        <CommonsGround onMoveTo={onMoveTarget} />
      </SpawnIn>

      {WORLD_DISTRICTS.map(district => (
        <DistrictActivityAura
          key={`${district.id}-activity-aura`}
          district={district}
          summary={districtPresenceSummary[district.id]}
          cycle={worldCycle}
          quality={quality}
        />
      ))}

      {trafficRoutes.map(route => (
        <DistrictTrafficRouteMarker
          key={route.id}
          route={route}
          quality={quality}
          onSelect={onSelectDistrict}
        />
      ))}

      {WORLD_DISTRICTS.map(district => (
        <DistrictMarker
          key={district.id}
          district={district}
          active={district.id === activeDistrict.id}
          selected={selectedDistrict?.id === district.id}
          summary={districtPresenceSummary[district.id]}
          onSelect={onSelectDistrict}
          onRunAction={onRunDistrictAction}
          onOpenDetails={onOpenDistrictDetails}
          onClearSelection={onClearDistrictSelection}
          partyLabel={districtPartyLabel}
          chatCount={districtChatCount}
          isPartyUpdating={isDistrictPartyUpdating}
          workshopControls={workshopControls}
          marketControls={marketControls}
          titleControls={titleControls}
          eventControls={eventControls}
        />
      ))}

      <WorldPopulationBoard
        districts={WORLD_DISTRICTS}
        activeDistrict={activeDistrict}
        districtPresenceSummary={districtPresenceSummary}
        onSelectDistrict={onSelectDistrict}
      />

      {WORLD_PORTALS.map(portal => (
        <WorldPortalMarker
          key={portal.id}
          portal={portal}
          active={selectedPortal?.id === portal.id}
          onSelect={onSelectPortal}
          onOpen={onOpenPortal}
          onOpenBoard={onOpenPortalBoard}
        />
      ))}

      {WORLD_NPCS.map(npc => (
        <NpcCharacter
          key={npc.id}
          npc={npc}
          dialogue={npcDialogues[npc.id] || null}
          selected={selectedNpc?.id === npc.id}
          actionDistance={selectedNpc?.id === npc.id ? selectedNpcDistance : null}
          queuedActionIntent={selectedNpc?.id === npc.id && queuedNpcAction?.npcId === npc.id ? queuedNpcAction.actionIntent : null}
          pendingActionIntent={selectedNpc?.id === npc.id ? pendingNpcIntent : null}
          onSelect={onSelectNpc}
          onRunAction={onRunNpcAction}
          onPositionUpdate={onNpcPositionUpdate}
        />
      ))}

      {activityBeacons.map(beacon => (
        <ActivityBeaconMarker
          key={beacon.id}
          beacon={beacon}
          onSelect={onSelectActivityBeacon}
        />
      ))}

      {voiceMarkers.map(marker => (
        <VoiceMarker
          key={marker.id}
          marker={marker}
          onSelect={onSelectVoiceMarker}
        />
      ))}

      {liveActivityMarkers.map(marker => (
        <LiveActivityMarker
          key={marker.id}
          marker={marker}
          onSelect={onSelectLiveActivityMarker}
        />
      ))}

      <EventRallyPulse
        rally={eventRallyPulse}
        onSelect={() => {
          const eventMarker = liveActivityMarkers.find(marker => marker.kind === 'event');
          if (eventMarker) onSelectLiveActivityMarker(eventMarker);
        }}
      />

      <LivePromptGuide
        selfPresence={selfPresence}
        prompt={livePrompt}
        onActivate={onRunLivePromptPrimary}
      />

      {landObjects.map((item, index) => (
        <SpawnIn key={item.id} delay={0.8 + index * 0.08}>
          <LandObjectMarker
            item={item}
            selected={selectedLandObject?.id === item.id}
            onSelect={onSelectLandObject}
          />
        </SpawnIn>
      ))}

      {memoryItems.map((item, index) => (
        <MemoryMarker key={item.id} item={item} index={index} onFlagClick={onFlagClick} />
      ))}

      {quality !== 'low' && <Sparkles count={20} scale={16} size={2.2} speed={0.25} opacity={0.36} color="#f9a8d4" />}

      {remotePresences.map((presence) => {
        const linkKind = getPresenceSocialLinkKind(selfPresence, presence, activeFollowTargetId);
        if (!linkKind) return null;

        return (
          <PresenceSocialLink
            key={`social-link:${presence.userId}:${linkKind}`}
            selfPresence={selfPresence}
            presence={presence}
            kind={linkKind}
            selected={selectedPresence?.userId === presence.userId}
          />
        );
      })}

      {socialActionLinks.map(link => (
        <SocialActionLink
          key={link.id}
          link={link}
          onSelectPresence={onSelectPresence}
        />
      ))}

      <AvatarInteractionGuide
        selfPresence={selfPresence}
        target={selectedPresence}
        queuedAction={queuedAvatarAction}
        activeFollowTargetId={activeFollowTargetId}
      />

      {remotePresences.map((presence) => (
        <PresenceIntentTrail
          key={`intent-trail:${presence.userId}`}
          presence={presence}
          onSelect={onSelectPresence}
        />
      ))}

      <LocalPlayerController
        movement={movement}
        selfPresence={selfPresence}
        cameraTargetRef={cameraTargetRef}
        moveTargetRef={moveTargetRef}
        initialPosition={spawnPosition}
        spawnRevision={spawnRevision}
        sceneCue={sceneCues[selfPresence.userId]}
        collisionBodies={collisionBodies}
        onSample={onSelfSample}
      />

      {remotePresences.map((presence) => {
        const selectedAvatar = selectedPresence?.userId === presence.userId;
        const avatarDistance = getPresenceDistance(selfPresence.position, presence.position);
        const interactionHint = !selectedAvatar && avatarDistance <= AVATAR_INTERACTION_RANGE;
        const selectedQueuedActionType = selectedAvatar && queuedAvatarAction?.targetUserId === presence.userId
          ? queuedAvatarAction.type
          : null;

        return (
          <NetworkAvatarCharacter
            key={presence.userId}
            presence={presence}
            selected={selectedAvatar}
            interactionHint={interactionHint}
            selectedRelationship={selectedAvatar ? selectedRelationship : null}
            activeFollowTargetId={activeFollowTargetId}
            actionDistance={selectedAvatar ? avatarDistance : null}
            actionReady={selectedAvatar ? avatarDistance <= AVATAR_INTERACTION_RANGE : false}
            queuedActionType={selectedQueuedActionType}
            pendingActionType={selectedAvatar ? pendingActionType : null}
            activityEntries={selectedAvatar ? selectedActivityEntries : []}
            onOpenActivityFeed={selectedAvatar ? onRefreshPresenceActivity : undefined}
            isActivityFeedLoading={selectedAvatar ? isSelectedActivityLoading : false}
            isActivityFeedLoaded={selectedAvatar ? selectedActivityFeedUserId === presence.userId : false}
            profileSummary={selectedAvatar ? selectedProfileSummary : null}
            profilePresence={selectedAvatar ? selectedProfilePresence : null}
            onOpenProfile={selectedAvatar ? onRefreshPresenceProfile : undefined}
            isProfileOpen={selectedAvatar ? isSelectedProfileOpen : false}
            isProfileLoading={selectedAvatar ? isSelectedProfileLoading : false}
            isActivityOpen={selectedAvatar ? isSelectedActivityOpen : false}
            isDirectChatOpen={selectedAvatar ? isSelectedDirectChatOpen : false}
            directChatMessages={selectedAvatar ? selectedDirectChatMessages : []}
            directChatDraft={selectedAvatar ? directChatDraft : ''}
            onDirectChatDraftChange={selectedAvatar ? onDirectChatDraftChange : undefined}
            onDirectChatSubmit={selectedAvatar ? onDirectChatSubmit : undefined}
            onDirectChatClose={selectedAvatar ? onDirectChatClose : undefined}
            isDirectChatSending={selectedAvatar ? isSendingDirectChat : false}
            requests={selectedAvatar ? selectedRequests : []}
            selfUserId={selfPresence.userId}
            pendingRequestId={pendingRequestId}
            onRespondRequest={selectedAvatar ? onRespondRequest : undefined}
            onOpenRequestContext={selectedAvatar ? onOpenRequestContext : undefined}
            onOpenRequestChat={selectedAvatar ? onOpenRequestChat : undefined}
            onOpenCharacterSheet={selectedAvatar ? onOpenPresenceSheet : undefined}
            voiceRoom={selectedAvatar ? selectedVoiceRoom : null}
            voiceMediaLabel={voiceMediaLabel}
            voiceInputPercent={voiceInputPercent}
            isVoiceMuted={isVoiceMuted}
            isVoiceUpdating={isVoiceUpdating}
            onToggleVoiceMute={selectedAvatar && selectedVoiceRoom ? onToggleVoiceMute : undefined}
            onLeaveVoiceRoom={selectedAvatar && selectedVoiceRoom ? onLeaveVoiceRoom : undefined}
            sceneCue={sceneCues[presence.userId]}
            onSelect={onSelectPresence}
            onRunAction={onRunPresenceAction}
          />
        );
      })}

      <ContactShadows scale={36} blur={2.5} far={6} opacity={0.34} resolution={quality === 'high' ? 1024 : 512} />
    </GameEngine3D>
  );
}

function getMiniMapPercent(position: WorldPresenceVector | [number, number, number]) {
  const x = Array.isArray(position) ? position[0] : position.x;
  const z = Array.isArray(position) ? position[2] : position.z;

  return {
    x: THREE.MathUtils.clamp(((x + WORLD_BOUNDS) / (WORLD_BOUNDS * 2)) * 100, 2, 98),
    y: THREE.MathUtils.clamp(((z + WORLD_BOUNDS) / (WORLD_BOUNDS * 2)) * 100, 2, 98),
  };
}

function getMiniMapPoint(position: WorldPresenceVector | [number, number, number]) {
  const point = getMiniMapPercent(position);

  return {
    left: `${point.x}%`,
    top: `${point.y}%`,
  };
}

function getMiniMapVector(position: WorldPresenceVector | [number, number, number]) {
  if (Array.isArray(position)) return new THREE.Vector3(position[0], position[1], position[2]);
  return new THREE.Vector3(position.x, position.y, position.z);
}

function WorldMinimap({
  selfPresence,
  remotePresences,
  selectedPresence,
  selectedPortal,
  selectedNpc,
  selectedLandObject,
  activeDistrict,
  activeFollowTargetId,
  voiceMarkers,
  liveActivityMarkers,
  districtPresenceSummary,
  landObjects,
  currentZone,
  onlineCount,
  isWorldStreamConnected,
  onMoveTarget,
  onSelectDistrict,
  onSelectPortal,
  onSelectNpc,
  onSelectVoiceMarker,
  onSelectLiveActivityMarker,
  onSelectLandObject,
  onSelectPresence,
}: {
  selfPresence: WorldPresence;
  remotePresences: WorldPresence[];
  selectedPresence: WorldPresence | null;
  selectedPortal: WorldPortal | null;
  selectedNpc: WorldNpc | null;
  selectedLandObject: PurchasedItem | null;
  activeDistrict: WorldDistrict;
  activeFollowTargetId: string | null;
  voiceMarkers: WorldVoiceMarker[];
  liveActivityMarkers: WorldLiveActivityMarker[];
  districtPresenceSummary: Record<string, DistrictPresenceSummary>;
  landObjects: PurchasedItem[];
  currentZone: string;
  onlineCount: number;
  isWorldStreamConnected: boolean;
  onMoveTarget: (point: THREE.Vector3, label?: string) => void;
  onSelectDistrict: (district: WorldDistrict) => void;
  onSelectPortal: (portal: WorldPortal) => void;
  onSelectNpc: (npc: WorldNpc) => void;
  onSelectVoiceMarker: (marker: WorldVoiceMarker) => void;
  onSelectLiveActivityMarker: (marker: WorldLiveActivityMarker) => void;
  onSelectLandObject: (item: PurchasedItem) => void;
  onSelectPresence: (presence: WorldPresence) => void;
}) {
  const handleMapPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-minimap-control="true"]')) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WORLD_BOUNDS * 2 - WORLD_BOUNDS;
    const z = ((event.clientY - rect.top) / rect.height) * WORLD_BOUNDS * 2 - WORLD_BOUNDS;
    onMoveTarget(new THREE.Vector3(x, 0, z));
  }, [onMoveTarget]);
  const socialRoutes = React.useMemo<MiniMapSocialRoute[]>(() => {
    const selfPoint = getMiniMapPercent(selfPresence.position);
    const routePriority: Record<PresenceSocialLinkKind, number> = { follow: 0, party: 1, guild: 2 };

    return remotePresences
      .map((presence): MiniMapSocialRoute | null => {
        const kind = getPresenceSocialLinkKind(selfPresence, presence, activeFollowTargetId);
        if (!kind) return null;

        const end = getMiniMapPercent(presence.position);
        const distance = getPresenceDistance(selfPresence.position, presence.position);
        const dx = end.x - selfPoint.x;
        const dy = end.y - selfPoint.y;
        const screenDistance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const curve = THREE.MathUtils.clamp(screenDistance * 0.11, 1.6, 5.8);
        const normal = { x: -dy / screenDistance, y: dx / screenDistance };
        const midpoint = { x: (selfPoint.x + end.x) / 2, y: (selfPoint.y + end.y) / 2 };

        return {
          key: `${kind}:${presence.userId}`,
          kind,
          presence,
          start: selfPoint,
          end,
          control: {
            x: THREE.MathUtils.clamp(midpoint.x + normal.x * curve, 2, 98),
            y: THREE.MathUtils.clamp(midpoint.y + normal.y * curve, 2, 98),
          },
          midpoint,
          distance,
          selected: selectedPresence?.userId === presence.userId || activeFollowTargetId === presence.userId,
        };
      })
      .filter((route): route is MiniMapSocialRoute => Boolean(route))
      .sort((a, b) => routePriority[a.kind] - routePriority[b.kind] || a.distance - b.distance)
      .slice(0, 8);
  }, [activeFollowTargetId, remotePresences, selectedPresence?.userId, selfPresence]);
  const socialRouteCounts = React.useMemo(() => {
    const counts: Partial<Record<PresenceSocialLinkKind, number>> = {};
    socialRoutes.forEach(route => {
      counts[route.kind] = (counts[route.kind] || 0) + 1;
    });
    return counts;
  }, [socialRoutes]);

  return (
    <div className="pointer-events-auto fixed right-4 top-20 z-[60] w-[min(42vw,230px)] rounded-md border border-white/70 bg-[#fffaf1]/90 p-3 shadow-2xl backdrop-blur-xl max-md:bottom-[15rem] max-md:right-3 max-md:top-auto max-md:w-[148px] md:right-6">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700">World Map</p>
          <p className="truncate text-[11px] font-black text-stone-800 md:text-sm">{currentZone}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
          isWorldStreamConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {onlineCount}
        </span>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="World minimap. Click or tap to walk."
        onPointerDown={handleMapPointerDown}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onSelectDistrict(activeDistrict);
        }}
        className="relative aspect-square overflow-hidden rounded-md border border-emerald-100 bg-[#dbeecf] shadow-inner"
      >
        <div className="absolute inset-[10%] rounded-full border border-dashed border-emerald-700/20" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/45" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/45" />

        {socialRoutes.length > 0 && (
          <svg
            viewBox="0 0 100 100"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            {socialRoutes.map((route) => {
              const meta = PRESENCE_SOCIAL_LINK_META[route.kind];
              return (
                <path
                  key={route.key}
                  d={`M ${route.start.x} ${route.start.y} Q ${route.control.x} ${route.control.y} ${route.end.x} ${route.end.y}`}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth={route.selected ? 1.45 : route.kind === 'follow' ? 1.15 : 0.82}
                  strokeLinecap="round"
                  strokeDasharray={route.kind === 'follow' ? '0' : '2 2.8'}
                  opacity={route.selected ? 0.78 : route.kind === 'guild' ? 0.38 : 0.52}
                />
              );
            })}
          </svg>
        )}

        {socialRoutes.map((route) => {
          const meta = PRESENCE_SOCIAL_LINK_META[route.kind];
          return (
            <button
              key={`route-control:${route.key}`}
              type="button"
              data-minimap-control="true"
              onClick={(event) => {
                event.stopPropagation();
                onSelectPresence(route.presence);
              }}
              className={`absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border bg-[#fffaf1]/90 text-[8px] shadow-sm transition hover:scale-110 ${
                route.selected ? 'border-white ring-2 ring-white/80' : 'border-white/75'
              }`}
              style={{
                left: `${route.midpoint.x}%`,
                top: `${route.midpoint.y}%`,
                color: meta.color,
              }}
              title={`${meta.label}: ${route.presence.name}`}
            >
              <i className={`fas ${meta.icon}`}></i>
            </button>
          );
        })}

        {WORLD_DISTRICTS.map((district) => {
          const point = getMiniMapPoint(district.position);
          const diameter = `${THREE.MathUtils.clamp((district.radius / WORLD_BOUNDS) * 100, 12, 54)}%`;
          const active = district.id === activeDistrict.id;
          const summary = districtPresenceSummary[district.id];
          return (
            <button
              key={district.id}
              type="button"
              data-minimap-control="true"
              onClick={(event) => {
                event.stopPropagation();
                onSelectDistrict(district);
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border text-[8px] transition hover:scale-105 ${
                active ? 'border-pink-400 bg-pink-100/70 text-pink-700' : 'border-white/75 bg-white/35 text-stone-600'
              }`}
              style={{ ...point, width: diameter, height: diameter }}
              title={`Walk to ${district.name}`}
            >
              <i className={`fas ${district.icon}`}></i>
              {summary?.count > 0 && (
                <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-emerald-700 px-1 text-[8px] font-black leading-4 text-white shadow-sm">
                  {summary.count}
                </span>
              )}
            </button>
          );
        })}

        {WORLD_NPCS.map((npc) => {
          const selected = selectedNpc?.id === npc.id;
          return (
            <button
              key={npc.id}
              type="button"
              data-minimap-control="true"
              onClick={(event) => {
                event.stopPropagation();
                onSelectNpc(npc);
              }}
              className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border text-[8px] text-white shadow-sm transition hover:scale-110 ${
                selected ? 'border-white bg-amber-600 ring-2 ring-amber-100' : 'border-amber-100 bg-amber-500'
              }`}
              style={getMiniMapPoint(npc.position)}
              title={`Talk to ${npc.name}`}
            >
              <i className={`fas ${npc.icon}`}></i>
            </button>
          );
        })}

        {WORLD_PORTALS.map((portal) => {
          const selected = selectedPortal?.id === portal.id;
          return (
            <button
              key={portal.id}
              type="button"
              data-minimap-control="true"
              onClick={(event) => {
                event.stopPropagation();
                onSelectPortal(portal);
              }}
              className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-md border shadow-sm transition hover:scale-110 ${
                selected ? 'border-pink-500 bg-white' : 'border-white/80 bg-white/70'
              }`}
              style={getMiniMapPoint(portal.position)}
              title={`Open ${portal.name}`}
            >
              <i className={`fas ${portal.icon} text-[8px]`} style={{ color: portal.color }}></i>
            </button>
          );
        })}

        {remotePresences.map((presence) => {
          const selected = selectedPresence?.userId === presence.userId;
          const following = activeFollowTargetId === presence.userId;
          const statusMeta = getStatusMeta(presence.status);
          return (
            <button
              key={presence.userId}
              type="button"
              data-minimap-control="true"
              onClick={(event) => {
                event.stopPropagation();
                onSelectPresence(presence);
              }}
              className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm transition hover:scale-125 ${
                selected ? 'border-pink-500 bg-pink-200' : following ? 'border-sky-500 bg-sky-100' : 'border-white bg-emerald-100'
              }`}
              style={getMiniMapPoint(presence.position)}
              title={`${presence.name} - ${presence.activity}`}
            >
              <span className="block h-full w-full rounded-full" style={{ backgroundColor: statusMeta.color }} />
            </button>
          );
        })}

        {voiceMarkers.slice(0, 8).map((marker) => (
          <button
            key={marker.id}
            type="button"
            data-minimap-control="true"
            onClick={(event) => {
              event.stopPropagation();
              onSelectVoiceMarker(marker);
            }}
            className={`absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-sm transition hover:scale-110 ${
              marker.active ? 'border-violet-500 bg-white text-violet-700' : 'border-white/85 bg-violet-100 text-violet-700'
            }`}
            style={getMiniMapPoint(marker.position)}
            title={marker.detail ? `${marker.label} - ${marker.detail}` : marker.label}
          >
            <i className={`fas ${marker.muted ? 'fa-microphone-slash' : marker.icon} text-[8px]`}></i>
          </button>
        ))}

        {liveActivityMarkers.slice(0, 6).map((marker) => (
          <button
            key={marker.id}
            type="button"
            data-minimap-control="true"
            onClick={(event) => {
              event.stopPropagation();
              onSelectLiveActivityMarker(marker);
            }}
            className={`absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-md border shadow-sm transition hover:scale-110 ${
              marker.active ? 'border-pink-500 bg-white text-pink-700' : 'border-white/85 bg-amber-100 text-stone-700'
            }`}
            style={getMiniMapPoint(marker.position)}
            title={marker.detail ? `${marker.label} - ${marker.detail}` : marker.label}
          >
            <i className={`fas ${marker.icon} text-[8px]`}></i>
          </button>
        ))}

        {landObjects.slice(0, 16).map((item) => {
          const meta = getLandObjectMeta(item);
          const selected = selectedLandObject?.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-minimap-control="true"
              onClick={(event) => {
                event.stopPropagation();
                onSelectLandObject(item);
              }}
              className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-md border shadow-sm transition hover:scale-110 ${
                selected ? 'border-amber-500 bg-white' : 'border-white/80 bg-white/65'
              }`}
              style={getMiniMapPoint(getLandObjectPosition(item))}
              title={meta.label}
            >
              <i className={`fas ${meta.icon} text-[7px]`} style={{ color: meta.color }}></i>
            </button>
          );
        })}

        <div
          className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-pink-500 shadow-lg shadow-pink-300/50"
          style={getMiniMapPoint(selfPresence.position)}
          title={selfPresence.name}
        >
          <span className="absolute inset-1 rounded-full bg-white" />
        </div>
      </div>

      {socialRoutes.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {(['follow', 'party', 'guild'] as PresenceSocialLinkKind[])
            .filter(kind => Boolean(socialRouteCounts[kind]))
            .map((kind) => {
              const meta = PRESENCE_SOCIAL_LINK_META[kind];
              return (
                <span
                  key={kind}
                  className="inline-flex h-5 items-center gap-1 rounded-full border border-white/70 bg-white/70 px-2 text-[8px] font-black text-stone-600 shadow-sm"
                  title={`${meta.label} routes`}
                >
                  <i className={`fas ${meta.icon}`} style={{ color: meta.color }}></i>
                  {socialRouteCounts[kind]}
                </span>
              );
            })}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-wider text-stone-400">
        <span className="truncate">
          <i className={`fas ${activeDistrict.icon} mr-1 text-amber-600`}></i>
          {activeDistrict.name}
        </span>
        <span className="shrink-0 max-md:hidden">
          {selfPresence.position.x.toFixed(1)}, {selfPresence.position.z.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

export default function WorldMMO3D({
  user,
  activeCircleId,
  circleName = 'Shared World',
  activeLandId,
  activeLandName = 'Narinyland Commons',
  circleMembers = [],
  landObjects = [],
  timeline,
  memories = [],
  coupons = [],
  loveLetters = [],
  quality = 'medium',
  onFlagClick,
}: WorldMMO3DProps) {
  const [movement, setMovement] = React.useState<MovementInput>(EMPTY_MOVEMENT);
  const [mobileMovePad, setMobileMovePad] = React.useState<MobileMovePadState>({ active: false, knobX: 0, knobY: 0 });
  const [selfPosition, setSelfPosition] = React.useState<WorldPresenceVector>(DEFAULT_POSITION);
  const [spawnPosition, setSpawnPosition] = React.useState<WorldPresenceVector>(DEFAULT_POSITION);
  const [spawnRevision, setSpawnRevision] = React.useState(0);
  const [worldSpawnReadyKey, setWorldSpawnReadyKey] = React.useState('');
  const [selfMoving, setSelfMoving] = React.useState(false);
  const [presences, setPresences] = React.useState<WorldPresence[]>([]);
  const [activeDistrictId, setActiveDistrictId] = React.useState(COMMONS_DISTRICT.id);
  const [zoneArrivalPrompt, setZoneArrivalPrompt] = React.useState<{ districtId: string; enteredAt: number } | null>(null);
  const [cameraMode, setCameraMode] = React.useState<'isometric' | 'third'>('isometric');
  const [rotation, setRotation] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [cameraGestureLabel, setCameraGestureLabel] = React.useState('');
  const [autoZonePresenceEnabled, setAutoZonePresenceEnabled] = React.useState(true);
  const [isIdleAfk, setIsIdleAfk] = React.useState(false);
  const [selectedPresence, setSelectedPresence] = React.useState<WorldPresence | null>(null);
  const [activeFollowTargetId, setActiveFollowTargetId] = React.useState<string | null>(null);
  const [selectedActivityFeed, setSelectedActivityFeed] = React.useState<WorldActivityFeed | null>(null);
  const [activePortalPanelId, setActivePortalPanelId] = React.useState<WorldPortalId | null>(null);
  const [isSelectedProfileOpen, setIsSelectedProfileOpen] = React.useState(false);
  const [isLoadingSelectedProfile, setIsLoadingSelectedProfile] = React.useState(false);
  const [isSelectedActivityOpen, setIsSelectedActivityOpen] = React.useState(false);
  const [isLoadingSelectedActivity, setIsLoadingSelectedActivity] = React.useState(false);
  const [selectedCharacterPanelUserId, setSelectedCharacterPanelUserId] = React.useState<string | null>(null);
  const [selectedNpc, setSelectedNpc] = React.useState<WorldNpc | null>(null);
  const [selectedDistrict, setSelectedDistrict] = React.useState<WorldDistrict | null>(null);
  const [isDistrictPanelOpen, setIsDistrictPanelOpen] = React.useState(false);
  const [selectedPortal, setSelectedPortal] = React.useState<WorldPortal | null>(null);
  const [selectedLandObject, setSelectedLandObject] = React.useState<PurchasedItem | null>(null);
  const [worldActions, setWorldActions] = React.useState<WorldSocialAction[]>([]);
  const [worldChatMessages, setWorldChatMessages] = React.useState<WorldChatMessage[]>([]);
  const [worldRelationships, setWorldRelationships] = React.useState<WorldRelationship[]>([]);
  const [worldRequests, setWorldRequests] = React.useState<WorldSocialAction[]>([]);
  const [worldVoiceRooms, setWorldVoiceRooms] = React.useState<WorldVoiceRoom[]>([]);
  const [worldParty, setWorldParty] = React.useState<WorldParty | null>(null);
  const [worldEvent, setWorldEvent] = React.useState<WorldEvent | null>(null);
  const [worldGuild, setWorldGuild] = React.useState<WorldGuild | null>(null);
  const [isPartyPanelOpen, setIsPartyPanelOpen] = React.useState(false);
  const [isPartyUpdating, setIsPartyUpdating] = React.useState(false);
  const [isEventPanelOpen, setIsEventPanelOpen] = React.useState(false);
  const [isEventUpdating, setIsEventUpdating] = React.useState(false);
  const [isGuildPanelOpen, setIsGuildPanelOpen] = React.useState(false);
  const [isGuildUpdating, setIsGuildUpdating] = React.useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = React.useState(false);
  const [chatChannel, setChatChannel] = React.useState<WorldChatChannel>('world');
  const [chatSpatialMode, setChatSpatialMode] = React.useState<'world' | 'nearby'>('world');
  const [chatTarget, setChatTarget] = React.useState<WorldPresence | null>(null);
  const [chatDraft, setChatDraft] = React.useState('');
  const [isSendingChat, setIsSendingChat] = React.useState(false);
  const [isSelectedDirectChatOpen, setIsSelectedDirectChatOpen] = React.useState(false);
  const [pendingActionType, setPendingActionType] = React.useState<WorldActionType | null>(null);
  const [queuedAvatarAction, setQueuedAvatarAction] = React.useState<QueuedAvatarAction | null>(null);
  const [queuedNpcAction, setQueuedNpcAction] = React.useState<QueuedNpcAction | null>(null);
  const [npcDialogues, setNpcDialogues] = React.useState<Record<string, NpcDialoguePulse>>({});
  const [isNearbyPanelOpen, setIsNearbyPanelOpen] = React.useState(false);
  const [isSocialPanelOpen, setIsSocialPanelOpen] = React.useState(false);
  const [pendingRelationshipAction, setPendingRelationshipAction] = React.useState<string | null>(null);
  const [isRequestsPanelOpen, setIsRequestsPanelOpen] = React.useState(false);
  const [isSessionsPanelOpen, setIsSessionsPanelOpen] = React.useState(false);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = React.useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = React.useState(false);
  const [isVoiceUpdating, setIsVoiceUpdating] = React.useState<string | null>(null);
  const [activeVoiceRoomId, setActiveVoiceRoomId] = React.useState<string | null>(null);
  const [voiceMediaStatus, setVoiceMediaStatus] = React.useState<VoiceMediaStatus>('idle');
  const [voiceMediaError, setVoiceMediaError] = React.useState('');
  const [voiceInputLevel, setVoiceInputLevel] = React.useState(0);
  const [voiceSignalStatus, setVoiceSignalStatus] = React.useState<VoiceSignalStatus>({ state: 'idle', peers: 0, received: 0 });
  const [voicePeerStates, setVoicePeerStates] = React.useState<Record<string, VoicePeerState>>({});
  const [dismissedProximityVoiceKey, setDismissedProximityVoiceKey] = React.useState('');
  const [dismissedLivePromptKey, setDismissedLivePromptKey] = React.useState('');
  const [pendingRequestId, setPendingRequestId] = React.useState<string | null>(null);
  const [pendingNpcIntent, setPendingNpcIntent] = React.useState<string | null>(null);
  const [isActionFeedOpen, setIsActionFeedOpen] = React.useState(false);
  const [isWorldStreamConnected, setIsWorldStreamConnected] = React.useState(false);
  const [worldStreamLastSeenAt, setWorldStreamLastSeenAt] = React.useState(0);
  const [worldStreamNow, setWorldStreamNow] = React.useState(() => Date.now());
  const [worldInterestStats, setWorldInterestStats] = React.useState<WorldSnapshot['interest'] | null>(null);
  const [characterProfile, setCharacterProfile] = React.useState<CharacterProfile | null>(null);
  const [characterDraft, setCharacterDraft] = React.useState({
    displayName: '',
    title: '',
    activity: 'Exploring',
    modelUrl: '',
  });
  const [worldInventory, setWorldInventory] = React.useState<WorldInventoryItem[]>([]);
  const [worldMarketCatalog, setWorldMarketCatalog] = React.useState<WorldInventoryCatalogItem[]>([]);
  const [worldMarketStats, setWorldMarketStats] = React.useState<LoveStats | null>(null);
  const [worldAchievements, setWorldAchievements] = React.useState<WorldAchievement[]>([]);
  const [isCharacterPanelOpen, setIsCharacterPanelOpen] = React.useState(false);
  const [isPresencePanelOpen, setIsPresencePanelOpen] = React.useState(false);
  const [isAchievementsPanelOpen, setIsAchievementsPanelOpen] = React.useState(false);
  const [isMarketPanelOpen, setIsMarketPanelOpen] = React.useState(false);
  const [isEmoteWheelOpen, setIsEmoteWheelOpen] = React.useState(false);
  const [isSavingCharacter, setIsSavingCharacter] = React.useState(false);
  const [isEquippingItem, setIsEquippingItem] = React.useState<string | null>(null);
  const [isEquippingTitle, setIsEquippingTitle] = React.useState<string | null>(null);
  const [isPurchasingItem, setIsPurchasingItem] = React.useState<string | null>(null);
  const [quickEmotePulse, setQuickEmotePulse] = React.useState<{ emote: string; createdAt: number } | null>(null);
  const [remoteEmotePulses, setRemoteEmotePulses] = React.useState<Record<string, RemoteEmotePulse>>({});
  const [quickActivityPulse, setQuickActivityPulse] = React.useState<ActivityPulse | null>(null);
  const [remoteActivityPulses, setRemoteActivityPulses] = React.useState<Record<string, ActivityPulse>>({});
  const [worldNavigationIntent, setWorldNavigationIntent] = React.useState<{ kind: WorldPresenceIntent['kind']; label: string; targetPosition?: WorldPresenceVector; updatedAt: number } | null>(null);
  const [worldToast, setWorldToast] = React.useState('');
  const cameraTargetRef = React.useRef(new THREE.Vector3(DEFAULT_POSITION.x, DEFAULT_POSITION.y, DEFAULT_POSITION.z));
  const moveTargetRef = React.useRef(new THREE.Vector3(DEFAULT_POSITION.x, DEFAULT_POSITION.y, DEFAULT_POSITION.z));
  const heartbeatRef = React.useRef<LocalPresenceSample>(createPresenceSample(DEFAULT_POSITION));
  const landObjectsRef = React.useRef(landObjects);
  const npcPositionsRef = React.useRef<Record<string, WorldPresenceVector>>({});
  const lastWorldInputAtRef = React.useRef(Date.now());
  const worldStreamLastSeenAtRef = React.useRef(0);
  const mobileMovePointerIdRef = React.useRef<number | null>(null);
  const cameraGestureRef = React.useRef<CameraGestureState>({
    pointers: new Map(),
    lastDistance: null,
    lastAngle: null,
    isActive: false,
  });
  const cameraGestureTimerRef = React.useRef<number | null>(null);
  const voiceMediaStreamRef = React.useRef<MediaStream | null>(null);
  const voiceAudioContextRef = React.useRef<AudioContext | null>(null);
  const voiceAnalyserRef = React.useRef<AnalyserNode | null>(null);
  const voiceSourceRef = React.useRef<MediaStreamAudioSourceNode | null>(null);
  const voiceMeterFrameRef = React.useRef<number | null>(null);
  const voiceSignalCursorRef = React.useRef(0);
  const voiceSignalRoomRef = React.useRef<string | null>(null);
  const voiceSignalAnnounceKeyRef = React.useRef('');
  const proximityVoiceRetuneAtRef = React.useRef(0);
  const voicePeerConnectionsRef = React.useRef<Map<string, RTCPeerConnection>>(new Map());
  const voiceRemoteAudioRef = React.useRef<Map<string, HTMLAudioElement>>(new Map());
  const voicePendingIceRef = React.useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const voiceMakingOfferRef = React.useRef<Set<string>>(new Set());
  const voicePeerRoomRef = React.useRef<string | null>(null);
  const processedVoiceSignalIdsRef = React.useRef<Set<string>>(new Set());
  const remoteEmoteByUserRef = React.useRef<Record<string, string>>({});
  const remoteActivityByUserRef = React.useRef<Record<string, string>>({});
  const [worldCycle, setWorldCycle] = React.useState<WorldCycle>(() => getWorldCycle(Date.now(), activeCircleId));

  React.useEffect(() => {
    landObjectsRef.current = landObjects;
  }, [landObjects]);

  const updateNpcPosition = React.useCallback((npcId: string, position: THREE.Vector3) => {
    const existing = npcPositionsRef.current[npcId] || { x: 0, y: 0, z: 0 };
    existing.x = Number(position.x.toFixed(2));
    existing.y = Number(position.y.toFixed(2));
    existing.z = Number(position.z.toFixed(2));
    npcPositionsRef.current[npcId] = existing;
  }, []);

  const getNpcPositionVector = React.useCallback((npc: WorldNpc) => {
    const current = npcPositionsRef.current[npc.id];
    return new THREE.Vector3(
      current?.x ?? npc.position[0],
      current?.y ?? npc.position[1],
      current?.z ?? npc.position[2]
    );
  }, []);
  const visibleNpcDialogues = React.useMemo<Record<string, NpcDialoguePulse>>(() => (
    Object.fromEntries(
      Object.entries(npcDialogues).filter(([, dialogue]) => (
        worldStreamNow - dialogue.createdAt <= NPC_DIALOGUE_ACTIVE_MS
      ))
    )
  ), [npcDialogues, worldStreamNow]);

  const activeDistrict = React.useMemo(
    () => WORLD_DISTRICTS.find(district => district.id === activeDistrictId) ||
      (activeDistrictId === PATHS_DISTRICT.id ? PATHS_DISTRICT : COMMONS_DISTRICT),
    [activeDistrictId]
  );
  const currentZone = React.useMemo(
    () => getZoneName(activeLandName, activeDistrict),
    [activeDistrict, activeLandName]
  );
  const activeLandScopeKey = React.useMemo(
    () => `${activeCircleId || 'local'}:${activeLandId || getLandBaseName(activeLandName)}`,
    [activeCircleId, activeLandId, activeLandName]
  );
  const streamInterestX = Math.round(selfPosition.x / 4) * 4;
  const streamInterestZ = Math.round(selfPosition.z / 4) * 4;
  const worldInterest = React.useMemo(() => ({
    currentLandId: activeLandScopeKey,
    currentZone,
    x: Number(streamInterestX.toFixed(2)),
    z: Number(streamInterestZ.toFixed(2)),
    radius: WORLD_STREAM_INTEREST_RADIUS,
  }), [activeLandScopeKey, currentZone, streamInterestX, streamInterestZ]);
  const zonePresenceMeta = React.useMemo(() => getDistrictPresenceMeta(activeDistrict), [activeDistrict]);
  const worldWeatherMeta = React.useMemo(() => getWeatherMeta(worldCycle.weather), [worldCycle.weather]);
  const userId = user?.sub || 'guest';
  const memberName = circleMembers.find(member => member.userId === user?.sub || member.id === user?.sub)?.name;
  const memberAvatar = circleMembers.find(member => member.userId === user?.sub || member.id === user?.sub)?.avatar;
  const currentProfile = React.useMemo<CharacterProfile>(() => ({
    userId,
    configId: activeCircleId || 'default',
    displayName: characterProfile?.displayName || user?.name || memberName || 'You',
    title: characterProfile?.title || 'Explorer',
    status: characterProfile?.status || 'online',
    activity: characterProfile?.activity || 'Exploring',
    emote: characterProfile?.emote || 'idle',
    modelUrl: characterProfile?.modelUrl || null,
    appearance: characterProfile?.appearance || DEFAULT_APPEARANCE,
    equipment: characterProfile?.equipment || DEFAULT_EQUIPMENT,
    cosmetics: characterProfile?.cosmetics || {},
    updatedAt: characterProfile?.updatedAt,
  }), [activeCircleId, characterProfile, memberName, user?.name, userId]);
  const selfName = currentProfile.displayName;
  const selfAvatar = user?.picture || memberAvatar || '';
  const marketBalance = worldMarketStats?.points || 0;
  const myVoiceRooms = React.useMemo(
    () => worldVoiceRooms.filter(room => room.members.some(member => member.userId === userId && member.status === 'active')),
    [userId, worldVoiceRooms]
  );
  const activeVoiceRoom = React.useMemo(
    () => worldVoiceRooms.find(room => room.id === activeVoiceRoomId) || myVoiceRooms[0] || null,
    [activeVoiceRoomId, myVoiceRooms, worldVoiceRooms]
  );
  const activeVoicePeerIds = React.useMemo(
    () => activeVoiceRoom?.members
      .filter(member => member.userId !== userId && member.status === 'active')
      .map(member => member.userId)
      .sort() || [],
    [activeVoiceRoom, userId]
  );
  const activeVoicePeerKey = activeVoicePeerIds.join(':');
  const linkedVoicePeerCount = React.useMemo(
    () => Object.values(voicePeerStates).filter(peer => (
      peer.connectionState === 'connected' ||
      peer.iceState === 'connected' ||
      peer.iceState === 'completed' ||
      peer.hasRemoteAudio
    )).length,
    [voicePeerStates]
  );
  const voiceMediaMeta = React.useMemo(() => {
    if (voiceMediaStatus === 'requesting') return { label: 'Requesting mic', icon: 'fa-spinner fa-spin', className: 'bg-amber-100 text-amber-800' };
    if (voiceMediaStatus === 'ready' && isVoiceMuted) return { label: 'Mic muted', icon: 'fa-microphone-slash', className: 'bg-stone-100 text-stone-600' };
    if (voiceMediaStatus === 'ready') return { label: 'Mic live', icon: 'fa-wave-square', className: 'bg-violet-100 text-violet-800' };
    if (voiceMediaStatus === 'blocked') return { label: 'Mic blocked', icon: 'fa-triangle-exclamation', className: 'bg-rose-100 text-rose-700' };
    if (voiceMediaStatus === 'unsupported') return { label: 'No mic', icon: 'fa-ban', className: 'bg-stone-100 text-stone-500' };
    return { label: 'Mic idle', icon: 'fa-microphone', className: 'bg-stone-100 text-stone-500' };
  }, [isVoiceMuted, voiceMediaStatus]);
  const voiceInputPercent = Math.round(voiceInputLevel * 100);
  const voiceInputBarCount = isVoiceMuted ? 0 : Math.ceil(voiceInputLevel * 8);
  const worldAchievementBadges = React.useMemo<WorldAchievementBadge[]>(
    () => worldAchievements.slice(0, 4).map(achievement => ({
      achievementKey: achievement.achievementKey,
      name: achievement.name,
      icon: achievement.icon,
      rarity: achievement.rarity,
      titleReward: achievement.titleReward,
    })),
    [worldAchievements]
  );
  const autoZonePresenceActive = autoZonePresenceEnabled && currentProfile.status !== 'afk';
  const isAutoAway = isIdleAfk || (typeof document !== 'undefined' && document.visibilityState === 'hidden');
  const broadcastActivity = isAutoAway
    ? 'AFK'
    : selfMoving ? 'Exploring' : autoZonePresenceActive ? zonePresenceMeta.activity : currentProfile.activity;
  const broadcastStatus = isAutoAway
    ? 'afk'
    : autoZonePresenceActive ? zonePresenceMeta.status : currentProfile.status;
  const broadcastEmote = isAutoAway ? 'sit' : autoZonePresenceActive && !selfMoving ? zonePresenceMeta.emote : currentProfile.emote;

  const selfPresence = React.useMemo<WorldPresence>(() => ({
    userId,
    name: selfName,
    avatar: selfAvatar,
    position: selfPosition,
    velocity: heartbeatRef.current.velocity,
    heading: heartbeatRef.current.heading,
    moving: selfMoving,
    animation: selfMoving ? 'walk' : 'idle',
    activity: broadcastActivity,
    status: broadcastStatus,
    guild: worldGuild?.name,
    guildId: worldGuild?.id,
    party: worldParty?.name,
    partyId: worldParty?.id,
    eventId: worldEvent?.id,
    eventName: worldEvent?.participants.some(participant => participant.userId === userId) ? worldEvent.title : undefined,
    title: currentProfile.title,
    emote: broadcastEmote,
    modelUrl: currentProfile.modelUrl,
    appearance: currentProfile.appearance,
    equipment: currentProfile.equipment,
    cosmetics: currentProfile.cosmetics,
    achievements: worldAchievementBadges,
    voiceRoomId: activeVoiceRoom?.id,
    voiceRoomName: activeVoiceRoom?.name,
    isVoiceMuted,
    currentLandId: activeLandScopeKey,
    currentZone,
    lastSeen: new Date().toISOString(),
  }), [activeLandScopeKey, activeVoiceRoom, broadcastActivity, broadcastEmote, broadcastStatus, currentProfile, currentZone, isVoiceMuted, selfAvatar, selfMoving, selfName, selfPosition, userId, worldAchievementBadges, worldEvent, worldGuild, worldParty]);

  const remotePresences = React.useMemo(
    () => presences.filter(presence => presence.userId !== userId),
    [presences, userId]
  );

  React.useEffect(() => {
    if (!selectedPresence) return;

    const latestPresence = remotePresences.find(presence => presence.userId === selectedPresence.userId);
    setSelectedPresence(prev => {
      if (!prev || prev.userId !== selectedPresence.userId) return prev;
      return latestPresence || null;
    });
  }, [remotePresences, selectedPresence?.userId]);

  const selectedDistrictPresences = React.useMemo(() => {
    if (!selectedDistrict) return [];
    return [selfPresence, ...remotePresences]
      .filter(presence => getDistrictForPosition(presence.position).id === selectedDistrict.id)
      .slice(0, 6);
  }, [remotePresences, selectedDistrict, selfPresence]);
  const selectedDistrictNpcs = React.useMemo(
    () => selectedDistrict ? WORLD_NPCS.filter(npc => npc.district === selectedDistrict.name) : [],
    [selectedDistrict]
  );
  const selectedNpcPosition = React.useMemo(
    () => selectedNpc ? vectorToObject(getNpcPositionVector(selectedNpc)) : null,
    [getNpcPositionVector, selectedNpc, worldStreamNow]
  );
  const selectedNpcDistance = React.useMemo(
    () => selectedNpcPosition ? getPresenceDistance(selfPosition, selectedNpcPosition) : null,
    [selectedNpcPosition, selfPosition]
  );
  const selectedNpcQueued = Boolean(
    selectedNpc &&
    queuedNpcAction &&
    queuedNpcAction.npcId === selectedNpc.id
  );
  const selectedDistrictZone = React.useMemo(
    () => selectedDistrict ? getZoneName(activeLandName, selectedDistrict) : currentZone,
    [activeLandName, currentZone, selectedDistrict]
  );
  const activeFollowPresence = React.useMemo(
    () => remotePresences.find(presence => presence.userId === activeFollowTargetId) || null,
    [activeFollowTargetId, remotePresences]
  );
  const activeFollowDistance = React.useMemo(
    () => activeFollowPresence ? getPresenceDistance(selfPosition, activeFollowPresence.position) : null,
    [activeFollowPresence, selfPosition]
  );
  const selectedPresenceDistance = React.useMemo(
    () => selectedPresence ? getPresenceDistance(selfPosition, selectedPresence.position) : null,
    [selectedPresence, selfPosition]
  );
  const selectedPresenceReady = selectedPresenceDistance !== null && selectedPresenceDistance <= AVATAR_INTERACTION_RANGE;
  const nearbyVoicePresences = React.useMemo(
    () => remotePresences
      .map(presence => ({ presence, distance: getPresenceDistance(selfPosition, presence.position) }))
      .filter(item => item.distance <= PROXIMITY_VOICE_RANGE)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8),
    [remotePresences, selfPosition]
  );
  const nearbyVoiceNudge = React.useMemo(() => {
    if (nearbyVoicePresences.length === 0) return null;
    if (voiceMediaStatus === 'blocked' || voiceMediaStatus === 'unsupported') return null;

    const activeVoiceRoomZone = activeVoiceRoom ? getVoiceRoomZone(activeVoiceRoom) : '';
    const alreadyInNearbyVoice = activeVoiceRoom?.kind === 'proximity' && (
      !activeVoiceRoomZone || activeVoiceRoomZone === currentZone
    );
    if (alreadyInNearbyVoice) return null;

    const speakingNearby = nearbyVoicePresences.filter(({ presence }) => (
      Boolean(presence.voiceRoomName) && !presence.isVoiceMuted
    ));
    const featured = speakingNearby.length > 0 ? speakingNearby : nearbyVoicePresences;
    const closest = featured[0];
    if (!closest) return null;

    const key = [
      currentZone,
      closest.presence.userId,
      featured.slice(0, 4).map(({ presence }) => presence.userId).join(':'),
    ].join('|');
    if (dismissedProximityVoiceKey === key) return null;

    return {
      key,
      closest,
      avatars: featured.slice(0, 3),
      count: nearbyVoicePresences.length,
      openMicCount: speakingNearby.length,
      signal: getVoiceSignalMeta(closest.distance),
    };
  }, [activeVoiceRoom, currentZone, dismissedProximityVoiceKey, nearbyVoicePresences, voiceMediaStatus]);
  const proximityVoiceRange = React.useMemo<ProximityVoiceRangeState>(() => {
    const roomZone = activeVoiceRoom ? getVoiceRoomZone(activeVoiceRoom) : '';
    const active = activeVoiceRoom?.kind === 'proximity' && (!roomZone || roomZone === currentZone);
    const nearbyCount = nearbyVoicePresences.length;
    const visible = Boolean(active || nearbyCount > 0 || isVoicePanelOpen);
    const openCount = activeVoiceRoom ? getVoiceOpenMemberCount(activeVoiceRoom) : 0;
    const color = active
      ? isVoiceMuted ? '#78716c' : '#8b5cf6'
      : nearbyCount > 0 ? '#f59e0b' : '#78716c';
    const detail = active
      ? isVoiceMuted
        ? `${openCount} open / muted`
        : `${openCount} open / mic ${voiceInputPercent}%`
      : nearbyCount > 0
        ? `${nearbyCount} nearby avatar${nearbyCount === 1 ? '' : 's'}`
        : 'No nearby avatars';

    return {
      visible,
      active,
      muted: isVoiceMuted,
      nearbyCount,
      inputPercent: voiceInputPercent,
      label: active ? 'Proximity Voice' : 'Voice Range',
      detail,
      color,
    };
  }, [activeVoiceRoom, currentZone, isVoiceMuted, isVoicePanelOpen, nearbyVoicePresences.length, voiceInputPercent]);
  const nearbyWorldPresences = React.useMemo(
    () => remotePresences
      .map(presence => ({
        presence,
        distance: getPresenceDistance(selfPosition, presence.position),
        district: getDistrictForPosition(presence.position),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8),
    [remotePresences, selfPosition]
  );
  const isJoinedEvent = React.useMemo(
    () => Boolean(worldEvent?.participants.some(participant => participant.userId === userId)),
    [userId, worldEvent]
  );
  const eventRallyCount = getWorldEventMetadataNumber(worldEvent, 'rallyCount');
  const eventLastRallyBy = getWorldEventMetadataString(worldEvent, 'lastRallyByName');
  const eventLastRallyAt = getWorldEventMetadataString(worldEvent, 'lastRallyAt');
  const eventRallyZone = getWorldEventMetadataString(worldEvent, 'rallyZone');
  const eventRallyPulse = React.useMemo<WorldEventRallyState>(() => {
    if (!worldEvent || worldEvent.status !== 'active') {
      return {
        visible: false,
        label: '',
        detail: '',
        color: '#f59e0b',
        position: [0, 0, 0],
        intensity: 0,
        participantCount: 0,
        rallyCount: 0,
      };
    }

    const participantCount = worldEvent.participants.filter(participant => participant.status !== 'left').length;
    const lastRallyTime = eventLastRallyAt ? Date.parse(eventLastRallyAt) : Number.NaN;
    const rallyAge = Number.isFinite(lastRallyTime) ? Math.max(0, worldStreamNow - lastRallyTime) : Number.POSITIVE_INFINITY;
    const hasFreshRally = rallyAge <= EVENT_RALLY_PULSE_ACTIVE_MS;
    const fadeIntensity = hasFreshRally
      ? 1 - THREE.MathUtils.clamp(rallyAge / EVENT_RALLY_PULSE_ACTIVE_MS, 0, 1)
      : 0;
    const restingIntensity = isJoinedEvent ? 0.34 : participantCount > 0 ? 0.2 : 0;
    const intensity = Math.max(restingIntensity, fadeIntensity);
    const visible = participantCount > 0 || isJoinedEvent || hasFreshRally;
    const rallyLabel = eventLastRallyBy
      ? `${eventLastRallyBy} rallied`
      : isJoinedEvent
        ? 'Event rally active'
        : worldEvent.title;
    const detail = [
      `${participantCount} attending`,
      eventRallyCount > 0 ? `${eventRallyCount} rallies` : '',
      eventRallyZone || worldEvent.district || '',
    ].filter(Boolean).join(' - ');

    return {
      visible,
      label: rallyLabel,
      detail,
      color: '#f59e0b',
      position: getEventMarkerPosition(worldEvent),
      intensity,
      participantCount,
      rallyCount: eventRallyCount,
    };
  }, [eventLastRallyAt, eventLastRallyBy, eventRallyCount, eventRallyZone, isJoinedEvent, worldEvent, worldStreamNow]);
  const socialSummary = React.useMemo(() => {
    const following = worldRelationships.filter(relationship => (
      relationship.type === 'follow' &&
      relationship.status === 'active' &&
      relationship.fromUserId === userId
    ));
    const friends = worldRelationships.filter(relationship => (
      relationship.type === 'friend' &&
      relationship.status === 'accepted' &&
      (relationship.fromUserId === userId || relationship.toUserId === userId)
    ));
    const pendingFriends = worldRelationships.filter(relationship => (
      relationship.type === 'friend' &&
      relationship.status === 'pending'
    ));

    return { following, friends, pendingFriends };
  }, [userId, worldRelationships]);
  const socialPanelRelationships = React.useMemo(() => {
    const seen = new Set<string>();
    return [...socialSummary.friends, ...socialSummary.following, ...socialSummary.pendingFriends]
      .filter((relationship) => {
        const counterpartId = relationship.fromUserId === userId ? relationship.toUserId : relationship.fromUserId;
        const key = `${relationship.type}:${relationship.status}:${counterpartId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }, [socialSummary, userId]);
  const requestSummary = React.useMemo(() => ({
    incoming: worldRequests.filter(request => request.toUserId === userId && request.status === 'requested'),
    outgoing: worldRequests.filter(request => request.fromUserId === userId && request.status === 'requested'),
    active: worldRequests.filter(request => request.status === 'accepted'),
  }), [userId, worldRequests]);
  const interactionSessions = React.useMemo(
    () => requestSummary.active.filter(request => (
      isInteractionSessionType(request.type) &&
      isInteractionSessionInLand(request, activeLandScopeKey)
    )),
    [activeLandScopeKey, requestSummary.active]
  );
  const activeInteractionSession = React.useMemo(
    () => interactionSessions.find(session => session.id === activeSessionId) || interactionSessions[0] || null,
    [activeSessionId, interactionSessions]
  );
  const currentWorldIntent = React.useMemo<WorldPresenceIntent | undefined>(() => {
    if (activeFollowPresence) {
      return {
        kind: 'follow',
        label: `Following ${activeFollowPresence.name}`,
        detail: activeFollowPresence.currentZone,
        icon: 'fa-route',
        targetUserId: activeFollowPresence.userId,
        targetName: activeFollowPresence.name,
        targetPosition: activeFollowPresence.position,
        zone: currentZone,
      };
    }

    if (activeInteractionSession) {
      const counterpart = getRequestCounterpart(activeInteractionSession, userId);
      const sessionAccent = getSessionAccent(activeInteractionSession.type);
      const sessionPosition = getSessionMarkerPosition(activeInteractionSession, [selfPresence, ...remotePresences]);
      return {
        kind: activeInteractionSession.type === 'trade' ? 'trade' : 'create',
        label: activeInteractionSession.type === 'trade' ? 'Trading' : 'Collaborating',
        detail: counterpart.name,
        icon: sessionAccent.icon,
        targetUserId: counterpart.userId,
        targetName: counterpart.name,
        targetPosition: tupleToPresenceVector(sessionPosition),
        zone: currentZone,
      };
    }

    if (queuedAvatarAction) {
      const target = remotePresences.find(presence => presence.userId === queuedAvatarAction.targetUserId);
      const action = getWorldActionDescriptor(queuedAvatarAction.type);
      if (target && action) {
        return {
          kind: getQueuedActionIntentKind(action.type),
          label: `Approaching ${target.name}`,
          detail: action.label,
          icon: action.icon,
          targetUserId: target.userId,
          targetName: target.name,
          targetPosition: target.position,
          zone: currentZone,
        };
      }
    }

    if (isChatPanelOpen && chatChannel === 'direct' && chatTarget) {
      return {
        kind: 'chat',
        label: `Chatting with ${chatTarget.name}`,
        detail: chatTarget.currentZone,
        icon: 'fa-comment',
        targetUserId: chatTarget.userId,
        targetName: chatTarget.name,
        targetPosition: chatTarget.position,
        zone: currentZone,
      };
    }

    if (activeVoiceRoom) {
      const voicePosition = getVoiceRoomPosition(activeVoiceRoom, [selfPresence, ...remotePresences]);
      return {
        kind: 'voice',
        label: activeVoiceRoom.name,
        detail: getVoiceRoomZone(activeVoiceRoom) || currentZone,
        icon: activeVoiceRoom.kind === 'guild' ? 'fa-shield-heart' : activeVoiceRoom.kind === 'party' ? 'fa-users' : 'fa-microphone',
        targetPosition: tupleToPresenceVector(voicePosition),
        zone: currentZone,
      };
    }

    if (isJoinedEvent && worldEvent) {
      const eventPosition = getEventMarkerPosition(worldEvent);
      return {
        kind: 'event',
        label: worldEvent.title,
        detail: worldEvent.district || currentZone,
        icon: 'fa-star',
        targetPosition: tupleToPresenceVector(eventPosition),
        zone: currentZone,
      };
    }

    if (worldNavigationIntent) {
      return {
        kind: worldNavigationIntent.kind,
        label: `Walking to ${worldNavigationIntent.label}`,
        detail: currentZone,
        icon: 'fa-location-crosshairs',
        targetPosition: worldNavigationIntent.targetPosition,
        zone: currentZone,
      };
    }

    if (selectedPortal && activePortalPanelId === selectedPortal.id) {
      return {
        kind: selectedPortal.id === 'shop' ? 'trade' : selectedPortal.id === 'timeline' || selectedPortal.id === 'home' ? 'create' : 'inspect',
        label: selectedPortal.name,
        detail: selectedPortal.actionLabel,
        icon: selectedPortal.icon,
        targetPosition: tupleToPresenceVector(selectedPortal.position),
        zone: currentZone,
      };
    }

    if (selectedLandObject) {
      const meta = getLandObjectMeta(selectedLandObject);
      const objectPosition = getLandObjectPosition(selectedLandObject);
      return {
        kind: 'inspect',
        label: `Inspecting ${meta.label}`,
        detail: activeLandName,
        icon: meta.icon,
        targetPosition: tupleToPresenceVector(objectPosition),
        zone: currentZone,
      };
    }

    if (queuedNpcAction) {
      const npc = WORLD_NPCS.find(item => item.id === queuedNpcAction.npcId);
      if (npc) {
        return {
          kind: 'walk_to',
          label: `Approaching ${npc.name}`,
          detail: npc.role,
          icon: npc.icon,
          targetPosition: vectorToObject(getNpcPositionVector(npc)),
          zone: currentZone,
        };
      }
    }

    if (selectedNpc) {
      return {
        kind: 'inspect',
        label: `Talking to ${selectedNpc.name}`,
        detail: selectedNpc.role,
        icon: selectedNpc.icon,
        targetPosition: selectedNpcPosition || tupleToPresenceVector(selectedNpc.position),
        zone: currentZone,
      };
    }

    if (selectedDistrict) {
      return {
        kind: 'inspect',
        label: `${selectedDistrict.name} hub`,
        detail: selectedDistrictZone,
        icon: selectedDistrict.icon,
        targetPosition: tupleToPresenceVector(selectedDistrict.position),
        zone: currentZone,
      };
    }

    if (isPartyPanelOpen && worldParty) {
      const partyPresences = [selfPresence, ...remotePresences].filter(presence => presence.partyId === worldParty.id);
      const partyPosition = getPresenceClusterPosition(partyPresences, `party-intent:${worldParty.id}`, getDistrictForZoneName(currentZone));
      return {
        kind: 'party',
        label: worldParty.name,
        detail: `${worldParty.members.length} members`,
        icon: 'fa-users',
        targetPosition: tupleToPresenceVector(partyPosition),
        zone: currentZone,
      };
    }

    if (isGuildPanelOpen && worldGuild) {
      const guildPresences = [selfPresence, ...remotePresences].filter(presence => presence.guildId === worldGuild.id);
      const guildPosition = getPresenceClusterPosition(guildPresences, `guild-intent:${worldGuild.id}`, getDistrictForZoneName(currentZone));
      return {
        kind: 'guild',
        label: worldGuild.name,
        detail: `${worldGuild.members.length} members`,
        icon: 'fa-shield-heart',
        targetPosition: tupleToPresenceVector(guildPosition),
        zone: currentZone,
      };
    }

    return undefined;
  }, [activeFollowPresence, activeInteractionSession, activeLandName, activePortalPanelId, activeVoiceRoom, chatChannel, chatTarget, currentZone, getNpcPositionVector, isChatPanelOpen, isGuildPanelOpen, isJoinedEvent, isPartyPanelOpen, queuedAvatarAction, queuedNpcAction, remotePresences, selectedDistrict, selectedDistrictZone, selectedLandObject, selectedNpc, selectedNpcPosition, selectedPortal, selfPresence, userId, worldEvent, worldGuild, worldNavigationIntent, worldParty]);

  const sendPresenceHeartbeatNow = React.useCallback(async (
    profileOverride?: CharacterProfile,
    options: { forceManualPresence?: boolean } = {},
  ) => {
    if (!user?.sub || !activeCircleId || worldSpawnReadyKey !== activeLandScopeKey) return false;

    const profile = profileOverride || currentProfile;
    const snapshot = heartbeatRef.current;
    const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const isAway = isHidden || isIdleAfk;
    const autoPresenceActive = !options.forceManualPresence && autoZonePresenceEnabled && profile.status !== 'afk';

    await presenceAPI.heartbeat({
      name: profile.displayName || selfName,
      avatar: selfAvatar,
      position: snapshot.position,
      velocity: snapshot.velocity,
      heading: snapshot.heading,
      moving: snapshot.moving,
      animation: snapshot.moving ? 'walk' : 'idle',
      activity: isAway ? 'AFK' : snapshot.moving ? 'Exploring' : autoPresenceActive ? zonePresenceMeta.activity : profile.activity,
      status: isAway ? 'afk' : autoPresenceActive ? zonePresenceMeta.status : profile.status,
      guild: worldGuild?.name,
      guildId: worldGuild?.id,
      party: worldParty?.name,
      eventId: worldEvent?.id,
      eventName: worldEvent?.participants.some(participant => participant.userId === userId) ? worldEvent.title : undefined,
      title: profile.title,
      emote: isAway ? 'sit' : autoPresenceActive && !snapshot.moving ? zonePresenceMeta.emote : profile.emote,
      modelUrl: profile.modelUrl,
      appearance: profile.appearance,
      equipment: profile.equipment,
      cosmetics: profile.cosmetics,
      achievements: worldAchievementBadges,
      voiceRoomId: activeVoiceRoom?.id,
      voiceRoomName: activeVoiceRoom?.name,
      isVoiceMuted,
      intent: currentWorldIntent ? { ...currentWorldIntent, updatedAt: new Date().toISOString() } : undefined,
      currentLandId: activeLandScopeKey,
      currentZone,
    });

    return true;
  }, [activeCircleId, activeLandScopeKey, activeVoiceRoom, autoZonePresenceEnabled, currentProfile, currentWorldIntent, currentZone, isIdleAfk, isVoiceMuted, selfAvatar, selfName, user?.sub, userId, worldAchievementBadges, worldEvent, worldGuild, worldParty?.name, worldSpawnReadyKey, zonePresenceMeta]);

  const applyVoiceRoomState = React.useCallback((voiceRooms: WorldVoiceRoom[], myVoiceRooms?: WorldVoiceRoom[]) => {
    setWorldVoiceRooms(voiceRooms);
    const myRooms = myVoiceRooms || voiceRooms.filter(room => (
      room.members.some(member => member.userId === userId && member.status === 'active')
    ));
    const nextActiveRoom = voiceRooms.find(room => room.id === activeVoiceRoomId) || myRooms[0] || null;
    setActiveVoiceRoomId(nextActiveRoom?.id || null);
    const selfMember = nextActiveRoom?.members.find(member => member.userId === userId);
    if (selfMember) setIsVoiceMuted(selfMember.isMuted);
  }, [activeVoiceRoomId, userId]);

  const applyWorldSnapshot = React.useCallback((snapshot: WorldSnapshot) => {
    setPresences(snapshot.presences);
    setWorldActions(snapshot.actions);
    setWorldChatMessages(snapshot.chatMessages);
    if (snapshot.interest !== undefined) setWorldInterestStats(snapshot.interest);
    if (snapshot.event !== undefined) setWorldEvent(snapshot.event);
    if (snapshot.party !== undefined) setWorldParty(snapshot.party);
    if (snapshot.guild !== undefined) setWorldGuild(snapshot.guild);
    if (snapshot.relationships !== undefined) setWorldRelationships(snapshot.relationships);
    if (snapshot.requests !== undefined) setWorldRequests(snapshot.requests);
    if (snapshot.inventory !== undefined) setWorldInventory(snapshot.inventory);
    if (snapshot.marketCatalog !== undefined) setWorldMarketCatalog(snapshot.marketCatalog);
    if (snapshot.marketStats !== undefined) setWorldMarketStats(snapshot.marketStats);
    if (snapshot.achievements !== undefined) setWorldAchievements(snapshot.achievements);
    if (snapshot.characterEquipment !== undefined || snapshot.characterTitle !== undefined) {
      setCharacterProfile(prev => prev ? ({
        ...prev,
        equipment: snapshot.characterEquipment || prev.equipment,
        title: snapshot.characterTitle || prev.title,
      }) : prev);
      if (snapshot.characterTitle) setCharacterDraft(prev => ({ ...prev, title: snapshot.characterTitle || prev.title }));
    }
    if (snapshot.voiceRooms !== undefined) {
      applyVoiceRoomState(snapshot.voiceRooms, snapshot.myVoiceRooms);
    }
  }, [applyVoiceRoomState]);

  const applyPresenceDelta = React.useCallback((delta: WorldPresenceDelta) => {
    if (!isPresenceDeltaInWorldScope(delta, activeLandScopeKey, currentZone)) return;
    if (delta.interest !== undefined) setWorldInterestStats(delta.interest);
    if (delta.removedUserId) {
      setPresences(prev => prev.filter(presence => presence.userId !== delta.removedUserId));
      return;
    }
    if (!delta.presence) return;
    setPresences(prev => (
      [delta.presence!, ...prev.filter(presence => presence.userId !== delta.presence!.userId)]
        .sort((a, b) => a.name.localeCompare(b.name))
    ));
  }, [activeLandScopeKey, currentZone]);

  const applyActionDelta = React.useCallback((delta: WorldActionDelta) => {
    if (!delta.action) {
      if (delta.actionId) setWorldActions(prev => prev.filter(action => action.id !== delta.actionId));
      return;
    }
    setWorldActions(prev => [delta.action!, ...prev.filter(action => action.id !== delta.action!.id)].slice(0, 12));
  }, []);

  const applyChatDelta = React.useCallback((delta: WorldChatDelta) => {
    if (!delta.message) {
      if (delta.messageId) setWorldChatMessages(prev => prev.filter(message => message.id !== delta.messageId));
      return;
    }
    setWorldChatMessages(prev => [...prev.filter(message => message.id !== delta.message!.id), delta.message!].slice(-18));
  }, []);

  const applyVoiceDelta = React.useCallback((delta: WorldVoiceDelta) => {
    applyVoiceRoomState(delta.voiceRooms, delta.myVoiceRooms);
  }, [applyVoiceRoomState]);

  const applySocialStateDelta = React.useCallback((delta: WorldSocialStateDelta) => {
    if (delta.event !== undefined) setWorldEvent(delta.event);
    if (delta.party !== undefined) setWorldParty(delta.party);
    if (delta.guild !== undefined) setWorldGuild(delta.guild);
    if (delta.relationships !== undefined) setWorldRelationships(delta.relationships);
    if (delta.requests !== undefined) setWorldRequests(delta.requests);
    if (delta.inventory !== undefined) setWorldInventory(delta.inventory);
    if (delta.marketCatalog !== undefined) setWorldMarketCatalog(delta.marketCatalog);
    if (delta.marketStats !== undefined) setWorldMarketStats(delta.marketStats);
    if (delta.achievements !== undefined) setWorldAchievements(delta.achievements);
    if (delta.characterEquipment !== undefined || delta.characterTitle !== undefined) {
      setCharacterProfile(prev => prev ? ({
        ...prev,
        equipment: delta.characterEquipment || prev.equipment,
        title: delta.characterTitle || prev.title,
      }) : prev);
      if (delta.characterTitle) setCharacterDraft(prev => ({ ...prev, title: delta.characterTitle || prev.title }));
    }
  }, []);

  const markWorldActive = React.useCallback(() => {
    lastWorldInputAtRef.current = Date.now();
    setIsIdleAfk(false);
  }, []);

  const stopFollowing = React.useCallback((message = 'Stopped following') => {
    if (!activeFollowTargetId) return;
    setActiveFollowTargetId(null);
    moveTargetRef.current.set(selfPosition.x, 0, selfPosition.z);
    setWorldToast(message);
  }, [activeFollowTargetId, selfPosition]);

  const cancelQueuedAvatarApproach = React.useCallback((message = 'Canceled approach') => {
    setQueuedAvatarAction(null);
    setPendingActionType(null);
    setWorldNavigationIntent(null);
    moveTargetRef.current.set(selfPosition.x, 0, selfPosition.z);
    setWorldToast(message);
  }, [selfPosition]);

  const pressMovement = React.useCallback((key: keyof MovementInput, pressed: boolean) => {
    if (pressed) {
      markWorldActive();
      stopFollowing();
      if (queuedAvatarAction) {
        setQueuedAvatarAction(null);
        setPendingActionType(prev => prev === queuedAvatarAction.type ? null : prev);
        setWorldNavigationIntent(null);
      }
    }
    setMovement(prev => ({ ...prev, [key]: pressed }));
  }, [markWorldActive, queuedAvatarAction, stopFollowing]);

  const updateMobileMovePadFromPointer = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawX = event.clientX - centerX;
    const rawY = event.clientY - centerY;
    const distance = Math.sqrt(rawX * rawX + rawY * rawY);
    const maxDistance = Math.min(MOBILE_MOVE_PAD_KNOB_MAX, Math.max(24, Math.min(rect.width, rect.height) / 2 - 22));
    const clampedDistance = Math.min(distance, maxDistance);
    const directionX = distance > 0 ? rawX / distance : 0;
    const directionY = distance > 0 ? rawY / distance : 0;
    const knobX = Number((directionX * clampedDistance).toFixed(1));
    const knobY = Number((directionY * clampedDistance).toFixed(1));
    const nextMovement: MovementInput = {
      forward: rawY < -MOBILE_MOVE_PAD_THRESHOLD,
      back: rawY > MOBILE_MOVE_PAD_THRESHOLD,
      left: rawX < -MOBILE_MOVE_PAD_THRESHOLD,
      right: rawX > MOBILE_MOVE_PAD_THRESHOLD,
    };
    const hasMovement = nextMovement.forward || nextMovement.back || nextMovement.left || nextMovement.right;

    event.preventDefault();
    event.stopPropagation();
    if (hasMovement) {
      markWorldActive();
      stopFollowing();
      if (queuedAvatarAction) {
        setQueuedAvatarAction(null);
        setPendingActionType(prev => prev === queuedAvatarAction.type ? null : prev);
        setWorldNavigationIntent(null);
      }
    }
    setMovement(nextMovement);
    setMobileMovePad({
      active: hasMovement,
      knobX,
      knobY,
    });
  }, [markWorldActive, queuedAvatarAction, stopFollowing]);

  const releaseMobileMovePad = React.useCallback((event?: React.PointerEvent<HTMLDivElement>) => {
    if (
      event &&
      mobileMovePointerIdRef.current !== null &&
      event.pointerId !== mobileMovePointerIdRef.current
    ) {
      return;
    }
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    mobileMovePointerIdRef.current = null;
    setMovement(EMPTY_MOVEMENT);
    setMobileMovePad({ active: false, knobX: 0, knobY: 0 });
  }, []);

  const handleMobileMovePadPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    mobileMovePointerIdRef.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some embedded browser surfaces do not allow capture; move/up events still work when delivered.
    }
    updateMobileMovePadFromPointer(event);
  }, [updateMobileMovePadFromPointer]);

  const handleMobileMovePadPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (mobileMovePointerIdRef.current !== event.pointerId) return;
    updateMobileMovePadFromPointer(event);
  }, [updateMobileMovePadFromPointer]);

  const showCameraGesture = React.useCallback((label: string) => {
    setCameraGestureLabel(label);
    if (cameraGestureTimerRef.current) window.clearTimeout(cameraGestureTimerRef.current);
    cameraGestureTimerRef.current = window.setTimeout(() => setCameraGestureLabel(''), 1400);
  }, []);

  React.useEffect(() => () => {
    if (cameraGestureTimerRef.current) window.clearTimeout(cameraGestureTimerRef.current);
  }, []);

  React.useEffect(() => {
    const markActive = () => markWorldActive();
    const checkIdle = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        setIsIdleAfk(true);
        return;
      }
      if (currentProfile.status === 'afk') {
        setIsIdleAfk(false);
        return;
      }
      setIsIdleAfk(Date.now() - lastWorldInputAtRef.current >= AUTO_AFK_AFTER_MS);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') markWorldActive();
      checkIdle();
    };

    window.addEventListener('pointerdown', markActive);
    window.addEventListener('keydown', markActive);
    window.addEventListener('wheel', markActive);
    window.addEventListener('touchstart', markActive);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    checkIdle();
    const interval = window.setInterval(checkIdle, AUTO_AFK_CHECK_MS);
    return () => {
      window.removeEventListener('pointerdown', markActive);
      window.removeEventListener('keydown', markActive);
      window.removeEventListener('wheel', markActive);
      window.removeEventListener('touchstart', markActive);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, [currentProfile.status, markWorldActive]);

  const handleWorldPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    markWorldActive();
    if (event.pointerType !== 'touch' || !(event.target instanceof HTMLCanvasElement)) return;

    const gesture = cameraGestureRef.current;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gesture.pointers.size < 2) return;

    const metrics = getCameraGestureMetrics(Array.from(gesture.pointers.values()));
    if (!metrics) return;

    gesture.lastDistance = metrics.distance;
    gesture.lastAngle = metrics.angle;
    gesture.isActive = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail on some embedded browser surfaces; gestures still work without it.
    }
    event.preventDefault();
    showCameraGesture('Pinch zoom / twist rotate');
  }, [markWorldActive, showCameraGesture]);

  const handleWorldPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;

    const gesture = cameraGestureRef.current;
    if (!gesture.pointers.has(event.pointerId)) return;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gesture.pointers.size < 2) return;

    const metrics = getCameraGestureMetrics(Array.from(gesture.pointers.values()));
    if (!metrics) return;

    event.preventDefault();
    if (gesture.lastDistance) {
      setZoom(value => clampCameraZoom(value * (gesture.lastDistance! / metrics.distance)));
    }
    if (gesture.lastAngle !== null) {
      const angleDelta = getNormalizedAngleDelta(metrics.angle, gesture.lastAngle);
      setRotation(value => value + angleDelta);
    }

    gesture.lastDistance = metrics.distance;
    gesture.lastAngle = metrics.angle;
    gesture.isActive = true;
  }, []);

  const handleWorldPointerEnd = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;

    const gesture = cameraGestureRef.current;
    gesture.pointers.delete(event.pointerId);
    if (gesture.pointers.size >= 2) {
      const metrics = getCameraGestureMetrics(Array.from(gesture.pointers.values()));
      gesture.lastDistance = metrics?.distance || null;
      gesture.lastAngle = metrics?.angle || null;
      return;
    }

    gesture.lastDistance = null;
    gesture.lastAngle = null;
    gesture.isActive = false;
  }, []);

  const handleWorldWheel = React.useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLCanvasElement)) return;

    markWorldActive();
    event.preventDefault();
    setZoom(value => clampCameraZoom(value + event.deltaY * CAMERA_WHEEL_ZOOM_STEP));
    showCameraGesture('Wheel zoom');
  }, [markWorldActive, showCameraGesture]);

  const loadWorldAchievements = React.useCallback(async () => {
    if (!user?.sub || !activeCircleId) return;
    try {
      const { achievements, title } = await worldAchievementsAPI.get();
      setWorldAchievements(achievements);
      setCharacterProfile(prev => prev ? { ...prev, title } : prev);
      setCharacterDraft(prev => ({ ...prev, title }));
    } catch (err) {
      console.warn('World achievements load failed:', err);
    }
  }, [activeCircleId, user?.sub]);

  const applyVoiceResponse = React.useCallback((response: { rooms: WorldVoiceRoom[]; myRooms: WorldVoiceRoom[]; room?: WorldVoiceRoom | null }) => {
    setWorldVoiceRooms(response.rooms);
    const nextActiveRoom = response.room || response.myRooms.find(room => room.id === activeVoiceRoomId) || response.myRooms[0] || null;
    setActiveVoiceRoomId(nextActiveRoom?.id || null);
    if (nextActiveRoom) {
      const selfMember = nextActiveRoom.members.find(member => member.userId === userId);
      if (selfMember) setIsVoiceMuted(selfMember.isMuted);
    }
  }, [activeVoiceRoomId, userId]);

  const loadWorldVoiceRooms = React.useCallback(async () => {
    if (!user?.sub || !activeCircleId) return;
    try {
      applyVoiceResponse(await worldVoiceAPI.get({
        currentLandId: activeLandScopeKey,
        currentZone,
        x: selfPosition.x,
        z: selfPosition.z,
      }));
    } catch (err) {
      console.warn('World voice load failed:', err);
    }
  }, [activeCircleId, activeLandScopeKey, applyVoiceResponse, currentZone, selfPosition.x, selfPosition.z, user?.sub]);

  const updateVoicePeerState = React.useCallback((peerId: string, patch: Partial<VoicePeerState>) => {
    setVoicePeerStates(prev => {
      const previous = prev[peerId] || {
        userId: peerId,
        connectionState: 'new',
        iceState: 'new',
        hasRemoteAudio: false,
        updatedAt: Date.now(),
      };

      return {
        ...prev,
        [peerId]: {
          ...previous,
          ...patch,
          userId: peerId,
          updatedAt: Date.now(),
        },
      };
    });
  }, []);

  const closeVoicePeerConnection = React.useCallback((peerId?: string) => {
    const closeOne = (id: string) => {
      voicePeerConnectionsRef.current.get(id)?.close();
      voicePeerConnectionsRef.current.delete(id);
      voicePendingIceRef.current.delete(id);
      voiceMakingOfferRef.current.delete(id);
      const audio = voiceRemoteAudioRef.current.get(id);
      if (audio) {
        audio.pause();
        audio.srcObject = null;
      }
      voiceRemoteAudioRef.current.delete(id);
    };

    if (peerId) {
      closeOne(peerId);
      setVoicePeerStates(prev => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
      return;
    }

    Array.from(voicePeerConnectionsRef.current.keys()).forEach(closeOne);
    setVoicePeerStates({});
  }, []);

  const flushPendingVoiceIce = React.useCallback(async (peerId: string, connection: RTCPeerConnection) => {
    const pending = voicePendingIceRef.current.get(peerId) || [];
    if (pending.length === 0 || !connection.remoteDescription) return;
    voicePendingIceRef.current.delete(peerId);
    for (const candidate of pending) {
      await connection.addIceCandidate(candidate);
    }
  }, []);

  const syncVoicePeerTracks = React.useCallback((connection: RTCPeerConnection) => {
    if (connection.signalingState === 'closed') return;
    const stream = voiceMediaStreamRef.current;
    const audioTrack = stream?.getAudioTracks()[0] || null;
    const audioTransceiver = connection.getTransceivers().find(transceiver => (
      transceiver.receiver.track.kind === 'audio' || transceiver.sender.track?.kind === 'audio'
    ));

    if (audioTrack && stream) {
      if (audioTransceiver) {
        void audioTransceiver.sender.replaceTrack(audioTrack).catch((err) => {
          console.warn('World voice audio track update failed:', err);
        });
      } else {
        connection.addTrack(audioTrack, stream);
      }
      return;
    }

    if (audioTransceiver) {
      void audioTransceiver.sender.replaceTrack(null).catch((err) => {
        console.warn('World voice audio track clear failed:', err);
      });
      return;
    }

    connection.addTransceiver('audio', { direction: 'recvonly' });
  }, []);

  const ensureVoicePeerConnection = React.useCallback((peerId: string, roomId: string) => {
    if (typeof RTCPeerConnection === 'undefined') {
      setVoiceSignalStatus(prev => ({
        ...prev,
        state: 'syncing',
        updatedAt: Date.now(),
      }));
      return null;
    }

    const existing = voicePeerConnectionsRef.current.get(peerId);
    if (existing && existing.signalingState !== 'closed') return existing;
    if (existing) closeVoicePeerConnection(peerId);

    const connection = new RTCPeerConnection(WORLD_VOICE_RTC_CONFIGURATION);
    voicePeerConnectionsRef.current.set(peerId, connection);
    updateVoicePeerState(peerId, {
      connectionState: connection.connectionState,
      iceState: connection.iceConnectionState,
      hasRemoteAudio: false,
    });

    connection.onicecandidate = (event) => {
      if (!event.candidate) return;
      void worldVoiceAPI.sendSignal({
        roomId,
        toUserId: peerId,
        kind: 'ice',
        payload: serializeRtcIceCandidate(event.candidate),
      }).catch((err) => {
        console.warn('World voice ICE send failed:', err);
      });
    };

    connection.ontrack = (event) => {
      if (typeof Audio === 'undefined') return;
      const stream = event.streams[0] || new MediaStream([event.track]);
      const audio = voiceRemoteAudioRef.current.get(peerId) || new Audio();
      audio.autoplay = true;
      audio.srcObject = stream;
      voiceRemoteAudioRef.current.set(peerId, audio);
      void audio.play().catch(() => {});
      updateVoicePeerState(peerId, { hasRemoteAudio: true });
    };

    connection.onconnectionstatechange = () => {
      updateVoicePeerState(peerId, { connectionState: connection.connectionState });
      if (connection.connectionState === 'failed' || connection.connectionState === 'closed') {
        closeVoicePeerConnection(peerId);
      }
    };

    connection.oniceconnectionstatechange = () => {
      updateVoicePeerState(peerId, { iceState: connection.iceConnectionState });
    };

    syncVoicePeerTracks(connection);
    return connection;
  }, [closeVoicePeerConnection, syncVoicePeerTracks, updateVoicePeerState]);

  const makeVoiceOffer = React.useCallback(async (peerId: string, roomId: string) => {
    const connection = ensureVoicePeerConnection(peerId, roomId);
    if (!connection || connection.signalingState !== 'stable' || voiceMakingOfferRef.current.has(peerId)) return;

    voiceMakingOfferRef.current.add(peerId);
    try {
      syncVoicePeerTracks(connection);
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await worldVoiceAPI.sendSignal({
        roomId,
        toUserId: peerId,
        kind: 'offer',
        payload: serializeRtcSessionDescription(connection.localDescription),
      });
    } catch (err) {
      console.warn('World voice offer failed:', err);
    } finally {
      voiceMakingOfferRef.current.delete(peerId);
    }
  }, [ensureVoicePeerConnection, syncVoicePeerTracks]);

  const handleVoiceSignalMessages = React.useCallback(async (signals: WorldVoiceSignalMessage[]) => {
    const freshSignals = signals.filter((signal) => {
      if (processedVoiceSignalIdsRef.current.has(signal.id)) return false;
      processedVoiceSignalIdsRef.current.add(signal.id);
      return true;
    });
    if (processedVoiceSignalIdsRef.current.size > 800) {
      processedVoiceSignalIdsRef.current = new Set(Array.from(processedVoiceSignalIdsRef.current).slice(-400));
    }

    for (const signal of freshSignals) {
      if (signal.fromUserId === userId) continue;
      const peerId = signal.fromUserId;
      const connection = ensureVoicePeerConnection(peerId, signal.roomId);
      if (!connection) continue;

      try {
        if (signal.kind === 'leave') {
          closeVoicePeerConnection(peerId);
          continue;
        }

        if (signal.kind === 'renegotiate') {
          syncVoicePeerTracks(connection);
          if (userId < peerId) await makeVoiceOffer(peerId, signal.roomId);
          continue;
        }

        if (signal.kind === 'ice') {
          const candidate = toRtcIceCandidate(signal.payload);
          if (!candidate) continue;
          if (!connection.remoteDescription) {
            voicePendingIceRef.current.set(peerId, [
              ...(voicePendingIceRef.current.get(peerId) || []),
              candidate,
            ]);
            continue;
          }
          await connection.addIceCandidate(candidate);
          continue;
        }

        const description = toRtcSessionDescription(signal.payload);
        if (!description) continue;

        if (description.type === 'offer') {
          const offerCollision = connection.signalingState !== 'stable';
          if (offerCollision && userId < peerId) continue;
          await connection.setRemoteDescription(description);
          await flushPendingVoiceIce(peerId, connection);
          syncVoicePeerTracks(connection);
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          await worldVoiceAPI.sendSignal({
            roomId: signal.roomId,
            toUserId: peerId,
            kind: 'answer',
            payload: serializeRtcSessionDescription(connection.localDescription),
          });
          continue;
        }

        if (description.type === 'answer' && connection.signalingState === 'have-local-offer') {
          await connection.setRemoteDescription(description);
          await flushPendingVoiceIce(peerId, connection);
        }
      } catch (err) {
        console.warn('World voice signal handling failed:', err);
      }
    }
  }, [closeVoicePeerConnection, ensureVoicePeerConnection, flushPendingVoiceIce, makeVoiceOffer, syncVoicePeerTracks, userId]);

  React.useEffect(() => {
    if (!activeVoiceRoom) {
      closeVoicePeerConnection();
      voicePeerRoomRef.current = null;
      processedVoiceSignalIdsRef.current.clear();
      return;
    }

    const roomId = activeVoiceRoom.id;
    if (voicePeerRoomRef.current !== roomId) {
      closeVoicePeerConnection();
      voicePeerRoomRef.current = roomId;
      processedVoiceSignalIdsRef.current.clear();
    }

    const desiredPeerIds = new Set(activeVoicePeerIds);
    Array.from(voicePeerConnectionsRef.current.keys())
      .filter(peerId => !desiredPeerIds.has(peerId))
      .forEach(peerId => closeVoicePeerConnection(peerId));

    activeVoicePeerIds.forEach((peerId) => {
      const connection = ensureVoicePeerConnection(peerId, roomId);
      if (!connection) return;
      syncVoicePeerTracks(connection);
      if (userId < peerId) void makeVoiceOffer(peerId, roomId);
    });
  }, [activeVoicePeerIds, activeVoiceRoom, closeVoicePeerConnection, ensureVoicePeerConnection, makeVoiceOffer, syncVoicePeerTracks, userId, voiceMediaStatus]);

  React.useEffect(() => () => {
    closeVoicePeerConnection();
  }, [closeVoicePeerConnection]);

  React.useEffect(() => {
    const updateCycle = () => setWorldCycle(getWorldCycle(Date.now(), activeCircleId));
    updateCycle();
    const interval = window.setInterval(updateCycle, 2000);
    return () => window.clearInterval(interval);
  }, [activeCircleId]);

  React.useEffect(() => {
    const onCameraKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();
      let handled = true;

      if (key === 'q') {
        setRotation(value => value - CAMERA_KEY_ROTATION_STEP);
        showCameraGesture('Camera left');
      } else if (key === 'e') {
        setRotation(value => value + CAMERA_KEY_ROTATION_STEP);
        showCameraGesture('Camera right');
      } else if (key === '=' || key === '+') {
        setZoom(value => clampCameraZoom(value - CAMERA_KEY_ZOOM_STEP));
        showCameraGesture('Zoom in');
      } else if (key === '-' || key === '_') {
        setZoom(value => clampCameraZoom(value + CAMERA_KEY_ZOOM_STEP));
        showCameraGesture('Zoom out');
      } else if (key === 'c') {
        const nextMode = cameraMode === 'isometric' ? 'third' : 'isometric';
        setCameraMode(nextMode);
        showCameraGesture(nextMode === 'third' ? 'Third camera' : 'Isometric camera');
      } else if (key === '0') {
        setRotation(0);
        setZoom(1);
        showCameraGesture('Camera reset');
      } else {
        handled = false;
      }

      if (!handled) return;
      event.preventDefault();
      markWorldActive();
    };

    window.addEventListener('keydown', onCameraKeyDown);
    return () => window.removeEventListener('keydown', onCameraKeyDown);
  }, [cameraMode, markWorldActive, showCameraGesture]);

  React.useEffect(() => {
    const keyMap: Record<string, keyof MovementInput> = {
      w: 'forward',
      arrowup: 'forward',
      s: 'back',
      arrowdown: 'back',
      a: 'left',
      arrowleft: 'left',
      d: 'right',
      arrowright: 'right',
    };

    const setKey = (event: KeyboardEvent, pressed: boolean) => {
      const movementKey = keyMap[event.key.toLowerCase()];
      if (!movementKey) return;
      if (isEditableKeyboardTarget(event.target)) {
        if (!pressed) {
          setMovement(prev => prev[movementKey] ? { ...prev, [movementKey]: false } : prev);
        }
        return;
      }
      event.preventDefault();
      pressMovement(movementKey, pressed);
    };

    const onKeyDown = (event: KeyboardEvent) => setKey(event, true);
    const onKeyUp = (event: KeyboardEvent) => setKey(event, false);
    const releaseMovement = () => {
      mobileMovePointerIdRef.current = null;
      setMovement(EMPTY_MOVEMENT);
      setMobileMovePad({ active: false, knobX: 0, knobY: 0 });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseMovement);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseMovement);
    };
  }, [pressMovement]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId) return;
    let cancelled = false;
    const fallbackSpawn = getSafeSpawnPosition(DEFAULT_POSITION, landObjectsRef.current);

    setMovement(EMPTY_MOVEMENT);
    setMobileMovePad({ active: false, knobX: 0, knobY: 0 });
    setSelectedPresence(null);
    setSelectedActivityFeed(null);
    setIsSelectedDirectChatOpen(false);
    setActiveFollowTargetId(null);
    setSelectedNpc(null);
    setSelectedDistrict(null);
    setSelectedPortal(null);
    setSelectedLandObject(null);
    setWorldNavigationIntent(null);
    setWorldSpawnReadyKey('');
    setSpawnPosition(fallbackSpawn);
    setSelfPosition(fallbackSpawn);
    heartbeatRef.current = createPresenceSample(fallbackSpawn);
    setActiveDistrictId(COMMONS_DISTRICT.id);
    setSpawnRevision(prev => prev + 1);

    characterAPI.get()
      .then(({ profile }) => {
        if (cancelled) return;
        const spawn = getProfileLandSpawnPosition(profile, activeLandScopeKey, activeLandName, landObjectsRef.current);
        setCharacterProfile(profile);
        setCharacterDraft({
          displayName: profile.displayName,
          title: profile.title,
          activity: profile.activity,
          modelUrl: profile.modelUrl || '',
        });
        setSpawnPosition(spawn);
        setSelfPosition(spawn);
        heartbeatRef.current = createPresenceSample(spawn);
        setActiveDistrictId(getDistrictForPosition(spawn).id);
        setSpawnRevision(prev => prev + 1);
        setWorldSpawnReadyKey(activeLandScopeKey);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('Character profile load failed:', err);
        setWorldSpawnReadyKey(activeLandScopeKey);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCircleId, activeLandName, activeLandScopeKey, user?.sub]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId) return;
    let cancelled = false;

    const loadAchievements = async () => {
      if (cancelled) return;
      await loadWorldAchievements();
    };

    loadAchievements();
    const interval = window.setInterval(loadAchievements, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeCircleId, loadWorldAchievements, user?.sub]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId) return;
    let cancelled = false;

    const loadVoice = async () => {
      if (!cancelled) await loadWorldVoiceRooms();
    };

    loadVoice();
    const interval = window.setInterval(loadVoice, 7000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeCircleId, loadWorldVoiceRooms, user?.sub]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId || !activeVoiceRoom) {
      voiceSignalCursorRef.current = 0;
      voiceSignalRoomRef.current = null;
      voiceSignalAnnounceKeyRef.current = '';
      processedVoiceSignalIdsRef.current.clear();
      setVoiceSignalStatus({ state: 'idle', peers: 0, received: 0 });
      return;
    }

    const roomId = activeVoiceRoom.id;
    if (voiceSignalRoomRef.current !== roomId) {
      voiceSignalRoomRef.current = roomId;
      voiceSignalCursorRef.current = 0;
      voiceSignalAnnounceKeyRef.current = '';
      processedVoiceSignalIdsRef.current.clear();
    }

    let cancelled = false;
    const loadSignals = async () => {
      try {
        const response = await worldVoiceAPI.signals(roomId, voiceSignalCursorRef.current, 40);
        if (cancelled) return;
        if (response.signals.length > 0) {
          await handleVoiceSignalMessages(response.signals);
        }
        if (cancelled) return;
        voiceSignalCursorRef.current = response.cursor;
        setVoiceSignalStatus(prev => ({
          state: 'listening',
          peers: activeVoicePeerIds.length,
          received: prev.received + response.signals.length,
          updatedAt: Date.now(),
        }));
      } catch (err) {
        if (!cancelled) {
          console.warn('World voice signal poll failed:', err);
          setVoiceSignalStatus(prev => ({
            ...prev,
            state: 'syncing',
            peers: activeVoicePeerIds.length,
            updatedAt: Date.now(),
          }));
        }
      }
    };

    void loadSignals();
    const interval = window.setInterval(loadSignals, 1800);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeCircleId, activeVoicePeerIds.length, activeVoiceRoom, handleVoiceSignalMessages, user?.sub]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId || !activeVoiceRoom || activeVoicePeerIds.length === 0) return;
    if (voiceMediaStatus === 'idle' || voiceMediaStatus === 'requesting') return;

    const announceKey = `${activeVoiceRoom.id}:${activeVoicePeerKey}:${voiceMediaStatus}:${isVoiceMuted}:${currentZone}`;
    if (voiceSignalAnnounceKeyRef.current === announceKey) return;
    voiceSignalAnnounceKeyRef.current = announceKey;

    activeVoicePeerIds.forEach((toUserId) => {
      void worldVoiceAPI.sendSignal({
        roomId: activeVoiceRoom.id,
        toUserId,
        kind: 'renegotiate',
        payload: {
          media: 'audio',
          mediaStatus: voiceMediaStatus,
          muted: isVoiceMuted,
          currentZone,
        },
      }).catch((err) => {
        console.warn('World voice signal announce failed:', err);
      });
    });
  }, [activeCircleId, activeVoicePeerIds, activeVoicePeerKey, activeVoiceRoom, currentZone, isVoiceMuted, user?.sub, voiceMediaStatus]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId) return;
    let cancelled = false;

    worldInventoryAPI.get()
      .then(({ profile, inventory, catalog, stats }) => {
        if (cancelled) return;
        setCharacterProfile(profile);
        setWorldInventory(inventory);
        setWorldMarketCatalog(catalog);
        setWorldMarketStats(stats);
      })
      .catch((err) => console.warn('World inventory load failed:', err));

    return () => {
      cancelled = true;
    };
  }, [activeCircleId, user?.sub]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId) return;
    let cancelled = false;

    const loadRelationships = async () => {
      try {
        const { relationships } = await worldRelationshipsAPI.list();
        if (!cancelled) setWorldRelationships(relationships);
      } catch (err) {
        if (!cancelled) console.warn('World relationships load failed:', err);
      }
    };

    loadRelationships();
    const interval = window.setInterval(loadRelationships, 9000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeCircleId, user?.sub]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId) return;
    let cancelled = false;

    const loadRequests = async () => {
      try {
        const { requests } = await worldRequestsAPI.list(24, { currentLandId: activeLandScopeKey });
        if (!cancelled) setWorldRequests(requests);
      } catch (err) {
        if (!cancelled) console.warn('World requests load failed:', err);
      }
    };

    loadRequests();
    const interval = window.setInterval(loadRequests, 6000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeCircleId, activeLandScopeKey, user?.sub]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId) return;
    let cancelled = false;

    worldGuildAPI.get({ currentLandId: activeLandScopeKey })
      .then(({ guild }) => {
        if (!cancelled) setWorldGuild(guild);
      })
      .catch((err) => console.warn('World guild load failed:', err));

    return () => {
      cancelled = true;
    };
  }, [activeCircleId, activeLandScopeKey, user?.sub]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId) return;
    let cancelled = false;

    worldPartyAPI.get({ currentLandId: activeLandScopeKey })
      .then(({ party }) => {
        if (!cancelled) setWorldParty(party);
      })
      .catch((err) => console.warn('World party load failed:', err));

    return () => {
      cancelled = true;
    };
  }, [activeCircleId, activeLandScopeKey, user?.sub]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId) return;
    let cancelled = false;

    worldEventsAPI.get({
      currentLandId: activeLandScopeKey,
      currentZone,
    })
      .then(({ event }) => {
        if (!cancelled) setWorldEvent(event);
      })
      .catch((err) => console.warn('World event load failed:', err));

    return () => {
      cancelled = true;
    };
  }, [activeCircleId, activeLandScopeKey, currentZone, user?.sub]);

  const saveCharacterProfile = React.useCallback(async (
    patch: Partial<CharacterProfile>,
    options: { forceManualPresence?: boolean } = {},
  ) => {
    const optimistic: CharacterProfile = {
      ...currentProfile,
      ...patch,
      appearance: patch.appearance ? { ...currentProfile.appearance, ...patch.appearance } : currentProfile.appearance,
      equipment: patch.equipment ? { ...currentProfile.equipment, ...patch.equipment } : currentProfile.equipment,
      cosmetics: patch.cosmetics ? { ...currentProfile.cosmetics, ...patch.cosmetics } : currentProfile.cosmetics,
    };

    setCharacterProfile(optimistic);
    setIsSavingCharacter(true);
    void sendPresenceHeartbeatNow(optimistic, { forceManualPresence: options.forceManualPresence })
      .catch((err) => console.warn('Immediate presence heartbeat failed:', err));
    try {
      const { profile } = await characterAPI.update(patch);
      setCharacterProfile(profile);
      setCharacterDraft({
        displayName: profile.displayName,
        title: profile.title,
        activity: profile.activity,
        modelUrl: profile.modelUrl || '',
      });
      if (patch.activity || patch.status) {
        setQuickActivityPulse(createActivityPulse(
          patch.activity || profile.activity,
          patch.status || profile.status
        ));
      }
      void sendPresenceHeartbeatNow(profile, { forceManualPresence: options.forceManualPresence })
        .catch((err) => console.warn('Immediate presence heartbeat refresh failed:', err));
      return true;
    } catch (err) {
      console.warn('Character profile save failed:', err);
      setWorldToast('Character save failed');
      return false;
    } finally {
      setIsSavingCharacter(false);
    }
  }, [currentProfile, sendPresenceHeartbeatNow]);

  const updateQuickPresence = React.useCallback(async (patch: Partial<CharacterProfile>, successMessage: string) => {
    const saved = await saveCharacterProfile(patch, { forceManualPresence: true });
    if (!saved) return;

    if (patch.emote) {
      setQuickEmotePulse({ emote: patch.emote, createdAt: Date.now() });
    }

    setWorldToast(successMessage);
  }, [saveCharacterProfile]);

  const runEmoteAction = React.useCallback((emote: string) => {
    const meta = getEmoteMeta(emote);
    markWorldActive();
    setAutoZonePresenceEnabled(false);
    setIsEmoteWheelOpen(false);
    void updateQuickPresence({ emote }, `${meta.label} emote`);
  }, [markWorldActive, updateQuickPresence]);

  const equipInventoryItem = React.useCallback(async (slot: WorldInventorySlot, itemKey?: string) => {
    setIsEquippingItem(`${slot}:${itemKey || 'none'}`);
    try {
      const response = itemKey
        ? await worldInventoryAPI.equip(slot, itemKey)
        : await worldInventoryAPI.unequip(slot);
      setCharacterProfile(response.profile);
      setWorldInventory(response.inventory);
      setWorldMarketCatalog(response.catalog);
      setWorldMarketStats(response.stats);
      setWorldToast(itemKey ? 'Equipment updated' : `${slot} slot cleared`);
    } catch (err) {
      console.warn('World inventory equip failed:', err);
      setWorldToast('Equipment update failed');
    } finally {
      setIsEquippingItem(null);
    }
  }, []);

  const purchaseMarketItem = React.useCallback(async (item: WorldInventoryCatalogItem) => {
    if (!user?.sub || !activeCircleId) {
      setWorldToast('Sign in to buy market gear');
      return;
    }

    setIsPurchasingItem(item.itemKey);
    try {
      const response = await worldInventoryAPI.purchase(item.itemKey);
      setCharacterProfile(response.profile);
      setWorldInventory(response.inventory);
      setWorldMarketCatalog(response.catalog);
      setWorldMarketStats(response.stats);
      await loadWorldAchievements();
      setWorldToast(item.isOwned ? `${item.name} equipped` : `${item.name} added to inventory`);
    } catch (err) {
      console.warn('World market purchase failed:', err);
      setWorldToast(err instanceof Error ? err.message : 'Market purchase failed');
    } finally {
      setIsPurchasingItem(null);
    }
  }, [activeCircleId, loadWorldAchievements, user?.sub]);

  const equipAchievementTitle = React.useCallback(async (achievement: WorldAchievement) => {
    if (!achievement.titleReward || achievement.isTitleEquipped) return;
    setIsEquippingTitle(achievement.achievementKey);
    try {
      const { achievements, title } = await worldAchievementsAPI.equipTitle(achievement.achievementKey);
      setWorldAchievements(achievements);
      setCharacterProfile(prev => prev ? { ...prev, title } : prev);
      setCharacterDraft(prev => ({ ...prev, title }));
      setWorldToast(`${title} title equipped`);
    } catch (err) {
      console.warn('Achievement title equip failed:', err);
      setWorldToast('Title update failed');
    } finally {
      setIsEquippingTitle(null);
    }
  }, []);

  const stopVoiceMeter = React.useCallback(() => {
    if (voiceMeterFrameRef.current !== null) {
      window.cancelAnimationFrame(voiceMeterFrameRef.current);
      voiceMeterFrameRef.current = null;
    }
    voiceSourceRef.current?.disconnect();
    voiceSourceRef.current = null;
    voiceAnalyserRef.current?.disconnect();
    voiceAnalyserRef.current = null;
    void voiceAudioContextRef.current?.close().catch(() => {});
    voiceAudioContextRef.current = null;
    setVoiceInputLevel(0);
  }, []);

  const startVoiceMeter = React.useCallback((stream: MediaStream) => {
    stopVoiceMeter();
    if (typeof window === 'undefined') return;

    const AudioContextConstructor = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    try {
      const audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      const samples = new Uint8Array(analyser.fftSize);
      source.connect(analyser);
      voiceAudioContextRef.current = audioContext;
      voiceAnalyserRef.current = analyser;
      voiceSourceRef.current = source;

      void audioContext.resume().catch(() => {});

      const readLevel = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (let index = 0; index < samples.length; index += 1) {
          const normalized = (samples[index] - 128) / 128;
          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / samples.length);
        const level = THREE.MathUtils.clamp(rms * 4.6, 0, 1);
        setVoiceInputLevel(previous => Math.abs(previous - level) > 0.018 ? level : previous);
        voiceMeterFrameRef.current = window.requestAnimationFrame(readLevel);
      };

      readLevel();
    } catch (err) {
      console.warn('Voice meter unavailable:', err);
      stopVoiceMeter();
    }
  }, [stopVoiceMeter]);

  const setVoiceTrackEnabled = React.useCallback((enabled: boolean) => {
    voiceMediaStreamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
    if (!enabled) setVoiceInputLevel(0);
  }, []);

  const stopVoiceMedia = React.useCallback(() => {
    stopVoiceMeter();
    voiceMediaStreamRef.current?.getTracks().forEach(track => track.stop());
    voiceMediaStreamRef.current = null;
    setVoiceMediaStatus('idle');
    setVoiceMediaError('');
  }, [stopVoiceMeter]);

  const ensureVoiceMedia = React.useCallback(async (muted: boolean) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setVoiceMediaStatus('unsupported');
      setVoiceMediaError('Microphone is not available in this browser.');
      setIsVoiceMuted(true);
      return false;
    }

    if (voiceMediaStreamRef.current) {
      setVoiceTrackEnabled(!muted);
      if (!voiceAnalyserRef.current) startVoiceMeter(voiceMediaStreamRef.current);
      setVoiceMediaStatus('ready');
      setVoiceMediaError('');
      return true;
    }

    setVoiceMediaStatus('requesting');
    setVoiceMediaError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      voiceMediaStreamRef.current = stream;
      stream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
      startVoiceMeter(stream);
      setVoiceMediaStatus('ready');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Microphone permission was blocked.';
      voiceMediaStreamRef.current = null;
      setVoiceMediaStatus('blocked');
      setVoiceMediaError(message);
      setIsVoiceMuted(true);
      setWorldToast('Microphone unavailable; joined voice muted');
      return false;
    }
  }, [setVoiceTrackEnabled, startVoiceMeter]);

  const joinVoiceRoom = React.useCallback(async (
    kind: WorldVoiceKind,
    target?: { userId: string; name: string },
    zoneOverride?: string,
    options: { silent?: boolean; openPanel?: boolean } = {}
  ) => {
    if (!user?.sub || !activeCircleId) {
      setWorldToast('Sign in to join voice');
      return;
    }

    const voiceZone = zoneOverride || currentZone;
    const voicePosition = heartbeatRef.current.position || selfPosition;
    setIsVoiceUpdating(`${kind}:${target?.userId || voiceZone}`);
    try {
      const micReady = await ensureVoiceMedia(isVoiceMuted);
      const joinMuted = isVoiceMuted || !micReady;
      const response = await worldVoiceAPI.join({
        kind,
        targetUserId: target?.userId,
        targetName: target?.name,
        currentLandId: activeLandScopeKey,
        currentZone: voiceZone,
        x: voicePosition.x,
        z: voicePosition.z,
        isMuted: joinMuted,
      });
      if (joinMuted) {
        setIsVoiceMuted(true);
        setVoiceTrackEnabled(false);
      }
      applyVoiceResponse(response);
      if (!options.silent) {
        if (options.openPanel ?? true) setIsVoicePanelOpen(true);
        setWorldToast(response.room ? `Joined ${response.room.name}` : 'Voice room joined');
      }
    } catch (err) {
      console.warn('World voice join failed:', err);
      if (!options.silent) setWorldToast(err instanceof Error ? err.message : 'Voice join failed');
    } finally {
      setIsVoiceUpdating(null);
    }
  }, [activeCircleId, activeLandScopeKey, applyVoiceResponse, currentZone, ensureVoiceMedia, isVoiceMuted, selfPosition, setVoiceTrackEnabled, user?.sub]);

  const joinNearbyVoiceFromNudge = React.useCallback(async () => {
    if (!nearbyVoiceNudge) return;
    markWorldActive();
    setDismissedProximityVoiceKey(nearbyVoiceNudge.key);
    await joinVoiceRoom('proximity');
  }, [joinVoiceRoom, markWorldActive, nearbyVoiceNudge]);

  React.useEffect(() => {
    if (!activeVoiceRoom || activeVoiceRoom.kind !== 'proximity') return;
    if (!user?.sub || !activeCircleId) return;
    if (isVoiceUpdating?.startsWith('proximity:')) return;

    const roomZone = typeof activeVoiceRoom.metadata?.currentZone === 'string'
      ? activeVoiceRoom.metadata.currentZone
      : '';
    const distance = getProximityVoiceRoomDistance(activeVoiceRoom, selfPosition);
    const shouldRetune = Boolean(
      (roomZone && roomZone !== currentZone) ||
      distance > PROXIMITY_VOICE_RANGE * 0.86
    );
    if (!shouldRetune) return;

    const now = Date.now();
    if (now - proximityVoiceRetuneAtRef.current < 3200) return;
    proximityVoiceRetuneAtRef.current = now;
    void joinVoiceRoom('proximity', undefined, currentZone, { silent: true });
  }, [activeCircleId, activeVoiceRoom, currentZone, isVoiceUpdating, joinVoiceRoom, selfPosition, user?.sub]);

  const leaveVoiceRoom = React.useCallback(async (roomId?: string) => {
    setIsVoiceUpdating(`leave:${roomId || 'all'}`);
    try {
      const voicePosition = heartbeatRef.current.position || selfPosition;
      const response = await worldVoiceAPI.leave(roomId, {
        currentLandId: activeLandScopeKey,
        currentZone,
        x: voicePosition.x,
        z: voicePosition.z,
      });
      applyVoiceResponse(response);
      if (response.myRooms.length === 0) stopVoiceMedia();
      setWorldToast('Left voice');
    } catch (err) {
      console.warn('World voice leave failed:', err);
      setWorldToast('Voice leave failed');
    } finally {
      setIsVoiceUpdating(null);
    }
  }, [activeLandScopeKey, applyVoiceResponse, currentZone, selfPosition, stopVoiceMedia]);

  const toggleVoiceMute = React.useCallback(async () => {
    if (!activeVoiceRoom) {
      const nextMuted = !isVoiceMuted;
      if (!nextMuted) {
        const micReady = await ensureVoiceMedia(false);
        if (!micReady) return;
      }
      setIsVoiceMuted(nextMuted);
      setVoiceTrackEnabled(!nextMuted);
      return;
    }

    const nextMuted = !isVoiceMuted;
    if (!nextMuted) {
      const micReady = await ensureVoiceMedia(false);
      if (!micReady) {
        try {
          const voicePosition = heartbeatRef.current.position || selfPosition;
          applyVoiceResponse(await worldVoiceAPI.mute(activeVoiceRoom.id, true, {
            currentLandId: activeLandScopeKey,
            currentZone,
            x: voicePosition.x,
            z: voicePosition.z,
          }));
        } catch (err) {
          console.warn('World voice mute correction failed:', err);
        }
        return;
      }
    }

    setIsVoiceMuted(nextMuted);
    setVoiceTrackEnabled(!nextMuted);
    setIsVoiceUpdating(`mute:${activeVoiceRoom.id}`);
    try {
      const voicePosition = heartbeatRef.current.position || selfPosition;
      applyVoiceResponse(await worldVoiceAPI.mute(activeVoiceRoom.id, nextMuted, {
        currentLandId: activeLandScopeKey,
        currentZone,
        x: voicePosition.x,
        z: voicePosition.z,
      }));
      setWorldToast(nextMuted ? 'Mic muted' : 'Mic open');
    } catch (err) {
      console.warn('World voice mute failed:', err);
      setWorldToast('Mic update failed');
    } finally {
      setIsVoiceUpdating(null);
    }
  }, [activeLandScopeKey, activeVoiceRoom, applyVoiceResponse, currentZone, ensureVoiceMedia, isVoiceMuted, selfPosition, setVoiceTrackEnabled]);

  React.useEffect(() => {
    setVoiceTrackEnabled(!isVoiceMuted);
  }, [isVoiceMuted, setVoiceTrackEnabled]);

  React.useEffect(() => {
    if (activeVoiceRoom || myVoiceRooms.length > 0 || !voiceMediaStreamRef.current) return;
    stopVoiceMedia();
  }, [activeVoiceRoom, myVoiceRooms.length, stopVoiceMedia]);

  React.useEffect(() => () => {
    stopVoiceMedia();
  }, [stopVoiceMedia]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId || typeof window === 'undefined') return;
    const circleId = activeCircleId;
    let hasSentLeave = false;

    const leaveWorld = () => {
      if (hasSentLeave) return;
      hasSentLeave = true;
      void presenceAPI.leave({
        circleId,
        keepalive: true,
        currentLandId: activeLandScopeKey,
        currentZone,
      }).catch((err) => {
        console.warn('World leave failed:', err);
      });
    };

    window.addEventListener('pagehide', leaveWorld);
    return () => {
      window.removeEventListener('pagehide', leaveWorld);
      leaveWorld();
    };
  }, [activeCircleId, activeLandScopeKey, currentZone, user?.sub]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId || worldSpawnReadyKey !== activeLandScopeKey) return;
    let cancelled = false;

    const sendHeartbeat = async () => {
      try {
        await sendPresenceHeartbeatNow();
      } catch (err) {
        if (!cancelled) console.warn('World heartbeat failed:', err);
      }
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 1200);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeCircleId, activeLandScopeKey, sendPresenceHeartbeatNow, user?.sub, worldSpawnReadyKey]);

  const markWorldStreamFresh = React.useCallback(() => {
    const now = Date.now();
    worldStreamLastSeenAtRef.current = now;
    setWorldStreamLastSeenAt(now);
    setWorldStreamNow(now);
    setIsWorldStreamConnected(true);
  }, []);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setWorldStreamNow(now);
      if (!worldStreamLastSeenAtRef.current) return;
      if (now - worldStreamLastSeenAtRef.current > WORLD_STREAM_STALE_AFTER_MS) {
        setIsWorldStreamConnected(false);
      }
    }, WORLD_STREAM_STATUS_TICK_MS);

    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId || typeof EventSource === 'undefined') return;
    let cancelled = false;
    const source = new EventSource(worldStreamAPI.url({
      presenceLimit: 22,
      actionLimit: 12,
      chatLimit: 18,
      ...worldInterest,
    }), { withCredentials: true });

    const markConnected = () => {
      if (!cancelled) markWorldStreamFresh();
    };

    const handleSnapshot = (event: MessageEvent) => {
      try {
        const snapshot = JSON.parse(event.data) as WorldSnapshot;
        if (!cancelled) {
          applyWorldSnapshot(snapshot);
          markWorldStreamFresh();
        }
      } catch (err) {
        console.warn('World stream snapshot parse failed:', err);
      }
    };

    const handlePresence = (event: MessageEvent) => {
      try {
        const delta = JSON.parse(event.data) as WorldPresenceDelta;
        if (!cancelled) {
          applyPresenceDelta(delta);
          markWorldStreamFresh();
        }
      } catch (err) {
        console.warn('World stream presence parse failed:', err);
      }
    };

    const handleAction = (event: MessageEvent) => {
      try {
        const delta = JSON.parse(event.data) as WorldActionDelta;
        if (!cancelled) {
          applyActionDelta(delta);
          markWorldStreamFresh();
        }
      } catch (err) {
        console.warn('World stream action parse failed:', err);
      }
    };

    const handleChat = (event: MessageEvent) => {
      try {
        const delta = JSON.parse(event.data) as WorldChatDelta;
        if (!cancelled) {
          applyChatDelta(delta);
          markWorldStreamFresh();
        }
      } catch (err) {
        console.warn('World stream chat parse failed:', err);
      }
    };

    const handleVoice = (event: MessageEvent) => {
      try {
        const delta = JSON.parse(event.data) as WorldVoiceDelta;
        if (!cancelled) {
          applyVoiceDelta(delta);
          markWorldStreamFresh();
        }
      } catch (err) {
        console.warn('World stream voice parse failed:', err);
      }
    };

    const handleVoiceSignal = (event: MessageEvent) => {
      try {
        const delta = JSON.parse(event.data) as WorldVoiceSignalDelta;
        if (!cancelled) {
          voiceSignalCursorRef.current = Math.max(voiceSignalCursorRef.current, delta.cursor);
          void handleVoiceSignalMessages(delta.signals);
          setVoiceSignalStatus(prev => ({
            state: 'listening',
            peers: prev.peers,
            received: prev.received + delta.signals.length,
            updatedAt: Date.now(),
          }));
          markWorldStreamFresh();
        }
      } catch (err) {
        console.warn('World stream voice signal parse failed:', err);
      }
    };

    const handleSocialState = (event: MessageEvent) => {
      try {
        const delta = JSON.parse(event.data) as WorldSocialStateDelta;
        if (!cancelled) {
          applySocialStateDelta(delta);
          markWorldStreamFresh();
        }
      } catch (err) {
        console.warn('World stream social state parse failed:', err);
      }
    };

    source.addEventListener('open', markConnected);
    source.addEventListener('ready', markConnected);
    source.addEventListener('ping', markConnected);
    source.addEventListener('presence', handlePresence);
    source.addEventListener('action', handleAction);
    source.addEventListener('chat', handleChat);
    source.addEventListener('voice', handleVoice);
    source.addEventListener('voice-signal', handleVoiceSignal);
    source.addEventListener('social-state', handleSocialState);
    source.addEventListener('snapshot', handleSnapshot);
    source.addEventListener('stream-error', (event) => {
      if (!cancelled) console.warn('World stream server error:', (event as MessageEvent).data);
    });
    source.onerror = () => {
      if (!cancelled) setIsWorldStreamConnected(false);
    };

    return () => {
      cancelled = true;
      source.close();
      setIsWorldStreamConnected(false);
    };
  }, [activeCircleId, applyActionDelta, applyChatDelta, applyPresenceDelta, applySocialStateDelta, applyVoiceDelta, applyWorldSnapshot, handleVoiceSignalMessages, markWorldStreamFresh, user?.sub, worldInterest]);

  React.useEffect(() => {
    if (!user?.sub || !activeCircleId || isWorldStreamConnected) return;
    let cancelled = false;

    const loadFallbackSnapshot = async () => {
      try {
        const [
          presenceResponse,
          actionResponse,
          chatResponse,
          eventResponse,
          guildResponse,
          partyResponse,
          requestResponse,
          relationshipResponse,
          voiceResponse,
          inventoryResponse,
          achievementResponse,
        ] = await Promise.all([
          presenceAPI.list(worldInterest),
          worldActionsAPI.list(12, worldInterest),
          worldChatAPI.list(18, worldInterest),
          worldEventsAPI.get({
            currentLandId: activeLandScopeKey,
            currentZone,
          }),
          worldGuildAPI.get({ currentLandId: activeLandScopeKey }),
          worldPartyAPI.get({ currentLandId: activeLandScopeKey }),
          worldRequestsAPI.list(24, { currentLandId: activeLandScopeKey }),
          worldRelationshipsAPI.list(),
          worldVoiceAPI.get({
            currentLandId: activeLandScopeKey,
            currentZone,
            x: selfPosition.x,
            z: selfPosition.z,
          }),
          worldInventoryAPI.get(),
          worldAchievementsAPI.get(),
        ]);
        if (!cancelled) {
          setPresences(presenceResponse.presences);
          setWorldInterestStats(presenceResponse.interest || null);
          setWorldActions(actionResponse.actions);
          setWorldChatMessages(chatResponse.messages);
          setWorldEvent(eventResponse.event);
          setWorldGuild(guildResponse.guild);
          setWorldParty(partyResponse.party);
          setWorldRequests(requestResponse.requests);
          setWorldRelationships(relationshipResponse.relationships);
          applyVoiceRoomState(voiceResponse.rooms, voiceResponse.myRooms);
          setWorldInventory(inventoryResponse.inventory);
          setWorldMarketCatalog(inventoryResponse.catalog);
          setWorldMarketStats(inventoryResponse.stats);
          setWorldAchievements(achievementResponse.achievements);
          setCharacterProfile(inventoryResponse.profile);
          setCharacterDraft({
            displayName: inventoryResponse.profile.displayName,
            title: inventoryResponse.profile.title,
            activity: inventoryResponse.profile.activity,
            modelUrl: inventoryResponse.profile.modelUrl || '',
          });
        }
      } catch (err) {
        if (!cancelled) console.warn('World fallback refresh failed:', err);
      }
    };

    loadFallbackSnapshot();
    const interval = window.setInterval(loadFallbackSnapshot, 4500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeCircleId, activeLandScopeKey, applyVoiceRoomState, currentZone, isWorldStreamConnected, selfPosition.x, selfPosition.z, user?.sub, worldInterest]);

  React.useEffect(() => {
    if (!worldToast) return;
    const timeout = window.setTimeout(() => setWorldToast(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [worldToast]);

  React.useEffect(() => {
    if (!zoneArrivalPrompt) return;
    const timeout = window.setTimeout(() => setZoneArrivalPrompt(null), 8500);
    return () => window.clearTimeout(timeout);
  }, [zoneArrivalPrompt]);

  React.useEffect(() => {
    if (!quickEmotePulse) return;
    const timeout = window.setTimeout(() => setQuickEmotePulse(null), QUICK_EMOTE_ACTIVE_MS);
    return () => window.clearTimeout(timeout);
  }, [quickEmotePulse]);

  React.useEffect(() => {
    if (!quickActivityPulse) return;
    const timeout = window.setTimeout(() => setQuickActivityPulse(null), AVATAR_ACTIVITY_PULSE_ACTIVE_MS);
    return () => window.clearTimeout(timeout);
  }, [quickActivityPulse]);

  React.useEffect(() => {
    const previousEmotes = remoteEmoteByUserRef.current;
    const previousActivities = remoteActivityByUserRef.current;
    const nextEmotes: Record<string, string> = {};
    const nextActivities: Record<string, string> = {};
    const nextPulses: Record<string, RemoteEmotePulse> = {};
    const nextActivityPulses: Record<string, ActivityPulse> = {};
    const activeRemoteUserIds = new Set<string>();
    const now = Date.now();

    remotePresences.forEach((presence) => {
      const emote = presence.emote || 'idle';
      const activity = presence.activity || 'Exploring';
      const status = presence.status || getActivityMeta(activity).status;
      const activityKey = `${activity}|${status}`;
      activeRemoteUserIds.add(presence.userId);
      nextEmotes[presence.userId] = emote;
      nextActivities[presence.userId] = activityKey;

      const previousEmote = previousEmotes[presence.userId];
      if (previousEmote && previousEmote !== emote && emote !== 'idle') {
        nextPulses[presence.userId] = { emote, createdAt: now };
      }

      const previousActivity = previousActivities[presence.userId];
      if (previousActivity && previousActivity !== activityKey) {
        nextActivityPulses[presence.userId] = createActivityPulse(activity, status, now);
      }
    });

    remoteEmoteByUserRef.current = nextEmotes;
    remoteActivityByUserRef.current = nextActivities;
    setRemoteEmotePulses(prev => {
      const next = { ...prev };
      let changed = false;

      Object.keys(next).forEach((userId) => {
        if (!activeRemoteUserIds.has(userId)) {
          delete next[userId];
          changed = true;
        }
      });

      Object.entries(nextPulses).forEach(([userId, pulse]) => {
        next[userId] = pulse;
        changed = true;
      });

      return changed ? next : prev;
    });
    setRemoteActivityPulses(prev => {
      const next = { ...prev };
      let changed = false;

      Object.keys(next).forEach((userId) => {
        if (!activeRemoteUserIds.has(userId)) {
          delete next[userId];
          changed = true;
        }
      });

      Object.entries(nextActivityPulses).forEach(([userId, pulse]) => {
        next[userId] = pulse;
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [remotePresences]);

  React.useEffect(() => {
    const pulses = Object.values(remoteEmotePulses);
    if (pulses.length === 0) return;

    const now = Date.now();
    const nextExpiryMs = Math.min(
      ...pulses.map(pulse => Math.max(0, QUICK_EMOTE_ACTIVE_MS - (now - pulse.createdAt)))
    );
    const timeout = window.setTimeout(() => {
      const cutoff = Date.now() - QUICK_EMOTE_ACTIVE_MS;
      setRemoteEmotePulses(prev => {
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, pulse]) => pulse.createdAt > cutoff)
        );

        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, Math.max(120, nextExpiryMs));

    return () => window.clearTimeout(timeout);
  }, [remoteEmotePulses]);

  React.useEffect(() => {
    const pulses = Object.values(remoteActivityPulses);
    if (pulses.length === 0) return;

    const now = Date.now();
    const nextExpiryMs = Math.min(
      ...pulses.map(pulse => Math.max(0, AVATAR_ACTIVITY_PULSE_ACTIVE_MS - (now - pulse.createdAt)))
    );
    const timeout = window.setTimeout(() => {
      const cutoff = Date.now() - AVATAR_ACTIVITY_PULSE_ACTIVE_MS;
      setRemoteActivityPulses(prev => {
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, pulse]) => pulse.createdAt > cutoff)
        );

        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, Math.max(120, nextExpiryMs));

    return () => window.clearTimeout(timeout);
  }, [remoteActivityPulses]);

  React.useEffect(() => {
    if (!worldNavigationIntent) return;
    const timeout = window.setTimeout(() => {
      setWorldNavigationIntent(prev => (
        prev?.updatedAt === worldNavigationIntent.updatedAt ? null : prev
      ));
    }, 18_000);
    return () => window.clearTimeout(timeout);
  }, [worldNavigationIntent]);

  React.useEffect(() => {
    if (!activeSessionId) return;
    if (interactionSessions.some(session => session.id === activeSessionId)) return;
    setActiveSessionId(null);
    setIsSessionsPanelOpen(false);
  }, [activeSessionId, interactionSessions]);

  React.useEffect(() => {
    if (!selectedLandObject) return;
    if (landObjects.some(item => item.id === selectedLandObject.id)) return;
    setSelectedLandObject(null);
  }, [landObjects, selectedLandObject]);

  React.useEffect(() => {
    if (!selectedPresence) {
      setSelectedCharacterPanelUserId(null);
      return;
    }
    setSelectedCharacterPanelUserId(prev => prev === selectedPresence.userId ? prev : null);
  }, [selectedPresence]);

  React.useEffect(() => {
    if (!activeFollowTargetId) return;
    if (!activeFollowPresence) {
      setActiveFollowTargetId(null);
      setWorldToast('Follow target left the world');
      return;
    }

    const nextDestination = getFollowDestination(selfPosition, activeFollowPresence.position);
    moveTargetRef.current.copy(nextDestination);
  }, [activeFollowPresence, activeFollowTargetId, selfPosition]);

  const onSelfSample = React.useCallback((sample: LocalPresenceSample) => {
    heartbeatRef.current = sample;
    setSelfPosition(sample.position);
    setSelfMoving(sample.moving);
    const nextDistrict = getDistrictForPosition(sample.position);
    setActiveDistrictId(prev => {
      if (prev === nextDistrict.id) return prev;
      setZoneArrivalPrompt({ districtId: nextDistrict.id, enteredAt: Date.now() });
      setWorldToast(`Entered ${nextDistrict.name}`);
      return nextDistrict.id;
    });
  }, []);

  const onMoveTarget = React.useCallback((point: THREE.Vector3, options: { preserveQueuedAction?: boolean } = {}) => {
    markWorldActive();
    stopFollowing();
    setWorldNavigationIntent(null);
    if (!options.preserveQueuedAction && queuedAvatarAction) {
      setQueuedAvatarAction(null);
      setPendingActionType(prev => prev === queuedAvatarAction.type ? null : prev);
    }
    moveTargetRef.current.set(
      THREE.MathUtils.clamp(point.x, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2),
      0,
      THREE.MathUtils.clamp(point.z, -WORLD_BOUNDS + 2, WORLD_BOUNDS - 2)
    );
  }, [markWorldActive, queuedAvatarAction, stopFollowing]);

  const onMinimapMoveTarget = React.useCallback((point: THREE.Vector3, label?: string, options: { preserveQueuedAction?: boolean } = {}) => {
    onMoveTarget(point, options);
    if (label) {
      setWorldNavigationIntent({ kind: 'walk_to', label, targetPosition: vectorToObject(point), updatedAt: Date.now() });
      setWorldToast(`Walking to ${label}`);
    }
  }, [onMoveTarget]);

  const onSelectDistrict = React.useCallback((district: WorldDistrict) => {
    setSelectedDistrict(district);
    setIsDistrictPanelOpen(false);
    setSelectedPortal(null);
    setActivePortalPanelId(null);
    setSelectedNpc(null);
    setSelectedPresence(null);
    setSelectedLandObject(null);
    setSelectedActivityFeed(null);
    setIsSelectedProfileOpen(false);
    setIsSelectedActivityOpen(false);
    setIsSelectedDirectChatOpen(false);
    onMinimapMoveTarget(getMiniMapVector(district.position), district.name);
  }, [onMinimapMoveTarget]);

  const onSelectPortal = React.useCallback((portal: WorldPortal) => {
    setSelectedPortal(portal);
    setActivePortalPanelId(null);
    setSelectedDistrict(null);
    setIsDistrictPanelOpen(false);
    setSelectedNpc(null);
    setSelectedPresence(null);
    setSelectedLandObject(null);
    setSelectedActivityFeed(null);
    setIsSelectedProfileOpen(false);
    setIsSelectedActivityOpen(false);
    setIsSelectedDirectChatOpen(false);
    onMinimapMoveTarget(getMiniMapVector(portal.position), portal.name);
  }, [onMinimapMoveTarget]);

  const onSelectNpc = React.useCallback((npc: WorldNpc) => {
    const npcPosition = vectorToObject(getNpcPositionVector(npc));
    setSelectedNpc(npc);
    setSelectedDistrict(null);
    setIsDistrictPanelOpen(false);
    setSelectedPortal(null);
    setActivePortalPanelId(null);
    setSelectedPresence(null);
    setSelectedLandObject(null);
    setSelectedActivityFeed(null);
    setIsSelectedProfileOpen(false);
    setIsSelectedActivityOpen(false);
    setIsSelectedDirectChatOpen(false);
    onMinimapMoveTarget(getFollowDestination(selfPosition, npcPosition), npc.name);
  }, [getNpcPositionVector, onMinimapMoveTarget, selfPosition]);

  const onSelectPresence = React.useCallback((presence: WorldPresence) => {
    setSelectedPresence(presence);
    setSelectedDistrict(null);
    setSelectedPortal(null);
    setActivePortalPanelId(null);
    setSelectedNpc(null);
    setSelectedLandObject(null);
    setSelectedActivityFeed(null);
    setIsSelectedProfileOpen(false);
    setIsSelectedActivityOpen(false);
    setIsSelectedDirectChatOpen(prev => chatTarget?.userId === presence.userId ? prev : false);
  }, [chatTarget?.userId]);

  const openSelectedPresenceSheet = React.useCallback((presence: WorldPresence) => {
    setSelectedPresence(presence);
    setSelectedCharacterPanelUserId(presence.userId);
  }, []);

  const onSelectLandObject = React.useCallback((item: PurchasedItem) => {
    const meta = getLandObjectMeta(item);
    setSelectedLandObject(item);
    setSelectedDistrict(null);
    setSelectedPortal(null);
    setActivePortalPanelId(null);
    setSelectedNpc(null);
    setSelectedPresence(null);
    setSelectedActivityFeed(null);
    setIsSelectedProfileOpen(false);
    setIsSelectedActivityOpen(false);
    setIsSelectedDirectChatOpen(false);
    onMinimapMoveTarget(getMiniMapVector(getLandObjectPosition(item)), meta.label);
  }, [onMinimapMoveTarget]);

  const inspectLandObject = React.useCallback(async (item: PurchasedItem) => {
    const meta = getLandObjectMeta(item);
    if (!user?.sub || !activeCircleId) {
      setWorldToast(`${meta.label} selected`);
      return;
    }

    try {
      const response = await worldActionsAPI.create({
        type: 'npc_interact',
        targetName: meta.label,
        currentLandId: activeLandScopeKey,
        currentZone,
        message: 'Inspect Land Object',
        metadata: {
          currentLandId: activeLandScopeKey,
          landObjectId: item.id,
          landObjectType: item.type,
          landObjectName: meta.label,
          landId: item.landId,
        },
      });
      setWorldActions(prev => [response.action, ...prev.filter(action => action.id !== response.action.id)].slice(0, 12));
      await loadWorldAchievements();
      setWorldToast(`Inspected ${meta.label}`);
    } catch (err) {
      console.warn('Land object inspect failed:', err);
      setWorldToast('Object inspect failed');
    }
  }, [activeCircleId, activeLandScopeKey, currentZone, loadWorldAchievements, user?.sub]);

  const openWorldPortal = React.useCallback(async (portal: WorldPortal) => {
    let broadcastedActivity = false;
    if (user?.sub && activeCircleId) {
      const saved = await saveCharacterProfile({
        activity: portal.activity,
        status: portal.status,
        emote: portal.emote,
      });
      if (saved) {
        broadcastedActivity = true;
        setQuickEmotePulse({ emote: portal.emote, createdAt: Date.now() });
      }

      try {
        const response = await worldActionsAPI.create({
          type: 'npc_interact',
          targetName: portal.name,
          currentLandId: activeLandScopeKey,
          currentZone,
          message: portal.actionLabel,
          metadata: {
            currentLandId: activeLandScopeKey,
            portalId: portal.id,
            portalName: portal.name,
            portalActivity: portal.activity,
            portalStatus: portal.status,
            portalAction: portal.actionLabel,
          },
        });
        setWorldActions(prev => [response.action, ...prev.filter(item => item.id !== response.action.id)].slice(0, 12));
        await loadWorldAchievements();
      } catch (err) {
        console.warn('Portal world action failed:', err);
      }
    }

    setActivePortalPanelId(portal.id);
    setWorldToast(broadcastedActivity ? `${portal.name} opened in-world - activity set to ${portal.activity}` : `${portal.name} opened in-world`);
  }, [activeCircleId, activeLandScopeKey, currentZone, loadWorldAchievements, saveCharacterProfile, user?.sub]);

  const openPortalBoard = React.useCallback((portal: WorldPortal) => {
    setActivePortalPanelId(portal.id);
    setWorldToast(`${portal.name} board expanded in-world`);
  }, []);

  const openDirectChat = React.useCallback((target: WorldPresence, options: { openPanel?: boolean } = {}) => {
    setChatTarget(target);
    setChatChannel('direct');
    setChatSpatialMode('world');
    setSelectedPresence(target);
    setSelectedDistrict(null);
    setSelectedPortal(null);
    setActivePortalPanelId(null);
    setSelectedNpc(null);
    setSelectedLandObject(null);
    setIsSelectedDirectChatOpen(true);
    setIsChatPanelOpen(options.openPanel ?? false);
  }, []);

  const openSessionChat = React.useCallback((session: WorldSocialAction) => {
    const counterpart = getRequestCounterpart(session, userId);
    if (!counterpart.userId) {
      setWorldToast('Session partner unavailable');
      return;
    }

    const presence = remotePresences.find(item => item.userId === counterpart.userId);
    openDirectChat(presence || {
      userId: counterpart.userId,
      name: counterpart.name,
      position: selfPosition,
      animation: 'idle',
      activity: 'Session partner',
      status: 'offline',
      currentZone,
      lastSeen: new Date().toISOString(),
    }, { openPanel: !presence });
  }, [currentZone, openDirectChat, remotePresences, selfPosition, userId]);

  const openWorldChat = React.useCallback(() => {
    setChatTarget(null);
    setChatChannel('world');
    setChatSpatialMode('world');
    setIsSelectedDirectChatOpen(false);
    setIsChatPanelOpen(true);
  }, []);

  const onSelectActivityBeacon = React.useCallback((beacon: WorldActivityBeacon) => {
    setSelectedLandObject(null);
    if (beacon.message) {
      setChatTarget(null);
      setChatChannel(beacon.message.channel === 'direct' ? 'world' : beacon.message.channel);
      setChatSpatialMode(isNearbySpeechChannel(beacon.message) ? 'nearby' : 'world');
      setIsSelectedDirectChatOpen(false);
      setIsChatPanelOpen(true);
      setWorldToast(`Opened ${getChatAudience(beacon.message)} chat`);
      return;
    }

    const action = beacon.action;
    if (!action) return;

    const portalId = typeof action.metadata?.portalId === 'string' ? action.metadata.portalId : '';
    const portal = portalId ? WORLD_PORTALS.find(item => item.id === portalId) : null;
    if (portal) {
      onSelectPortal(portal);
      return;
    }

    const npcId = typeof action.metadata?.npcId === 'string' ? action.metadata.npcId : '';
    const npc = npcId ? WORLD_NPCS.find(item => item.id === npcId) : null;
    if (npc) {
      onSelectNpc(npc);
      return;
    }

    const actor = remotePresences.find(presence => presence.userId === action.fromUserId || presence.userId === action.toUserId);
    if (actor) {
      onSelectPresence(actor);
    } else {
      setSelectedDistrict(getDistrictForZoneName(typeof action.metadata?.currentZone === 'string' ? action.metadata.currentZone : currentZone));
      setSelectedPortal(null);
      setSelectedNpc(null);
      setSelectedPresence(null);
      setSelectedLandObject(null);
      setIsSelectedDirectChatOpen(false);
    }
    setIsActionFeedOpen(true);
    setWorldToast(getActionLabel(action));
  }, [currentZone, onSelectNpc, onSelectPortal, onSelectPresence, remotePresences]);

  const focusActivityBeacon = React.useCallback((beacon: WorldActivityBeacon) => {
    onMinimapMoveTarget(getMiniMapVector(beacon.position), beacon.label);
    onSelectActivityBeacon(beacon);
  }, [onMinimapMoveTarget, onSelectActivityBeacon]);

  const joinWorldEvent = React.useCallback(async (
    zone = currentZone,
    eventId?: string,
    options: WorldPanelOpenOptions = {}
  ) => {
    if (!user?.sub || !activeCircleId) {
      setWorldToast('Sign in to join world events');
      return;
    }

    setIsEventUpdating(true);
    try {
      const { event } = await worldEventsAPI.join({
        eventId,
        currentLandId: activeLandScopeKey,
        currentZone: zone,
      });
      setWorldEvent(event);
      if (options.openPanel ?? true) setIsEventPanelOpen(true);
      await loadWorldAchievements();
      setWorldToast(`Joined ${event.title}`);
    } catch (err) {
      console.warn('World event join failed:', err);
      setWorldToast('Event update failed');
    } finally {
      setIsEventUpdating(false);
    }
  }, [activeCircleId, activeLandScopeKey, currentZone, loadWorldAchievements, user?.sub]);

  const rallyWorldEvent = React.useCallback(async (
    zone = currentZone,
    options: WorldPanelOpenOptions = {}
  ) => {
    if (!user?.sub || !activeCircleId) {
      setWorldToast('Sign in to rally world events');
      return;
    }

    setIsEventUpdating(true);
    try {
      const { event } = await worldEventsAPI.rally({
        currentLandId: activeLandScopeKey,
        currentZone: zone,
      });
      setWorldEvent(event);
      if (options.openPanel ?? true) setIsEventPanelOpen(true);
      setQuickEmotePulse({ emote: 'heart', createdAt: Date.now() });
      await loadWorldAchievements();
      setWorldToast(`${event.title} rally sent`);
    } catch (err) {
      console.warn('World event rally failed:', err);
      setWorldToast('Event rally failed');
    } finally {
      setIsEventUpdating(false);
    }
  }, [activeCircleId, activeLandScopeKey, currentZone, loadWorldAchievements, user?.sub]);

  const openSessionContext = React.useCallback(async (session: WorldSocialAction) => {
    if (session.type === 'trade') {
      setIsMarketPanelOpen(true);
      setWorldToast('Market opened for trade');
      return;
    }

    const sessionZone = typeof session.metadata?.sessionZone === 'string' && session.metadata.sessionZone
      ? session.metadata.sessionZone
      : currentZone;
    await joinWorldEvent(sessionZone);
  }, [currentZone, joinWorldEvent]);

  const leaveWorldEvent = React.useCallback(async (zone = currentZone) => {
    setIsEventUpdating(true);
    try {
      const { event } = await worldEventsAPI.leave({
        currentLandId: activeLandScopeKey,
        currentZone: zone,
      });
      setWorldEvent(event);
      setWorldToast('Left event');
    } catch (err) {
      console.warn('World event leave failed:', err);
      setWorldToast('Event update failed');
    } finally {
      setIsEventUpdating(false);
    }
  }, [activeLandScopeKey, currentZone]);

  const ensureGuild = React.useCallback(async (
    zone = currentZone,
    options: WorldPanelOpenOptions = {}
  ) => {
    if (!user?.sub || !activeCircleId) {
      setWorldToast('Sign in to create a guild');
      return;
    }

    setIsGuildUpdating(true);
    try {
      const { guild } = await worldGuildAPI.ensure({
        currentLandId: activeLandScopeKey,
        currentZone: zone,
      });
      setWorldGuild(guild);
      if (options.openPanel ?? true) setIsGuildPanelOpen(true);
      await loadWorldAchievements();
      setWorldToast(`${guild.name} is ready`);
    } catch (err) {
      console.warn('Guild create failed:', err);
      setWorldToast('Guild update failed');
    } finally {
      setIsGuildUpdating(false);
    }
  }, [activeCircleId, activeLandScopeKey, currentZone, loadWorldAchievements, user?.sub]);

  const leaveGuild = React.useCallback(async () => {
    setIsGuildUpdating(true);
    try {
      const { guild } = await worldGuildAPI.leave({
        currentLandId: activeLandScopeKey,
        currentZone,
      });
      setWorldGuild(guild);
      setChatChannel(prev => prev === 'guild' ? 'world' : prev);
      setChatSpatialMode('world');
      setWorldToast('Left guild');
    } catch (err) {
      console.warn('Guild leave failed:', err);
      setWorldToast('Guild update failed');
    } finally {
      setIsGuildUpdating(false);
    }
  }, [activeLandScopeKey, currentZone]);

  const respondToWorldRequest = React.useCallback(async (
    request: WorldSocialAction,
    response: WorldRequestResponse
  ) => {
    setPendingRequestId(request.id);
    try {
      const result = await worldRequestsAPI.respond({
        actionId: request.id,
        response,
        currentLandId: activeLandScopeKey,
        currentZone,
      });
      setWorldRequests(result.requests);
      setWorldActions(prev => [result.request, ...prev.filter(action => action.id !== result.request.id)].slice(0, 12));
      if (response === 'accept' && request.type === 'voice_call' && request.fromUserId) {
        await joinVoiceRoom('direct', { userId: request.fromUserId, name: request.fromName }, undefined, { openPanel: false });
      }
      if (response === 'accept' && request.type === 'invite_party') {
        const { party } = await worldPartyAPI.get({ currentLandId: activeLandScopeKey });
        setWorldParty(party);
      }
      if (response === 'accept' && request.type === 'invite_guild') {
        const { guild } = await worldGuildAPI.get({ currentLandId: activeLandScopeKey });
        setWorldGuild(guild);
      }
      if (response === 'accept' && isInteractionSessionType(request.type)) {
        setActiveSessionId(result.request.id);
      }
      if ((response === 'complete' || response === 'cancel' || response === 'decline') && request.id === activeSessionId) {
        setActiveSessionId(null);
        setIsSessionsPanelOpen(false);
      }
      const label = response === 'accept'
        ? 'Accepted'
        : response === 'decline'
          ? 'Declined'
          : response === 'complete'
            ? 'Completed'
            : response === 'ready'
              ? 'Marked ready'
              : response === 'unready'
                ? 'Marked not ready'
                : 'Canceled';
      setWorldToast(`${label} ${getRequestTitle(request.type).toLowerCase()}`);
    } catch (err) {
      console.warn('World request response failed:', err);
      setWorldToast('Request update failed');
    } finally {
      setPendingRequestId(null);
    }
  }, [activeLandScopeKey, activeSessionId, currentZone, joinVoiceRoom]);

  const loadSelectedActivityFeed = React.useCallback(async (
    target: WorldPresence,
    options: { openPanel?: boolean } = {}
  ) => {
    setIsLoadingSelectedActivity(true);
    if (options.openPanel ?? true) setIsSelectedActivityOpen(true);
    try {
      const { feed } = await worldActivityAPI.get(target.userId, 12, worldInterest);
      setSelectedActivityFeed(feed);
    } catch (err) {
      console.warn('World activity feed load failed:', err);
      setWorldToast('Activity feed unavailable');
    } finally {
      setIsLoadingSelectedActivity(false);
    }
  }, [worldInterest]);

  const refreshSelectedActivityInWorld = React.useCallback((target: WorldPresence) => {
    void loadSelectedActivityFeed(target, { openPanel: false });
  }, [loadSelectedActivityFeed]);

  const loadSelectedProfile = React.useCallback(async (target: WorldPresence) => {
    setIsLoadingSelectedProfile(true);
    setIsSelectedProfileOpen(true);
    try {
      const { feed } = await worldActivityAPI.get(target.userId, 8, worldInterest);
      setSelectedActivityFeed(feed);
    } catch (err) {
      console.warn('World profile load failed:', err);
      setWorldToast('Profile unavailable');
    } finally {
      setIsLoadingSelectedProfile(false);
    }
  }, [worldInterest]);

  const joinAvatarActivity = React.useCallback(async (target: WorldPresence) => {
    try {
      const joinKind = getAvatarActivityJoinKind(target);
      const district = getAvatarActivityDistrict(target);
      const targetDistrict = getDistrictForPosition(target.position);
      const shouldWalkToAvatar = joinKind === 'nearby' || district.id === targetDistrict.id;
      const destination = shouldWalkToAvatar
        ? getFollowDestination(selfPosition, target.position)
        : getMiniMapVector(district.position);
      const zone = target.currentZone || getZoneName(activeLandName, district);

      setSelectedPresence(target);
      setSelectedDistrict(joinKind === 'nearby' ? null : district);
      setSelectedPortal(null);
      setSelectedNpc(null);
      setSelectedLandObject(null);
      onMinimapMoveTarget(destination, shouldWalkToAvatar ? target.name : district.name);

      if (joinKind === 'event') {
        await joinWorldEvent(zone, target.eventId, { openPanel: false });
        return;
      }

      if (joinKind === 'trade') {
        setWorldToast(`Joining ${target.name} at the market district`);
        return;
      }

      if (joinKind === 'create') {
        setWorldToast(`Joining ${target.name} at the workshop`);
        return;
      }

      if (joinKind === 'chat') {
        openDirectChat(target);
        setWorldToast(`Joining ${target.name}'s conversation`);
        return;
      }

      if (joinKind === 'voice') {
        const targetVoiceRoom = target.voiceRoomId
          ? worldVoiceRooms.find(room => room.id === target.voiceRoomId)
          : null;
        if (targetVoiceRoom?.kind === 'party' && target.partyId) {
          const { party } = await worldPartyAPI.join({
            partyId: target.partyId,
            currentLandId: activeLandScopeKey,
            currentZone: zone,
          });
          setWorldParty(party);
          await loadWorldAchievements();
          await joinVoiceRoom('party', undefined, zone, { openPanel: false });
          setWorldToast(`Joined ${party.name} voice with ${target.name}`);
          return;
        }
        if (targetVoiceRoom?.kind === 'guild' && target.guildId) {
          const { guild } = await worldGuildAPI.join({
            guildId: target.guildId,
            currentLandId: activeLandScopeKey,
            currentZone: zone,
          });
          setWorldGuild(guild);
          await loadWorldAchievements();
          await joinVoiceRoom('guild', undefined, zone, { openPanel: false });
          setWorldToast(`Joined ${guild.name} voice with ${target.name}`);
          return;
        }
        if (targetVoiceRoom?.kind === 'proximity') {
          await joinVoiceRoom('proximity', undefined, zone, { openPanel: false });
          setWorldToast(`Joining ${target.name}'s nearby voice`);
          return;
        }
        await joinVoiceRoom('direct', { userId: target.userId, name: target.name }, zone, { openPanel: false });
        return;
      }

      if (joinKind === 'party') {
        if (target.partyId) {
          const { party } = await worldPartyAPI.join({
            partyId: target.partyId,
            currentLandId: activeLandScopeKey,
            currentZone: zone,
          });
          setWorldParty(party);
          await loadWorldAchievements();
          setWorldToast(`Joined ${party.name} with ${target.name}`);
          return;
        }
        setWorldToast(`Standing near ${target.name}'s party route`);
        return;
      }

      if (joinKind === 'guild') {
        if (target.guildId) {
          const { guild } = await worldGuildAPI.join({
            guildId: target.guildId,
            currentLandId: activeLandScopeKey,
            currentZone: zone,
          });
          setWorldGuild(guild);
          await loadWorldAchievements();
          setWorldToast(`Joined ${guild.name} with ${target.name}`);
          return;
        }
        setWorldToast(`Standing near ${target.name}'s guild hall route`);
        return;
      }

      await loadSelectedActivityFeed(target);
      setWorldToast(`Walking over to ${target.name}`);
    } catch (err) {
      console.warn('Join avatar activity failed:', err);
      setWorldToast(err instanceof Error ? err.message : 'Could not join current activity');
    }
  }, [activeLandName, activeLandScopeKey, joinVoiceRoom, joinWorldEvent, loadSelectedActivityFeed, loadWorldAchievements, onMinimapMoveTarget, openDirectChat, selfPosition, worldVoiceRooms]);

  const runWorldAction = React.useCallback(async (
    action: WorldActionDescriptor,
    target: WorldPresence,
    options: WorldActionRunOptions = {}
  ) => {
    if (action.type === 'follow_user' && activeFollowTargetId === target.userId) {
      stopFollowing(`Stopped following ${target.name}`);
      return;
    }

    if (!user?.sub || !activeCircleId) {
      setWorldToast('Sign in to interact in the world');
      return;
    }

    const distanceToTarget = getPresenceDistance(selfPosition, target.position);
    if (
      !options.skipProximityCheck &&
      AVATAR_PROXIMITY_ACTION_TYPES.has(action.type) &&
      distanceToTarget > AVATAR_INTERACTION_RANGE
    ) {
      markWorldActive();
      setPendingActionType(action.type);
      setQueuedAvatarAction({
        type: action.type,
        targetUserId: target.userId,
        createdAt: Date.now(),
      });
      setSelectedPresence(target);
      onMinimapMoveTarget(getFollowDestination(selfPosition, target.position), target.name, { preserveQueuedAction: true });
      setWorldToast(`Walking closer to ${target.name} for ${action.label}`);
      return;
    }

    setQueuedAvatarAction(prev => (
      prev?.targetUserId === target.userId && prev.type === action.type ? null : prev
    ));
    setPendingActionType(action.type);
    try {
      const actionMetadata: Record<string, string> = {
        currentLandId: activeLandScopeKey,
        targetActivity: target.activity,
        targetLandId: target.currentLandId || '',
        targetStatus: target.status,
        targetZone: target.currentZone,
      };
      const targetJoinKind = action.type === 'join_activity' ? getAvatarActivityJoinKind(target) : null;
      if (targetJoinKind) actionMetadata.joinActivityKind = targetJoinKind;
      if (target.eventId) actionMetadata.targetEventId = target.eventId;
      if (target.eventName) actionMetadata.targetEventName = target.eventName;
      if (target.partyId) actionMetadata.targetPartyId = target.partyId;
      if (target.party) actionMetadata.targetPartyName = target.party;
      if (target.guildId) actionMetadata.targetGuildId = target.guildId;
      if (target.guild) actionMetadata.targetGuildName = target.guild;
      if (target.voiceRoomId) actionMetadata.targetVoiceRoomId = target.voiceRoomId;
      if (target.voiceRoomName) actionMetadata.targetVoiceRoomName = target.voiceRoomName;

      if (action.type === 'invite_party') {
        const { party } = await worldPartyAPI.ensure({
          currentLandId: activeLandScopeKey,
          currentZone,
        });
        setWorldParty(party);
        actionMetadata.partyId = party.id;
        actionMetadata.partyName = party.name;
      }

      if (action.type === 'invite_guild') {
        const { guild } = await worldGuildAPI.ensure({
          currentLandId: activeLandScopeKey,
          currentZone,
        });
        setWorldGuild(guild);
        actionMetadata.guildId = guild.id;
        actionMetadata.guildName = guild.name;
      }

      const response = await worldActionsAPI.create({
        type: action.type,
        targetUserId: target.userId,
        targetName: target.name,
        currentLandId: activeLandScopeKey,
        currentZone,
        metadata: actionMetadata,
      });

      setWorldActions(prev => [response.action, ...prev.filter(item => item.id !== response.action.id)].slice(0, 12));
      if (action.type === 'view_profile') await loadSelectedProfile(target);
      if (action.type === 'follow_user') {
        const relationshipResponse = await worldRelationshipsAPI.follow({
          targetUserId: target.userId,
          targetName: target.name,
          currentLandId: activeLandScopeKey,
          currentZone,
          metadata: {
            currentLandId: activeLandScopeKey,
            targetLandId: target.currentLandId || '',
            targetZone: target.currentZone,
          },
        });
        setWorldRelationships(relationshipResponse.relationships);
        setActiveFollowTargetId(target.userId);
        moveTargetRef.current.copy(getFollowDestination(selfPosition, target.position));
      }
      if (action.type === 'add_friend') {
        const relationshipResponse = await worldRelationshipsAPI.addFriend({
          targetUserId: target.userId,
          targetName: target.name,
          currentLandId: activeLandScopeKey,
          currentZone,
          metadata: {
            currentLandId: activeLandScopeKey,
            targetLandId: target.currentLandId || '',
            targetZone: target.currentZone,
          },
        });
        setWorldRelationships(relationshipResponse.relationships);
      }
      if (action.type === 'start_chat') openDirectChat(target);
      if (action.type === 'join_activity') await joinAvatarActivity(target);
      if (action.type === 'activity_feed') await loadSelectedActivityFeed(target);
      if (REQUEST_ACTION_TYPES.has(action.type)) {
        setSelectedPresence(target);
        setWorldRequests(prev => [response.action, ...prev.filter(request => request.id !== response.action.id)].slice(0, 24));
      }
      await loadWorldAchievements();
      if (action.type !== 'join_activity') setWorldToast(`${action.toast}: ${target.name}`);
    } catch (err) {
      console.warn('World action failed:', err);
      setWorldToast('World action failed');
    } finally {
      setPendingActionType(null);
    }
  }, [activeCircleId, activeFollowTargetId, activeLandScopeKey, currentZone, joinAvatarActivity, loadSelectedActivityFeed, loadSelectedProfile, loadWorldAchievements, markWorldActive, onMinimapMoveTarget, openDirectChat, selfPosition, stopFollowing, user?.sub]);

  React.useEffect(() => {
    if (!queuedAvatarAction) return;

    const target = remotePresences.find(presence => presence.userId === queuedAvatarAction.targetUserId);
    if (!target) {
      setQueuedAvatarAction(null);
      setPendingActionType(null);
      setWorldToast('Avatar left before the interaction started');
      return;
    }

    const action = getWorldActionDescriptor(queuedAvatarAction.type);
    if (!action) {
      setQueuedAvatarAction(null);
      setPendingActionType(null);
      return;
    }

    const queueAge = Date.now() - queuedAvatarAction.createdAt;
    if (queueAge > AVATAR_ACTION_QUEUE_TTL_MS) {
      setQueuedAvatarAction(null);
      setPendingActionType(null);
      setWorldToast(`Could not get close enough to ${target.name}`);
      return;
    }

    const distance = getPresenceDistance(selfPosition, target.position);
    if (distance > AVATAR_INTERACTION_RANGE) {
      moveTargetRef.current.copy(getFollowDestination(selfPosition, target.position));
      const timeout = window.setTimeout(() => {
        setQueuedAvatarAction(prev => (
          prev?.createdAt === queuedAvatarAction.createdAt &&
          prev.targetUserId === queuedAvatarAction.targetUserId &&
          prev.type === queuedAvatarAction.type
            ? null
            : prev
        ));
        setPendingActionType(prev => prev === queuedAvatarAction.type ? null : prev);
        setWorldToast(`Could not get close enough to ${target.name}`);
      }, Math.max(250, AVATAR_ACTION_QUEUE_TTL_MS - queueAge));

      return () => window.clearTimeout(timeout);
    }

    setQueuedAvatarAction(null);
    setPendingActionType(null);
    void runWorldAction(action, target, { skipProximityCheck: true });
  }, [queuedAvatarAction, remotePresences, runWorldAction, selfPosition]);

  const updateWorldRelationshipFromPanel = React.useCallback(async (
    relationship: WorldRelationship,
    intent: 'accept_friend' | 'remove_friend' | 'unfollow'
  ) => {
    if (!user?.sub || !activeCircleId) {
      setWorldToast('Sign in to update social bonds');
      return;
    }

    const isSelfFrom = relationship.fromUserId === userId;
    const targetUserId = isSelfFrom ? relationship.toUserId : relationship.fromUserId;
    const targetName = isSelfFrom ? relationship.toName : relationship.fromName;
    const pendingKey = `${intent}:${relationship.id}`;

    setPendingRelationshipAction(pendingKey);
    try {
      const response = intent === 'accept_friend'
        ? await worldRelationshipsAPI.addFriend({
          targetUserId,
          targetName,
          currentLandId: activeLandScopeKey,
          currentZone,
          metadata: { acceptedFrom: 'social_panel', currentLandId: activeLandScopeKey },
        })
        : intent === 'unfollow'
          ? await worldRelationshipsAPI.unfollow({
            targetUserId,
            targetName,
            currentLandId: activeLandScopeKey,
            currentZone,
            metadata: { updatedFrom: 'social_panel', currentLandId: activeLandScopeKey },
          })
          : await worldRelationshipsAPI.removeFriend({
            targetUserId,
            targetName,
            currentLandId: activeLandScopeKey,
            currentZone,
            metadata: { updatedFrom: 'social_panel', currentLandId: activeLandScopeKey },
          });

      setWorldRelationships(response.relationships);
      setWorldToast(
        intent === 'accept_friend'
          ? `${targetName} is now a friend`
          : intent === 'unfollow'
            ? `Stopped following ${targetName}`
            : `Updated bond with ${targetName}`
      );
    } catch (err) {
      console.warn('World relationship update failed:', err);
      setWorldToast('Social bond update failed');
    } finally {
      setPendingRelationshipAction(null);
    }
  }, [activeCircleId, activeLandScopeKey, currentZone, user?.sub, userId]);

  const visibleChatMessages = React.useMemo(() => {
    if (chatChannel === 'direct' && chatTarget) {
      return worldChatMessages.filter(message => (
        message.channel === 'direct' &&
        (
          (message.fromUserId === userId && message.toUserId === chatTarget.userId) ||
          (message.fromUserId === chatTarget.userId && message.toUserId === userId)
        )
      ));
    }
    if (chatChannel === 'party') {
      return worldChatMessages.filter(message => (
        message.channel === 'party' &&
        typeof message.metadata?.partyId === 'string' &&
        message.metadata.partyId === worldParty?.id
      ));
    }
    if (chatChannel === 'guild') {
      return worldChatMessages.filter(message => (
        message.channel === 'guild' &&
        typeof message.metadata?.guildId === 'string' &&
        message.metadata.guildId === worldGuild?.id
      ));
    }

    if (chatChannel === 'world' && chatSpatialMode === 'nearby') {
      return worldChatMessages.filter(message => isNearbySpeechMessage(message, selfPosition));
    }

    return worldChatMessages.filter(message => message.channel === chatChannel);
  }, [chatChannel, chatSpatialMode, chatTarget, selfPosition, userId, worldChatMessages, worldGuild?.id, worldParty?.id]);

  const chatPanelSubtitle = React.useMemo(() => {
    if (chatChannel === 'direct' && chatTarget) return `Direct with ${chatTarget.name}`;
    if (chatChannel === 'party') return worldParty?.name || 'Party channel';
    if (chatChannel === 'guild') return worldGuild?.name || 'Guild channel';
    if (chatChannel === 'world' && chatSpatialMode === 'nearby') return `${currentZone} / nearby speech`;
    return currentZone;
  }, [chatChannel, chatSpatialMode, chatTarget, currentZone, worldGuild?.name, worldParty?.name]);

  const chatPlaceholder = React.useMemo(() => {
    if (chatChannel === 'direct' && chatTarget) return `Message ${chatTarget.name}`;
    if (chatChannel === 'party') return `Message ${worldParty?.name || 'your party'}`;
    if (chatChannel === 'guild') return `Message ${worldGuild?.name || 'your guild'}`;
    if (chatChannel === 'world' && chatSpatialMode === 'nearby') return 'Say something nearby';
    return 'Say something in the world';
  }, [chatChannel, chatSpatialMode, chatTarget, worldGuild?.name, worldParty?.name]);

  const sendWorldChat = React.useCallback(async (event?: React.FormEvent) => {
    event?.preventDefault();
    const body = chatDraft.trim();
    if (!body || isSendingChat) return;
    if (!user?.sub || !activeCircleId) {
      setWorldToast('Sign in to chat in the world');
      return;
    }
    if (chatChannel === 'direct' && !chatTarget) {
      setWorldToast('Choose a character for direct chat');
      return;
    }
    if (chatChannel === 'party' && !worldParty) {
      setWorldToast('Create or join a party first');
      return;
    }
    if (chatChannel === 'guild' && !worldGuild) {
      setWorldToast('Create or join a guild first');
      return;
    }

    setIsSendingChat(true);
    try {
      const chatPosition = heartbeatRef.current.position || selfPosition;
      const isNearbySpeech = chatChannel === 'world' && chatSpatialMode === 'nearby';
      const response = await worldChatAPI.create({
        body,
        channel: chatChannel,
        targetUserId: chatChannel === 'direct' ? chatTarget?.userId : undefined,
        targetName: chatChannel === 'direct' ? chatTarget?.name : undefined,
        currentLandId: activeLandScopeKey,
        currentZone,
        metadata: {
          currentLandId: activeLandScopeKey,
          senderActivity: currentProfile.activity,
          senderStatus: currentProfile.status,
          senderX: Number(chatPosition.x.toFixed(2)),
          senderZ: Number(chatPosition.z.toFixed(2)),
          speechMode: isNearbySpeech ? 'nearby' : 'world',
          ...(isNearbySpeech ? { speechRange: NEARBY_SPEECH_RANGE } : {}),
          ...(worldParty?.id ? { partyId: worldParty.id } : {}),
          ...(worldGuild?.id ? { guildId: worldGuild.id } : {}),
        },
      });
      setWorldChatMessages(prev => [...prev.filter(message => message.id !== response.message.id), response.message].slice(-18));
      setChatDraft('');
      await loadWorldAchievements();
    } catch (err) {
      console.warn('World chat send failed:', err);
      setWorldToast('Chat send failed');
    } finally {
      setIsSendingChat(false);
    }
  }, [activeCircleId, activeLandScopeKey, chatChannel, chatDraft, chatSpatialMode, chatTarget, currentProfile.activity, currentProfile.status, currentZone, isSendingChat, loadWorldAchievements, selfPosition, user?.sub, worldGuild, worldParty]);

  const ensureParty = React.useCallback(async (
    zone = currentZone,
    options: WorldPanelOpenOptions = {}
  ) => {
    if (!user?.sub || !activeCircleId) {
      setWorldToast('Sign in to create a party');
      return;
    }

    setIsPartyUpdating(true);
    try {
      const { party } = await worldPartyAPI.ensure({
        currentLandId: activeLandScopeKey,
        currentZone: zone,
      });
      setWorldParty(party);
      if (options.openPanel ?? true) setIsPartyPanelOpen(true);
      await loadWorldAchievements();
      setWorldToast(`${party.name} is ready`);
    } catch (err) {
      console.warn('Party create failed:', err);
      setWorldToast('Party update failed');
    } finally {
      setIsPartyUpdating(false);
    }
  }, [activeCircleId, activeLandScopeKey, currentZone, loadWorldAchievements, user?.sub]);

  const focusWorldDistrict = React.useCallback((district: WorldDistrict, label?: string) => {
    const intentLabel = label || `${district.name} hub`;
    setSelectedDistrict(district);
    setIsDistrictPanelOpen(false);
    setSelectedPortal(null);
    setActivePortalPanelId(null);
    setSelectedLandObject(null);
    setIsSelectedDirectChatOpen(false);
    onMinimapMoveTarget(getMiniMapVector(district.position), district.name);
    setWorldNavigationIntent({
      kind: 'inspect',
      label: intentLabel,
      targetPosition: tupleToPresenceVector(district.position),
      updatedAt: Date.now(),
    });
  }, [onMinimapMoveTarget]);

  const runDistrictAction = React.useCallback(async (
    district: WorldDistrict,
    action: WorldDistrictAction
  ) => {
    const zone = getZoneName(activeLandName, district);

    if (action === 'walk') {
      onMinimapMoveTarget(getMiniMapVector(district.position), district.name);
      return;
    }

    if (action === 'chat') {
      openWorldChat();
      setWorldToast(`${district.name} chat opened`);
      return;
    }

    if (action === 'party') {
      await ensureParty(zone, { openPanel: false });
      return;
    }

    if (district.id === 'market') {
      focusWorldDistrict(district, 'Market stalls');
      setWorldToast('Market stalls selected');
      return;
    }

    if (district.id === 'guild-hall') {
      focusWorldDistrict(district, 'Guild hall rally');
      await ensureGuild(zone, { openPanel: false });
      return;
    }

    if (district.id === 'event-lawn') {
      focusWorldDistrict(district, 'Event lawn board');
      await joinWorldEvent(zone, undefined, { openPanel: false });
      return;
    }

    if (district.id === 'workshop') {
      focusWorldDistrict(district, 'Workshop avatar station');
      setWorldToast('Workshop station selected');
      return;
    }

    openWorldChat();
  }, [activeLandName, ensureGuild, ensureParty, focusWorldDistrict, joinWorldEvent, onMinimapMoveTarget, openWorldChat]);

  const leaveParty = React.useCallback(async () => {
    setIsPartyUpdating(true);
    try {
      const { party } = await worldPartyAPI.leave({
        currentLandId: activeLandScopeKey,
        currentZone,
      });
      setWorldParty(party);
      setChatChannel(prev => prev === 'party' ? 'world' : prev);
      setChatSpatialMode('world');
      setWorldToast('Left party');
    } catch (err) {
      console.warn('Party leave failed:', err);
      setWorldToast('Party update failed');
    } finally {
      setIsPartyUpdating(false);
    }
  }, [activeLandScopeKey, currentZone]);

  const runNpcAction = React.useCallback(async (
    npc: WorldNpc,
    action: WorldNpc['actions'][number],
    options: NpcActionRunOptions = {}
  ) => {
    if (!user?.sub || !activeCircleId) {
      setWorldToast('Sign in to interact with world NPCs');
      return;
    }

    const npcPosition = vectorToObject(getNpcPositionVector(npc));
    if (!options.skipProximityCheck) {
      const distance = getPresenceDistance(selfPosition, npcPosition);
      if (distance > NPC_INTERACTION_RANGE) {
        setSelectedNpc(npc);
        setQueuedNpcAction({
          npcId: npc.id,
          actionIntent: action.intent,
          createdAt: Date.now(),
        });
        setPendingNpcIntent(action.intent);
        onMinimapMoveTarget(getFollowDestination(selfPosition, npcPosition), npc.name);
        setWorldToast(`Approaching ${npc.name}`);
        return;
      }
    }

    setQueuedNpcAction(null);
    setPendingNpcIntent(action.intent);
    try {
      const response = await worldActionsAPI.create({
        type: 'npc_interact',
        targetName: npc.name,
        currentLandId: activeLandScopeKey,
        currentZone: `${npc.district} District`,
        message: action.label,
        metadata: {
          currentLandId: activeLandScopeKey,
          npcId: npc.id,
          npcName: npc.name,
          npcRole: npc.role,
          district: npc.district,
          intent: action.intent,
          npcX: npcPosition.x,
          npcZ: npcPosition.z,
        },
      });
      setWorldActions(prev => [response.action, ...prev.filter(item => item.id !== response.action.id)].slice(0, 12));
      if (action.intent === 'guild_intro') {
        const district = getDistrictForZoneName(`${npc.district} District`);
        focusWorldDistrict(district, `${district.name} rally`);
        await ensureGuild(`${npc.district} District`, { openPanel: false });
      }
      if (action.intent === 'party_plan') {
        const district = getDistrictForZoneName(`${npc.district} District`);
        focusWorldDistrict(district, `${district.name} party route`);
        await ensureParty(`${npc.district} District`, { openPanel: false });
      }
      if (action.intent === 'event_join') {
        const district = getDistrictForZoneName(`${npc.district} District`);
        focusWorldDistrict(district, `${district.name} event board`);
        await joinWorldEvent(`${npc.district} District`, undefined, { openPanel: false });
      }
      if (action.intent === 'event_rally') {
        const district = getDistrictForZoneName(`${npc.district} District`);
        focusWorldDistrict(district, `${district.name} rally call`);
        await rallyWorldEvent(`${npc.district} District`, { openPanel: false });
      }
      if (action.intent === 'event_board') {
        const district = getDistrictForZoneName(`${npc.district} District`);
        focusWorldDistrict(district, `${district.name} event board`);
      }
      if (action.intent === 'market_browse') {
        const district = getDistrictForZoneName(`${npc.district} District`);
        focusWorldDistrict(district, `${district.name} keepsake stall`);
      }
      if (action.intent === 'title_check') {
        const district = getDistrictForZoneName(`${npc.district} District`);
        focusWorldDistrict(district, `${district.name} title board`);
      }
      if (action.intent === 'craft_preview' || action.intent === 'gear_tune') {
        const district = getDistrictForZoneName(`${npc.district} District`);
        focusWorldDistrict(district, `${district.name} avatar station`);
      }
      if (action.intent === 'object_inspect') {
        setSelectedLandObject(null);
        setWorldNavigationIntent({ kind: 'inspect', label: 'Land objects', targetPosition: npcPosition, updatedAt: Date.now() });
      }
      await loadWorldAchievements();
      setNpcDialogues(prev => ({
        ...prev,
        [npc.id]: {
          text: action.response,
          intent: action.intent,
          createdAt: Date.now(),
        },
      }));
      setWorldToast(action.response);
      if (action.intent.includes('event') || action.intent === 'gift_hunt') setIsActionFeedOpen(true);
    } catch (err) {
      console.warn('NPC interaction failed:', err);
      setWorldToast('NPC interaction failed');
    } finally {
      setPendingNpcIntent(null);
    }
  }, [activeCircleId, activeLandScopeKey, ensureGuild, ensureParty, focusWorldDistrict, getNpcPositionVector, joinWorldEvent, loadWorldAchievements, onMinimapMoveTarget, rallyWorldEvent, selfPosition, user?.sub]);

  React.useEffect(() => {
    if (!queuedNpcAction) return;

    const npc = WORLD_NPCS.find(item => item.id === queuedNpcAction.npcId);
    const action = npc?.actions.find(item => item.intent === queuedNpcAction.actionIntent);
    if (!npc || !action) {
      setQueuedNpcAction(null);
      setPendingNpcIntent(null);
      return;
    }

    const queueAge = Date.now() - queuedNpcAction.createdAt;
    if (queueAge > NPC_ACTION_QUEUE_TTL_MS) {
      setQueuedNpcAction(null);
      setPendingNpcIntent(null);
      setWorldToast(`Could not get close enough to ${npc.name}`);
      return;
    }

    const npcPosition = vectorToObject(getNpcPositionVector(npc));
    const distance = getPresenceDistance(selfPosition, npcPosition);
    if (distance > NPC_INTERACTION_RANGE) {
      moveTargetRef.current.copy(getFollowDestination(selfPosition, npcPosition));
      setWorldNavigationIntent({
        kind: 'walk_to',
        label: npc.name,
        targetPosition: npcPosition,
        updatedAt: Date.now(),
      });
      const timeout = window.setTimeout(() => {
        setQueuedNpcAction(prev => (
          prev?.createdAt === queuedNpcAction.createdAt &&
          prev.npcId === queuedNpcAction.npcId &&
          prev.actionIntent === queuedNpcAction.actionIntent
            ? null
            : prev
        ));
        setPendingNpcIntent(prev => prev === queuedNpcAction.actionIntent ? null : prev);
        setWorldToast(`Could not get close enough to ${npc.name}`);
      }, Math.max(250, NPC_ACTION_QUEUE_TTL_MS - queueAge));

      return () => window.clearTimeout(timeout);
    }

    setQueuedNpcAction(null);
    setPendingNpcIntent(null);
    void runNpcAction(npc, action, { skipProximityCheck: true });
  }, [getNpcPositionVector, queuedNpcAction, runNpcAction, selfPosition]);

  const onlineCount = Math.max(1, remotePresences.length + 1);
  const visibleOnlineCount = worldInterestStats?.visibleOnline ?? onlineCount;
  const totalOnlineCount = worldInterestStats?.totalOnline ?? onlineCount;
  const onlineCountLabel = totalOnlineCount > visibleOnlineCount
    ? `${visibleOnlineCount}/${totalOnlineCount}`
    : String(visibleOnlineCount);
  const avatarSceneCues = React.useMemo<Record<string, AvatarSceneCue>>(() => {
    const now = Date.now();
    const cues: Record<string, AvatarSceneCue> = {};
    const chatTimestamps = new Map<string, number>();
    const actionTimestamps = new Map<string, number>();
    const requestBadgesByUserId = new Map<string, AvatarRequestCue[]>();

    worldChatMessages.forEach((message) => {
      const timestamp = new Date(message.createdAt).getTime();
      if (!Number.isFinite(timestamp) || now - timestamp > CHAT_BUBBLE_ACTIVE_MS) return;
      if (isNearbySpeechChannel(message) && !isNearbySpeechMessage(message, selfPosition)) return;

      const previous = chatTimestamps.get(message.fromUserId) || 0;
      if (timestamp >= previous) {
        cues[message.fromUserId] = {
          ...cues[message.fromUserId],
          chatMessage: message,
        };
        chatTimestamps.set(message.fromUserId, timestamp);
      }
    });

    worldActions.forEach((action) => {
      const timestamp = new Date(action.createdAt).getTime();
      if (!Number.isFinite(timestamp) || now - timestamp > ACTION_CUE_ACTIVE_MS) return;
      if (action.type === 'view_profile' || action.type === 'activity_feed') return;

      const cueUserId = action.toUserId || action.fromUserId;
      if (!cueUserId) return;

      const previous = actionTimestamps.get(cueUserId) || 0;
      if (timestamp >= previous) {
        cues[cueUserId] = {
          ...cues[cueUserId],
          socialAction: action,
        };
        actionTimestamps.set(cueUserId, timestamp);
      }
    });

    [...worldRequests]
      .filter(request => request.status === 'requested' || request.status === 'accepted')
      .sort((a, b) => {
        const statusRank = (request: WorldSocialAction) => (
          request.status === 'requested' && request.toUserId === userId ? 0 :
            request.status === 'accepted' ? 1 :
              request.status === 'requested' ? 2 : 3
        );
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return statusRank(a) - statusRank(b) || (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
      })
      .forEach((request) => {
        const counterpart = getRequestCounterpart(request, userId);
        if (!counterpart.userId || counterpart.userId === userId) return;
        const cue = getAvatarRequestCue(request, userId);
        if (!cue) return;
        const badges = requestBadgesByUserId.get(counterpart.userId) || [];
        if (badges.length >= 2) return;
        requestBadgesByUserId.set(counterpart.userId, [...badges, cue]);
      });

    remotePresences.forEach((presence) => {
      const relationship = getRelationshipStatus(worldRelationships, userId, presence.userId);
      const remoteEmotePulse = remoteEmotePulses[presence.userId];
      const remoteActivityPulse = remoteActivityPulses[presence.userId];
      const requestBadges = requestBadgesByUserId.get(presence.userId) || [];
      const showRemoteEmote = Boolean(
        remoteEmotePulse &&
        now - remoteEmotePulse.createdAt <= QUICK_EMOTE_ACTIVE_MS
      );
      const showRemoteActivity = Boolean(
        remoteActivityPulse &&
        now - remoteActivityPulse.createdAt <= AVATAR_ACTIVITY_PULSE_ACTIVE_MS
      );
      if (!relationship.label && !showRemoteEmote && !showRemoteActivity && requestBadges.length === 0) return;

      const remoteEmoteMeta = remoteEmotePulse ? getEmoteMeta(remoteEmotePulse.emote) : null;
      cues[presence.userId] = {
        ...cues[presence.userId],
        ...(relationship.label ? { relationshipLabel: relationship.label } : {}),
        ...(showRemoteActivity && remoteActivityPulse ? { activityPulse: remoteActivityPulse } : {}),
        ...(requestBadges.length > 0 ? { requestBadges } : {}),
        ...(showRemoteEmote && remoteEmotePulse && remoteEmoteMeta ? {
          quickEmote: {
            label: remoteEmoteMeta.label,
            icon: remoteEmoteMeta.icon,
            createdAt: remoteEmotePulse.createdAt,
          },
        } : {}),
      };
    });

    if (quickEmotePulse && now - quickEmotePulse.createdAt <= QUICK_EMOTE_ACTIVE_MS) {
      const emoteMeta = getEmoteMeta(quickEmotePulse.emote);
      cues[userId] = {
        ...cues[userId],
        quickEmote: {
          label: emoteMeta.label,
          icon: emoteMeta.icon,
          createdAt: quickEmotePulse.createdAt,
        },
      };
    }

    if (quickActivityPulse && now - quickActivityPulse.createdAt <= AVATAR_ACTIVITY_PULSE_ACTIVE_MS) {
      cues[userId] = {
        ...cues[userId],
        activityPulse: quickActivityPulse,
      };
    }

    return cues;
  }, [quickActivityPulse, quickEmotePulse, remoteActivityPulses, remoteEmotePulses, remotePresences, selfPosition, userId, worldActions, worldChatMessages, worldRelationships, worldRequests]);

  const socialActionLinks = React.useMemo<WorldSocialActionLink[]>(() => {
    const now = Date.now();
    const presences = [selfPresence, ...remotePresences];
    const presenceByUserId = new Map(presences.map(presence => [presence.userId, presence]));

    return worldActions
      .map((action): WorldSocialActionLink | null => {
        if (!action.toUserId || action.toUserId === action.fromUserId) return null;
        if (!SOCIAL_ACTION_LINK_TYPES.has(action.type)) return null;
        const createdAt = new Date(action.createdAt).getTime();
        if (!Number.isFinite(createdAt)) return null;
        const ageMs = now - createdAt;
        if (ageMs < 0 || ageMs > SOCIAL_ACTION_LINK_ACTIVE_MS) return null;

        const fromPresence = presenceByUserId.get(action.fromUserId);
        const toPresence = presenceByUserId.get(action.toUserId);
        if (!fromPresence || !toPresence) return null;

        const meta = getSocialActionLinkMeta(action.type);
        const focusPresence = action.fromUserId === userId ? toPresence : action.toUserId === userId ? fromPresence : toPresence;
        return {
          id: `social-action:${action.id}`,
          action,
          fromPresence,
          toPresence,
          focusPresence,
          label: getActionLabel(action),
          detail: `${action.fromName} -> ${action.toName || toPresence.name}`,
          icon: meta.icon,
          color: meta.color,
          softColor: meta.softColor,
          ageRatio: 1 - THREE.MathUtils.clamp(ageMs / SOCIAL_ACTION_LINK_ACTIVE_MS, 0, 1),
        };
      })
      .filter((link): link is WorldSocialActionLink => Boolean(link))
      .slice(0, 6);
  }, [remotePresences, selfPresence, userId, worldActions]);

  const activityBeacons = React.useMemo<WorldActivityBeacon[]>(() => {
    const now = Date.now();
    const presences = [selfPresence, ...remotePresences];
    const actionBeacons = worldActions
      .filter(action => {
        const timestamp = new Date(action.createdAt).getTime();
        return Number.isFinite(timestamp) && now - timestamp <= 5 * 60 * 1000;
      })
      .slice(0, 5)
      .map<WorldActivityBeacon>(action => {
        const isPortal = typeof action.metadata?.portalName === 'string';
        const isNpc = typeof action.metadata?.npcName === 'string';
        return {
          id: `action:${action.id}`,
          kind: 'action',
          label: getActionLabel(action),
          detail: action.message || action.status,
          icon: isPortal ? 'fa-door-open' : isNpc ? 'fa-user-tie' : getRequestIcon(action.type),
          color: isPortal ? '#ec4899' : isNpc ? '#f59e0b' : '#10b981',
          position: getActionBeaconPosition(action, presences),
          userId: action.fromUserId,
          action,
        };
      });

    const chatBeacons = worldChatMessages
      .filter(message => {
        if (message.channel === 'direct') return false;
        if (isNearbySpeechChannel(message) && !isNearbySpeechMessage(message, selfPosition)) return false;
        const timestamp = new Date(message.createdAt).getTime();
        return Number.isFinite(timestamp) && now - timestamp <= 3 * 60 * 1000;
      })
      .slice(-4)
      .reverse()
      .map<WorldActivityBeacon>(message => {
        const nearbySpeech = isNearbySpeechChannel(message);
        return {
          id: `chat:${message.id}`,
          kind: 'chat',
          label: nearbySpeech ? `${message.fromName} nearby` : `${message.fromName} said`,
          detail: message.body.slice(0, 54),
          icon: nearbySpeech ? 'fa-location-dot' : 'fa-comment',
          color: nearbySpeech ? '#f59e0b' : message.channel === 'guild' ? '#059669' : message.channel === 'party' ? '#ec4899' : '#38bdf8',
          position: getChatBeaconPosition(message, presences),
          userId: message.fromUserId,
          message,
        };
      });

    return [...actionBeacons, ...chatBeacons]
      .sort((a, b) => {
        const aTime = new Date(a.action?.createdAt || a.message?.createdAt || '').getTime();
        const bTime = new Date(b.action?.createdAt || b.message?.createdAt || '').getTime();
        return bTime - aTime;
      })
      .slice(0, 8);
  }, [remotePresences, selfPosition, selfPresence, worldActions, worldChatMessages]);

  const voiceMarkers = React.useMemo<WorldVoiceMarker[]>(() => {
    const markers: WorldVoiceMarker[] = [];
    const allPresences = [selfPresence, ...remotePresences];
    const usedRoomIds = new Set<string>();

    const addRoomMarker = (room: WorldVoiceRoom, active: boolean) => {
      if (usedRoomIds.has(room.id) || room.members.length === 0) return;
      usedRoomIds.add(room.id);

      const meta = getVoiceKindMeta(room.kind);
      const activeMemberCount = room.members.filter(member => member.status === 'active').length || room.members.length;
      const openMemberCount = getVoiceOpenMemberCount(room);
      const activeMicDetail = active && !isVoiceMuted && voiceInputPercent > 0 ? ` / mic ${voiceInputPercent}%` : '';
      markers.push({
        id: `voice-room:${room.id}`,
        kind: 'room',
        label: active ? 'Your Voice Room' : room.name,
        detail: active
          ? `${openMemberCount}/${Math.max(activeMemberCount, 1)} open mics${activeMicDetail}`
          : `${activeMemberCount} in ${meta.label.toLowerCase()}`,
        icon: active ? 'fa-headset' : meta.icon,
        color: active ? '#8b5cf6' : meta.color,
        position: getVoiceRoomPosition(room, allPresences),
        active,
        muted: active && isVoiceMuted,
        inputLevel: active ? voiceInputLevel : undefined,
        rangeLabel: active && isVoiceMuted ? 'Muted room' : meta.label,
        signalStrength: active && isVoiceMuted ? 1 : active ? Math.max(1, Math.ceil(voiceInputLevel * 3)) : 3,
        room,
      });
    };

    if (activeVoiceRoom) addRoomMarker(activeVoiceRoom, true);
    worldVoiceRooms
      .filter(room => room.id !== activeVoiceRoom?.id && room.status === 'active' && room.members.length > 0)
      .slice(0, 5)
      .forEach(room => addRoomMarker(room, false));

    const nearbyIds = new Set(nearbyVoicePresences.map(item => item.presence.userId));
    const avatarCandidates = [
      ...nearbyVoicePresences,
      ...remotePresences
        .filter(presence => Boolean(presence.voiceRoomId) && !nearbyIds.has(presence.userId))
        .map(presence => ({ presence, distance: getPresenceDistance(selfPosition, presence.position) })),
    ]
      .sort((a, b) => {
        const aInActiveRoom = activeVoiceRoom?.id && a.presence.voiceRoomId === activeVoiceRoom.id ? 0 : 1;
        const bInActiveRoom = activeVoiceRoom?.id && b.presence.voiceRoomId === activeVoiceRoom.id ? 0 : 1;
        return aInActiveRoom - bInActiveRoom || a.distance - b.distance;
      })
      .slice(0, 6);

    avatarCandidates.forEach(({ presence, distance }) => {
      const inActiveRoom = Boolean(activeVoiceRoom?.id && presence.voiceRoomId === activeVoiceRoom.id);
      const signalMeta = getVoiceSignalMeta(distance);
      markers.push({
        id: `voice-avatar:${presence.userId}`,
        kind: 'avatar',
        label: presence.name,
        detail: inActiveRoom
          ? presence.isVoiceMuted ? 'Muted in your room' : 'Open mic in your room'
          : presence.voiceRoomName ? `In ${presence.voiceRoomName}` : `${signalMeta.label} / ${distance.toFixed(1)}m`,
        icon: presence.voiceRoomName ? 'fa-headset' : 'fa-microphone',
        color: inActiveRoom ? '#8b5cf6' : presence.voiceRoomName ? '#a855f7' : '#38bdf8',
        position: offsetPosition(presence.position, `voice-avatar:${presence.userId}`, 0.72),
        active: inActiveRoom,
        muted: presence.isVoiceMuted,
        distance,
        rangeLabel: inActiveRoom ? 'Same room' : signalMeta.label,
        signalStrength: inActiveRoom && presence.isVoiceMuted ? 1 : signalMeta.strength,
        presence,
      });
    });

    return markers
      .sort((a, b) => Number(b.active) - Number(a.active) || (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, 12);
  }, [activeVoiceRoom, isVoiceMuted, nearbyVoicePresences, remotePresences, selfPosition, selfPresence, voiceInputLevel, voiceInputPercent, worldVoiceRooms]);

  const onSelectVoiceMarker = React.useCallback(async (marker: WorldVoiceMarker) => {
    if (marker.presence) {
      onSelectPresence(marker.presence);
      if (marker.presence.voiceRoomId && marker.presence.voiceRoomId === activeVoiceRoom?.id) {
        setWorldToast(`${marker.presence.name} is linked in voice`);
        return;
      }

      await joinVoiceRoom('direct', { userId: marker.presence.userId, name: marker.presence.name }, undefined, { openPanel: false });
      return;
    }

    if (!marker.room) return;

    if (marker.room.id === activeVoiceRoom?.id) {
      setIsVoicePanelOpen(true);
      setWorldToast('Voice room opened');
      return;
    }

    const roomZone = getVoiceRoomZone(marker.room) || currentZone;
    if (marker.room.kind === 'direct') {
      const target = marker.room.members.find(member => member.userId !== userId);
      if (!target) {
        setWorldToast('Direct voice target unavailable');
        return;
      }
      await joinVoiceRoom('direct', { userId: target.userId, name: target.name }, roomZone);
      return;
    }

    await joinVoiceRoom(marker.room.kind, undefined, roomZone);
  }, [activeVoiceRoom?.id, currentZone, joinVoiceRoom, onSelectPresence, userId]);

  const liveActivityMarkers = React.useMemo<WorldLiveActivityMarker[]>(() => {
    const markers: WorldLiveActivityMarker[] = [];
    const allPresences = [selfPresence, ...remotePresences];

    if (worldEvent && worldEvent.status === 'active') {
      const joinedEvent = worldEvent.participants.some(participant => participant.userId === userId && participant.status === 'attending');
      const rallyCount = getWorldEventMetadataNumber(worldEvent, 'rallyCount');
      const eventDetail = [
        `${worldEvent.participants.length} attending`,
        joinedEvent ? 'joined' : '',
        rallyCount > 0 ? `${rallyCount} rallies` : '',
      ].filter(Boolean).join(' - ');
      markers.push({
        id: `event:${worldEvent.id}`,
        kind: 'event',
        label: worldEvent.title,
        detail: eventDetail,
        icon: 'fa-star',
        color: '#ec4899',
        position: getEventMarkerPosition(worldEvent),
        active: joinedEvent,
        event: worldEvent,
      });
    }

    if (worldParty?.id) {
      const partyPresences = allPresences.filter(presence => presence.partyId === worldParty.id);
      if (partyPresences.length > 1) {
        markers.push({
          id: `party-rally:${worldParty.id}`,
          kind: 'party',
          label: worldParty.name,
          detail: `${partyPresences.length} online party members`,
          icon: 'fa-users',
          color: '#ec4899',
          position: getPresenceClusterPosition(partyPresences, `party-rally:${worldParty.id}`, getDistrictForZoneName(currentZone)),
          active: true,
          groupMembers: partyPresences.map(presence => ({
            id: presence.userId,
            name: presence.name,
            status: presence.status,
            color: getStatusMeta(presence.status).color,
          })),
        });
      }
    }

    if (worldGuild?.id) {
      const guildPresences = allPresences.filter(presence => presence.guildId === worldGuild.id);
      if (guildPresences.length > 1) {
        markers.push({
          id: `guild-rally:${worldGuild.id}`,
          kind: 'guild',
          label: worldGuild.name,
          detail: `${guildPresences.length} online guild members`,
          icon: 'fa-shield-heart',
          color: '#059669',
          position: getPresenceClusterPosition(guildPresences, `guild-rally:${worldGuild.id}`, getDistrictForZoneName(currentZone)),
          active: true,
          groupMembers: guildPresences.map(presence => ({
            id: presence.userId,
            name: presence.name,
            status: presence.status,
            color: getStatusMeta(presence.status).color,
          })),
        });
      }
    }

    interactionSessions.slice(0, 5).forEach((session) => {
      const counterpart = getRequestCounterpart(session, userId);
      const active = session.id === activeSessionId;
      const sessionAccent = getSessionAccent(session.type);
      const readyState = getSessionReadyState(session, userId);
      markers.push({
        id: `session:${session.id}`,
        kind: 'session',
        label: session.type === 'trade' ? 'Trade Table' : 'Collaboration Table',
        detail: `${counterpart.name} - ${readyState.readyCount}/2 ready`,
        icon: sessionAccent.icon,
        color: session.type === 'trade' ? '#d97706' : '#0369a1',
        position: getSessionMarkerPosition(session, allPresences),
        active,
        session,
      });
    });

    return markers;
  }, [activeSessionId, currentZone, interactionSessions, remotePresences, selfPresence, userId, worldEvent, worldGuild, worldParty]);

  const onSelectLiveActivityMarker = React.useCallback(async (marker: WorldLiveActivityMarker) => {
    if (marker.kind === 'party') {
      setSelectedDistrict(getDistrictForZoneName(currentZone));
      setSelectedPortal(null);
      setSelectedNpc(null);
      setSelectedPresence(null);
      setSelectedLandObject(null);
      setIsSelectedDirectChatOpen(false);
      onMinimapMoveTarget(getMiniMapVector(marker.position), marker.label);
      setWorldToast(`${marker.label} rally selected`);
      return;
    }

    if (marker.kind === 'guild') {
      setSelectedDistrict(getDistrictForZoneName(currentZone));
      setSelectedPortal(null);
      setSelectedNpc(null);
      setSelectedPresence(null);
      setSelectedLandObject(null);
      setIsSelectedDirectChatOpen(false);
      onMinimapMoveTarget(getMiniMapVector(marker.position), marker.label);
      setWorldToast(`${marker.label} rally selected`);
      return;
    }

    if (marker.event) {
      const district = getEventDistrict(marker.event);
      setSelectedDistrict(district);
      setSelectedPortal(null);
      setSelectedNpc(null);
      setSelectedPresence(null);
      setSelectedLandObject(null);
      setIsSelectedDirectChatOpen(false);
      onMinimapMoveTarget(getMiniMapVector(marker.position), marker.event.title);

      const joinedEvent = marker.event.participants.some(participant => participant.userId === userId && participant.status === 'attending');
      if (joinedEvent) {
        setWorldToast(`${marker.event.title} rally selected`);
        return;
      }

      await joinWorldEvent(marker.event.district || currentZone, marker.event.id, { openPanel: false });
      return;
    }

    if (marker.session) {
      setActiveSessionId(marker.session.id);
      setSelectedDistrict(getSessionDistrict(marker.session));
      setSelectedPortal(null);
      setSelectedNpc(null);
      setSelectedPresence(null);
      setSelectedLandObject(null);
      setIsSelectedDirectChatOpen(false);
      onMinimapMoveTarget(getMiniMapVector(marker.position), getRequestTitle(marker.session.type));
      setWorldToast(`${getRequestTitle(marker.session.type)} session selected`);
    }
  }, [currentZone, joinWorldEvent, onMinimapMoveTarget, userId]);

  const livePrompt = React.useMemo<WorldLivePrompt | null>(() => {
    const markerPrompts = liveActivityMarkers
      .map((marker): WorldLivePrompt => {
        const meta = getLiveMarkerPromptMeta(marker);
        const distance = getWorldPointDistance(selfPosition, marker.position);
        return {
          key: `marker:${marker.id}`,
          source: 'marker',
          eyebrow: meta.eyebrow,
          title: marker.label,
          detail: marker.detail,
          icon: marker.icon,
          color: meta.color,
          distance,
          primaryLabel: meta.primaryLabel,
          secondaryLabel: meta.secondaryLabel,
          marker,
        };
      })
      .filter((prompt) => {
        if (prompt.key === dismissedLivePromptKey) return false;
        if (prompt.marker?.kind === 'session') return prompt.distance <= LIVE_PROMPT_SESSION_RANGE || Boolean(prompt.marker.active);
        return prompt.distance <= LIVE_PROMPT_MARKER_RANGE;
      });

    const avatarPrompts = nearbyWorldPresences
      .map(({ presence, distance }): WorldLivePrompt | null => {
        if (presence.status === 'afk') return null;
        const joinKind = getAvatarActivityJoinKind(presence);
        if (joinKind === 'nearby') return null;
        const meta = getPresencePromptMeta(presence, joinKind);
        return {
          key: `presence:${joinKind}:${presence.userId}:${presence.currentZone}`,
          source: 'presence',
          eyebrow: meta.eyebrow,
          title: presence.name,
          detail: meta.detail,
          icon: meta.icon,
          color: meta.color,
          distance,
          primaryLabel: meta.primaryLabel,
          secondaryLabel: meta.secondaryLabel,
          presence,
          joinKind,
        };
      })
      .filter((prompt): prompt is WorldLivePrompt => Boolean(prompt))
      .filter(prompt => prompt.key !== dismissedLivePromptKey && prompt.distance <= LIVE_PROMPT_AVATAR_RANGE);

    return [...markerPrompts, ...avatarPrompts]
      .sort((a, b) => getLivePromptPriority(a) - getLivePromptPriority(b) || a.distance - b.distance)[0] || null;
  }, [dismissedLivePromptKey, liveActivityMarkers, nearbyWorldPresences, selfPosition]);

  const worldPulseEntries = React.useMemo<WorldPulseEntry[]>(() => {
    const allPresences = [selfPresence, ...remotePresences];
    const nearestPresence = (items: WorldPresence[]) => (
      [...items]
        .sort((a, b) => {
          const aIsSelf = a.userId === userId ? 1 : 0;
          const bIsSelf = b.userId === userId ? 1 : 0;
          return aIsSelf - bIsSelf || getPresenceDistance(selfPosition, a.position) - getPresenceDistance(selfPosition, b.position);
        })[0]
    );

    const recentPublicChats = worldChatMessages
      .filter(message => (
        message.channel !== 'direct' &&
        (!isNearbySpeechChannel(message) || isNearbySpeechMessage(message, selfPosition))
      ))
      .slice(-5);
    const latestPublicChat = recentPublicChats[recentPublicChats.length - 1];
    const latestChatPresence = latestPublicChat
      ? allPresences.find(presence => presence.userId === latestPublicChat.fromUserId)
      : undefined;
    const chatUserIds = new Set(recentPublicChats.map(message => message.fromUserId));
    const chattingPresences = allPresences.filter(presence => (
      chatUserIds.has(presence.userId) ||
      presence.intent?.kind === 'chat' ||
      /chat|talk/i.test(`${presence.activity} ${presence.status}`)
    ));
    const movingPresences = allPresences.filter(presence => presence.moving || presence.animation === 'walk');
    const voicePresences = allPresences.filter(presence => Boolean(presence.voiceRoomId));
    const eventPresences = allPresences.filter(presence => (
      Boolean(presence.eventId) ||
      presence.intent?.kind === 'event' ||
      /event|attending|gathering/i.test(`${presence.activity} ${presence.status}`)
    ));
    const tradePresences = allPresences.filter(presence => (
      presence.intent?.kind === 'trade' ||
      /trade|trading|market/i.test(`${presence.activity} ${presence.status}`)
    ));
    const afkPresences = allPresences.filter(presence => presence.status === 'afk');
    const eventMarker = liveActivityMarkers.find(marker => marker.kind === 'event');
    const voiceMarker = voiceMarkers.find(marker => marker.active) || voiceMarkers[0];
    const tradeMarker = liveActivityMarkers.find(marker => marker.kind === 'session' && marker.session?.type === 'trade');

    const entries: Array<WorldPulseEntry | null> = [
      movingPresences.length > 0 ? {
        kind: 'moving' as const,
        label: 'Moving',
        detail: nearestPresence(movingPresences)?.name || 'Paths active',
        icon: 'fa-person-walking',
        color: '#0f766e',
        count: movingPresences.length,
        presence: nearestPresence(movingPresences),
      } : null,
      chattingPresences.length > 0 || recentPublicChats.length > 0 ? {
        kind: 'chat' as const,
        label: latestPublicChat && isNearbySpeechChannel(latestPublicChat) ? 'Nearby' : 'Chat',
        detail: latestPublicChat ? `${latestPublicChat.fromName}: ${latestPublicChat.body.slice(0, 26)}` : nearestPresence(chattingPresences)?.name || 'World chat',
        icon: latestPublicChat && isNearbySpeechChannel(latestPublicChat) ? 'fa-location-dot' : 'fa-comment',
        color: latestPublicChat && isNearbySpeechChannel(latestPublicChat) ? '#f59e0b' : '#ec4899',
        count: Math.max(chattingPresences.length, recentPublicChats.length),
        presence: latestChatPresence || nearestPresence(chattingPresences),
        chatMessage: latestPublicChat,
      } : null,
      voicePresences.length > 0 || voiceMarker ? {
        kind: 'voice' as const,
        label: 'Voice',
        detail: voiceMarker?.label || nearestPresence(voicePresences)?.voiceRoomName || 'Voice nearby',
        icon: 'fa-microphone',
        color: '#8b5cf6',
        count: Math.max(voicePresences.length, voiceMarker ? 1 : 0),
        presence: nearestPresence(voicePresences),
        voiceMarker,
      } : null,
      eventPresences.length > 0 || eventMarker ? {
        kind: 'event' as const,
        label: 'Event',
        detail: eventMarker?.label || nearestPresence(eventPresences)?.eventName || 'Gathering',
        icon: 'fa-star',
        color: '#f59e0b',
        count: Math.max(eventPresences.length, eventMarker?.event?.participants.length || 0, eventMarker ? 1 : 0),
        presence: nearestPresence(eventPresences),
        marker: eventMarker,
      } : null,
      tradePresences.length > 0 || tradeMarker ? {
        kind: 'trade' as const,
        label: 'Trade',
        detail: tradeMarker?.label || nearestPresence(tradePresences)?.name || 'Market active',
        icon: 'fa-handshake',
        color: '#d97706',
        count: Math.max(tradePresences.length, tradeMarker ? 1 : 0),
        presence: nearestPresence(tradePresences),
        marker: tradeMarker,
      } : null,
      afkPresences.length > 0 ? {
        kind: 'afk' as const,
        label: 'AFK',
        detail: nearestPresence(afkPresences)?.name || 'Resting',
        icon: 'fa-mug-hot',
        color: '#78716c',
        count: afkPresences.length,
        presence: nearestPresence(afkPresences),
      } : null,
    ];

    return entries.filter((entry): entry is WorldPulseEntry => entry !== null).slice(0, 6);
  }, [liveActivityMarkers, remotePresences, selfPosition, selfPresence, userId, voiceMarkers, worldChatMessages]);

  const runLivePromptPrimary = React.useCallback(async () => {
    if (!livePrompt) return;
    markWorldActive();

    if (livePrompt.marker) {
      await onSelectLiveActivityMarker(livePrompt.marker);
      return;
    }

    if (livePrompt.presence) await joinAvatarActivity(livePrompt.presence);
  }, [joinAvatarActivity, livePrompt, markWorldActive, onSelectLiveActivityMarker]);

  const runLivePromptSecondary = React.useCallback(async () => {
    if (!livePrompt) return;
    markWorldActive();

    if (livePrompt.marker?.kind === 'event') {
      await rallyWorldEvent(currentZone, { openPanel: false });
      return;
    }

    if (livePrompt.marker?.kind === 'session' && livePrompt.marker.session) {
      openSessionChat(livePrompt.marker.session);
      return;
    }

    if (livePrompt.marker?.kind === 'party' && worldParty) {
      setChatTarget(null);
      setChatChannel('party');
      setChatSpatialMode('world');
      setIsSelectedDirectChatOpen(false);
      setIsChatPanelOpen(true);
      setWorldToast(`${worldParty.name} chat opened`);
      return;
    }

    if (livePrompt.marker?.kind === 'guild' && worldGuild) {
      setChatTarget(null);
      setChatChannel('guild');
      setChatSpatialMode('world');
      setIsSelectedDirectChatOpen(false);
      setIsChatPanelOpen(true);
      setWorldToast(`${worldGuild.name} chat opened`);
      return;
    }

    if (livePrompt.presence) {
      openDirectChat(livePrompt.presence);
      setSelectedPresence(livePrompt.presence);
      setWorldToast(`Chat opened with ${livePrompt.presence.name}`);
    }
  }, [currentZone, livePrompt, markWorldActive, openDirectChat, openSessionChat, rallyWorldEvent, worldGuild, worldParty]);

  const focusPulsePresence = React.useCallback((presence?: WorldPresence) => {
    if (!presence) return false;
    markWorldActive();
    if (presence.userId === userId) {
      setIsPresencePanelOpen(true);
      setWorldToast('Your live presence is broadcasting');
      return true;
    }

    onSelectPresence(presence);
    onMinimapMoveTarget(getFollowDestination(selfPosition, presence.position), presence.name);
    return true;
  }, [markWorldActive, onMinimapMoveTarget, onSelectPresence, selfPosition, userId]);

  const onSelectWorldPulse = React.useCallback(async (entry: WorldPulseEntry) => {
    markWorldActive();

    if (entry.marker) {
      await onSelectLiveActivityMarker(entry.marker);
      return;
    }

    if (entry.voiceMarker) {
      await onSelectVoiceMarker(entry.voiceMarker);
      return;
    }

    if (entry.chatMessage) {
      setChatChannel(entry.chatMessage.channel);
      setChatSpatialMode(isNearbySpeechChannel(entry.chatMessage) ? 'nearby' : 'world');
      setChatTarget(entry.presence || null);
      setIsChatPanelOpen(true);
      if (entry.presence && entry.presence.userId !== userId) onSelectPresence(entry.presence);
      setWorldToast(`Opened ${getChatAudience(entry.chatMessage)} chat`);
      return;
    }

    if (focusPulsePresence(entry.presence)) return;

    if (entry.kind === 'voice') {
      setIsVoicePanelOpen(true);
      setWorldToast('Voice panel opened');
      return;
    }

    if (entry.kind === 'event') {
      const eventDistrict = worldEvent ? getEventDistrict(worldEvent) : getDistrictById('event-lawn');
      setSelectedDistrict(eventDistrict);
      setSelectedPortal(null);
      setSelectedNpc(null);
      setSelectedPresence(null);
      setSelectedLandObject(null);
      setIsSelectedDirectChatOpen(false);
      onMinimapMoveTarget(getMiniMapVector(eventDistrict.position), eventDistrict.name);
      setWorldToast(`${entry.label} selected`);
      return;
    }

    if (entry.kind === 'trade') {
      const marketDistrict = getDistrictById('market');
      setSelectedDistrict(marketDistrict);
      setSelectedPortal(null);
      setSelectedNpc(null);
      setSelectedPresence(null);
      setSelectedLandObject(null);
      setIsSelectedDirectChatOpen(false);
      onMinimapMoveTarget(getMiniMapVector(marketDistrict.position), marketDistrict.name);
      setWorldToast('Market district selected');
    }
  }, [focusPulsePresence, markWorldActive, onMinimapMoveTarget, onSelectLiveActivityMarker, onSelectPresence, onSelectVoiceMarker, userId, worldEvent]);

  const recentTargetActions = React.useMemo(() => {
    if (!selectedPresence) return [];
    return worldActions
      .filter(action => action.fromUserId === selectedPresence.userId || action.toUserId === selectedPresence.userId)
      .slice(0, 3);
  }, [selectedPresence, worldActions]);
  const selectedActivityEntries = React.useMemo<SelectedActivityEntry[]>(() => {
    if (!selectedPresence || selectedActivityFeed?.userId !== selectedPresence.userId) return [];
    return [
      ...selectedActivityFeed.actions.map(action => ({
        id: `action:${action.id}`,
        kind: 'action' as const,
        createdAt: action.createdAt,
        action,
      })),
      ...selectedActivityFeed.chatMessages.map(message => ({
        id: `chat:${message.id}`,
        kind: 'chat' as const,
        createdAt: message.createdAt,
        message,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [selectedActivityFeed, selectedPresence]);
  const selectedLiveActivityEntries = React.useMemo<SelectedActivityEntry[]>(() => {
    if (!selectedPresence) return [];
    return [
      ...worldActions
        .filter(action => action.fromUserId === selectedPresence.userId || action.toUserId === selectedPresence.userId)
        .map(action => ({
          id: `action:${action.id}`,
          kind: 'action' as const,
          createdAt: action.createdAt,
          action,
        })),
      ...worldChatMessages
        .filter(message => message.fromUserId === selectedPresence.userId || message.toUserId === selectedPresence.userId)
        .map(message => ({
          id: `chat:${message.id}`,
          kind: 'chat' as const,
          createdAt: message.createdAt,
          message,
        })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [selectedPresence, worldActions, worldChatMessages]);
  const selectedPassportActivityEntries = React.useMemo<SelectedActivityEntry[]>(() => {
    const seen = new Set<string>();
    return [...selectedActivityEntries, ...selectedLiveActivityEntries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((entry) => {
        if (seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      })
      .slice(0, 8);
  }, [selectedActivityEntries, selectedLiveActivityEntries]);
  const selectedDirectChatMessages = React.useMemo<WorldChatMessage[]>(() => {
    if (!selectedPresence) return [];
    return worldChatMessages
      .filter(message => (
        message.channel === 'direct' &&
        (
          (message.fromUserId === userId && message.toUserId === selectedPresence.userId) ||
          (message.fromUserId === selectedPresence.userId && message.toUserId === userId)
        )
      ))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-6);
  }, [selectedPresence, userId, worldChatMessages]);
  const selectedRequests = React.useMemo<WorldSocialAction[]>(() => {
    if (!selectedPresence) return [];
    return worldRequests
      .filter(request => (
        request.status === 'requested' || request.status === 'accepted'
      ))
      .filter(request => (
        request.fromUserId === selectedPresence.userId ||
        request.toUserId === selectedPresence.userId
      ))
      .sort((a, b) => {
        const statusRank = (request: WorldSocialAction) => request.status === 'accepted' ? 0 : 1;
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return statusRank(a) - statusRank(b) || (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
      })
      .slice(0, 4);
  }, [selectedPresence, worldRequests]);
  const selectedVoiceRoom = React.useMemo<WorldVoiceRoom | null>(() => {
    if (!selectedPresence || !activeVoiceRoom) return null;
    const selectedIsMember = activeVoiceRoom.members.some(member => member.userId === selectedPresence.userId);
    if (selectedIsMember) return activeVoiceRoom;
    if (selectedPresence.voiceRoomId && selectedPresence.voiceRoomId === activeVoiceRoom.id) return activeVoiceRoom;
    return null;
  }, [activeVoiceRoom, selectedPresence]);
  const districtPresenceSummary = React.useMemo<Record<string, DistrictPresenceSummary>>(() => {
    const accumulator: Record<string, {
      count: number;
      movingCount: number;
      voiceCount: number;
      activities: Record<string, number>;
      intents: Partial<Record<WorldPresenceIntent['kind'], number>>;
      names: string[];
    }> = {};

    [selfPresence, ...remotePresences].forEach((presence) => {
      const district = getDistrictForPosition(presence.position);
      const activity = presence.activity || 'Exploring';
      const entry = accumulator[district.id] || {
        count: 0,
        movingCount: 0,
        voiceCount: 0,
        activities: {},
        intents: {},
        names: [],
      };
      entry.count += 1;
      if (presence.moving) entry.movingCount += 1;
      if (presence.voiceRoomId && !presence.isVoiceMuted) entry.voiceCount += 1;
      entry.activities[activity] = (entry.activities[activity] || 0) + 1;
      if (presence.intent?.kind) {
        entry.intents[presence.intent.kind] = (entry.intents[presence.intent.kind] || 0) + 1;
      }
      if (presence.name && entry.names.length < 3) entry.names.push(presence.name);
      accumulator[district.id] = entry;
    });

    return Object.fromEntries(
      Object.entries(accumulator).map(([districtId, entry]) => {
        const topActivity = Object.entries(entry.activities)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || 'Exploring';
        const topIntentKind = Object.entries(entry.intents)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] as WorldPresenceIntent['kind'] | undefined;

        return [
          districtId,
          {
            count: entry.count,
            topActivity,
            movingCount: entry.movingCount,
            voiceCount: entry.voiceCount,
            topIntentKind,
            names: entry.names,
          },
        ];
      })
    );
  }, [remotePresences, selfPresence]);
  const selectedProfileAppearance = React.useMemo(
    () => selectedPresence ? getAvatarAppearance(selectedPresence) : DEFAULT_APPEARANCE,
    [selectedPresence]
  );
  const selectedProfileEquipment = React.useMemo(
    () => selectedPresence ? getEquipment(selectedPresence) : DEFAULT_EQUIPMENT,
    [selectedPresence]
  );
  const selectedProfileSummary = selectedPresence && selectedActivityFeed?.userId === selectedPresence.userId
    ? selectedActivityFeed.profile
    : null;
  const selectedProfilePresence = selectedPresence && selectedActivityFeed?.userId === selectedPresence.userId
    ? selectedActivityFeed.presence
    : null;
  const selectedRelationship = React.useMemo(
    () => selectedPresence ? getRelationshipStatus(worldRelationships, userId, selectedPresence.userId) : null,
    [selectedPresence, userId, worldRelationships]
  );
  const nearbyAvatarPrompt = React.useMemo(() => {
    const closest = nearbyWorldPresences.find(({ presence }) => (
      presence.userId !== selectedPresence?.userId &&
      presence.userId !== livePrompt?.presence?.userId
    ));
    if (!closest || closest.distance > NEARBY_AVATAR_PROMPT_RANGE) return null;

    return {
      ...closest,
      activityMeta: getActivityMeta(closest.presence.activity),
      statusMeta: getStatusMeta(closest.presence.status),
      relationship: getRelationshipStatus(worldRelationships, userId, closest.presence.userId),
      ready: closest.distance <= AVATAR_INTERACTION_RANGE,
    };
  }, [livePrompt?.presence?.userId, nearbyWorldPresences, selectedPresence?.userId, userId, worldRelationships]);
  const selectedQueuedAction = React.useMemo(() => {
    if (!selectedPresence || queuedAvatarAction?.targetUserId !== selectedPresence.userId) return null;
    return getWorldActionDescriptor(queuedAvatarAction.type);
  }, [queuedAvatarAction, selectedPresence]);
  const activeSessionCounterpart = React.useMemo(
    () => activeInteractionSession ? getRequestCounterpart(activeInteractionSession, userId) : null,
    [activeInteractionSession, userId]
  );
  const activeSessionAccent = React.useMemo(
    () => activeInteractionSession ? getSessionAccent(activeInteractionSession.type) : null,
    [activeInteractionSession]
  );
  const activeSessionReadyState = React.useMemo(
    () => activeInteractionSession ? getSessionReadyState(activeInteractionSession, userId) : null,
    [activeInteractionSession, userId]
  );
  const currentActivityMeta = getActivityMeta(selfPresence.activity);
  const currentStatusMeta = getStatusMeta(selfPresence.status);
  const currentEmoteMeta = getEmoteMeta(selfPresence.emote || currentProfile.emote);
  const currentCosmetics = getAvatarCosmetics(currentProfile);
  const presenceModeLabel = isAutoAway
    ? 'Idle AFK'
    : autoZonePresenceEnabled ? zonePresenceMeta.label : 'Manual presence';
  const worldStreamAgeSeconds = worldStreamLastSeenAt
    ? Math.max(0, Math.floor((worldStreamNow - worldStreamLastSeenAt) / 1000))
    : null;
  const isWorldStreamFresh = Boolean(
    isWorldStreamConnected &&
    worldStreamLastSeenAt &&
    worldStreamNow - worldStreamLastSeenAt <= WORLD_STREAM_STALE_AFTER_MS
  );
  const worldStreamStatusLabel = isWorldStreamFresh
    ? `Live ${worldStreamAgeSeconds ?? 0}s`
    : 'Fallback';
  const selectedDistrictPrimaryAction = selectedDistrict ? getDistrictPrimaryAction(selectedDistrict) : null;
  const arrivalDistrict = zoneArrivalPrompt && zoneArrivalPrompt.districtId === activeDistrict.id && !selectedDistrict
    ? activeDistrict
    : null;
  const arrivalPrimaryAction = arrivalDistrict ? getDistrictPrimaryAction(arrivalDistrict) : null;
  const arrivalSummary = arrivalDistrict ? districtPresenceSummary[arrivalDistrict.id] : null;
  const selectedLandObjectMeta = selectedLandObject ? getLandObjectMeta(selectedLandObject) : null;
  const selectedLandObjectPosition = selectedLandObject ? getLandObjectPosition(selectedLandObject) : null;
  const objectCartPortal = WORLD_PORTALS.find(portal => portal.id === 'shop') || null;
  const followUserAction = getWorldActionDescriptor('follow_user');
  const startChatAction = getWorldActionDescriptor('start_chat');
  const activePortal = selectedPortal && activePortalPanelId === selectedPortal.id ? selectedPortal : null;
  const portalTimelineItems = React.useMemo(
    () => [...timeline]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5),
    [timeline]
  );
  const portalMemoryItems = React.useMemo(() => memories.slice(0, 6), [memories]);
  const portalCouponItems = React.useMemo(() => coupons.slice(0, 5), [coupons]);
  const portalLetterItems = React.useMemo(
    () => [...loveLetters]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5),
    [loveLetters]
  );
  const cycleWorkshopColor = React.useCallback((key: WorkshopColorKey) => {
    const swatches = key === 'bodyColor' ? BODY_SWATCHES : key === 'trimColor' ? TRIM_SWATCHES : HAIR_SWATCHES;
    const currentColor = currentProfile.appearance[key];
    const currentIndex = swatches.findIndex(color => color.toLowerCase() === currentColor.toLowerCase());
    const nextColor = swatches[(currentIndex + 1 + swatches.length) % swatches.length];
    void saveCharacterProfile({
      appearance: {
        ...currentProfile.appearance,
        [key]: nextColor,
      },
    });
  }, [currentProfile.appearance, saveCharacterProfile]);
  const cycleWorkshopCosmetic = React.useCallback((key: WorkshopCosmeticKey) => {
    const options = key === 'aura'
      ? COSMETIC_AURAS
      : key === 'trail'
        ? COSMETIC_TRAILS
        : COSMETIC_NAMEPLATES;
    const activeId = currentCosmetics[key];
    const currentIndex = options.findIndex(option => option.id === activeId);
    const nextOption = options[(currentIndex + 1 + options.length) % options.length];
    void saveCharacterProfile({
      cosmetics: {
        ...currentProfile.cosmetics,
        [key]: nextOption.id,
      },
    });
  }, [currentCosmetics, currentProfile.cosmetics, saveCharacterProfile]);
  const cycleWorkshopEquipment = React.useCallback((slot: WorldInventorySlot) => {
    const slotMeta = INVENTORY_SLOTS.find(item => item.slot === slot);
    const slotItems = worldInventory.filter(item => item.slot === slot);
    const currentKey = currentProfile.equipment[slot] || 'none';
    if (slotItems.length === 0 && currentKey === 'none') {
      setWorldToast(`No ${slotMeta?.label || slot} gear owned yet`);
      return;
    }

    const cycleKeys = ['none', ...slotItems.map(item => item.itemKey)];
    const currentIndex = cycleKeys.indexOf(currentKey);
    const nextKey = cycleKeys[(currentIndex + 1 + cycleKeys.length) % cycleKeys.length];
    void equipInventoryItem(slot, nextKey === 'none' ? undefined : nextKey);
  }, [currentProfile.equipment, equipInventoryItem, worldInventory]);
  const workshopControls = React.useMemo<DistrictWorkshopControls>(() => ({
    appearance: currentProfile.appearance,
    cosmetics: currentCosmetics,
    equipment: currentProfile.equipment,
    inventory: worldInventory,
    isSaving: isSavingCharacter,
    isEquippingItem,
    onCycleColor: cycleWorkshopColor,
    onCycleCosmetic: cycleWorkshopCosmetic,
    onCycleEquipment: cycleWorkshopEquipment,
  }), [
    currentCosmetics,
    currentProfile.appearance,
    currentProfile.equipment,
    cycleWorkshopColor,
    cycleWorkshopCosmetic,
    cycleWorkshopEquipment,
    isEquippingItem,
    isSavingCharacter,
    worldInventory,
  ]);
  const runMarketCatalogItem = React.useCallback((item: WorldInventoryCatalogItem) => {
    if (item.isOwned) {
      void equipInventoryItem(item.slot, item.itemKey);
      return;
    }

    void purchaseMarketItem(item);
  }, [equipInventoryItem, purchaseMarketItem]);
  const marketControls = React.useMemo<DistrictMarketControls>(() => ({
    catalog: worldMarketCatalog,
    balance: marketBalance,
    isPurchasingItem,
    isEquippingItem,
    onSelectCatalogItem: runMarketCatalogItem,
  }), [isEquippingItem, isPurchasingItem, marketBalance, runMarketCatalogItem, worldMarketCatalog]);
  const guildTitleControls = React.useMemo<DistrictTitleControls>(() => ({
    achievements: worldAchievements.filter(achievement => Boolean(achievement.titleReward)).slice(0, 6),
    currentTitle: currentProfile.title,
    isEquippingTitle,
    onEquipTitle: equipAchievementTitle,
  }), [currentProfile.title, equipAchievementTitle, isEquippingTitle, worldAchievements]);
  const eventLawnZone = React.useMemo(
    () => getZoneName(activeLandName, getDistrictById('event-lawn')),
    [activeLandName]
  );
  const eventControls = React.useMemo<DistrictEventControls>(() => ({
    event: worldEvent,
    isJoined: isJoinedEvent,
    isUpdating: isEventUpdating,
    rallyCount: eventRallyCount,
    lastRallyBy: eventLastRallyBy || undefined,
    onJoin: () => {
      void joinWorldEvent(eventLawnZone, worldEvent?.id, { openPanel: false });
    },
    onLeave: () => {
      void leaveWorldEvent(eventLawnZone);
    },
    onRally: () => {
      void rallyWorldEvent(eventLawnZone, { openPanel: false });
    },
  }), [
    eventLastRallyBy,
    eventLawnZone,
    eventRallyCount,
    isEventUpdating,
    isJoinedEvent,
    joinWorldEvent,
    leaveWorldEvent,
    rallyWorldEvent,
    worldEvent,
  ]);

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden bg-[#cfe8cf]"
      onPointerDown={handleWorldPointerDown}
      onPointerMove={handleWorldPointerMove}
      onPointerUp={handleWorldPointerEnd}
      onPointerCancel={handleWorldPointerEnd}
      onWheel={handleWorldWheel}
    >
      <CommonsScene
        movement={movement}
        selfPresence={selfPresence}
        sceneCues={avatarSceneCues}
        activeDistrict={activeDistrict}
        selectedDistrict={selectedDistrict}
        selectedPortal={selectedPortal}
        selectedLandObject={selectedLandObject}
        activityBeacons={activityBeacons}
        voiceMarkers={voiceMarkers}
        liveActivityMarkers={liveActivityMarkers}
        livePrompt={livePrompt}
        currentWorldIntent={currentWorldIntent}
        socialActionLinks={socialActionLinks}
        proximityVoiceRange={proximityVoiceRange}
        worldInterest={worldInterest}
        worldInterestStats={worldInterestStats}
        isWorldStreamFresh={isWorldStreamFresh}
        npcDialogues={visibleNpcDialogues}
        eventRallyPulse={eventRallyPulse}
        districtPresenceSummary={districtPresenceSummary}
        landObjects={landObjects}
        remotePresences={remotePresences}
        selectedNpc={selectedNpc}
        selectedNpcDistance={selectedNpcDistance}
        selectedPresence={selectedPresence}
        selectedRelationship={selectedRelationship}
        selectedActivityEntries={selectedPassportActivityEntries}
        selectedActivityFeedUserId={selectedActivityFeed?.userId ?? null}
        isSelectedActivityLoading={isLoadingSelectedActivity}
        isSelectedActivityOpen={isSelectedActivityOpen}
        selectedProfileSummary={selectedProfileSummary}
        selectedProfilePresence={selectedProfilePresence}
        isSelectedProfileOpen={isSelectedProfileOpen}
        isSelectedProfileLoading={isLoadingSelectedProfile}
        isSelectedDirectChatOpen={isSelectedDirectChatOpen && chatChannel === 'direct' && chatTarget?.userId === selectedPresence?.userId}
        selectedDirectChatMessages={selectedDirectChatMessages}
        directChatDraft={chatDraft}
        isSendingDirectChat={isSendingChat && chatChannel === 'direct'}
        selectedRequests={selectedRequests}
        pendingRequestId={pendingRequestId}
        selectedVoiceRoom={selectedVoiceRoom}
        voiceMediaLabel={voiceMediaMeta.label}
        voiceInputPercent={voiceInputPercent}
        isVoiceMuted={isVoiceMuted}
        isVoiceUpdating={Boolean(isVoiceUpdating)}
        activeFollowTargetId={activeFollowTargetId}
        queuedAvatarAction={queuedAvatarAction}
        queuedNpcAction={queuedNpcAction}
        pendingActionType={pendingActionType}
        pendingNpcIntent={pendingNpcIntent}
        spawnPosition={spawnPosition}
        spawnRevision={spawnRevision}
        timeline={timeline}
        quality={quality}
        worldCycle={worldCycle}
        cameraMode={cameraMode}
        rotation={rotation}
        zoom={zoom}
        cameraTargetRef={cameraTargetRef}
        moveTargetRef={moveTargetRef}
        onMoveTarget={onMoveTarget}
        onSelfSample={onSelfSample}
        onSelectDistrict={onSelectDistrict}
        onRunDistrictAction={runDistrictAction}
        onOpenDistrictDetails={(district) => {
          setSelectedDistrict(district);
          setIsDistrictPanelOpen(true);
        }}
        onClearDistrictSelection={() => {
          setSelectedDistrict(null);
          setIsDistrictPanelOpen(false);
        }}
        onSelectPortal={onSelectPortal}
        onOpenPortal={openWorldPortal}
        onOpenPortalBoard={openPortalBoard}
        onSelectActivityBeacon={onSelectActivityBeacon}
        onSelectVoiceMarker={onSelectVoiceMarker}
        onSelectLiveActivityMarker={onSelectLiveActivityMarker}
        onRunLivePromptPrimary={runLivePromptPrimary}
        onSelectLandObject={onSelectLandObject}
        onSelectPresence={onSelectPresence}
        onRefreshPresenceActivity={refreshSelectedActivityInWorld}
        onRefreshPresenceProfile={loadSelectedProfile}
        onDirectChatDraftChange={setChatDraft}
        onDirectChatSubmit={sendWorldChat}
        onDirectChatClose={() => setIsSelectedDirectChatOpen(false)}
        onRespondRequest={respondToWorldRequest}
        onOpenRequestContext={openSessionContext}
        onOpenRequestChat={openSessionChat}
        onOpenPresenceSheet={openSelectedPresenceSheet}
        onToggleVoiceMute={toggleVoiceMute}
        onLeaveVoiceRoom={leaveVoiceRoom}
        onRunPresenceAction={runWorldAction}
        onSelectNpc={onSelectNpc}
        onRunNpcAction={runNpcAction}
        onNpcPositionUpdate={updateNpcPosition}
        onFlagClick={onFlagClick}
        districtPartyLabel={worldParty ? worldParty.name : 'Create local party'}
        districtChatCount={worldChatMessages.length}
        isDistrictPartyUpdating={isPartyUpdating}
        workshopControls={workshopControls}
        marketControls={marketControls}
        titleControls={guildTitleControls}
        eventControls={eventControls}
      />

      <WorldMinimap
        selfPresence={selfPresence}
        remotePresences={remotePresences}
        selectedPresence={selectedPresence}
        selectedPortal={selectedPortal}
        selectedNpc={selectedNpc}
        selectedLandObject={selectedLandObject}
        activeDistrict={activeDistrict}
        activeFollowTargetId={activeFollowTargetId}
        voiceMarkers={voiceMarkers}
        liveActivityMarkers={liveActivityMarkers}
        districtPresenceSummary={districtPresenceSummary}
        landObjects={landObjects}
        currentZone={currentZone}
        onlineCount={visibleOnlineCount}
        isWorldStreamConnected={isWorldStreamFresh}
        onMoveTarget={onMinimapMoveTarget}
        onSelectDistrict={onSelectDistrict}
        onSelectPortal={onSelectPortal}
        onSelectNpc={onSelectNpc}
        onSelectVoiceMarker={onSelectVoiceMarker}
        onSelectLiveActivityMarker={onSelectLiveActivityMarker}
        onSelectLandObject={onSelectLandObject}
        onSelectPresence={onSelectPresence}
      />

      <AnimatePresence>
        {cameraGestureLabel && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="pointer-events-none fixed bottom-32 left-1/2 z-[75] -translate-x-1/2 rounded-full border border-white/70 bg-[#fffaf1]/90 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-stone-700 shadow-xl backdrop-blur-xl"
          >
            <i className="fas fa-hand-pointer mr-1.5 text-emerald-700"></i>
            {cameraGestureLabel}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {arrivalDistrict && arrivalPrimaryAction && (
          <motion.div
            key={`${arrivalDistrict.id}:${zoneArrivalPrompt?.enteredAt || 0}`}
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className="pointer-events-auto fixed left-1/2 top-20 z-[78] w-[min(92vw,370px)] -translate-x-1/2 rounded-md border border-white/70 bg-[#fffaf1]/95 p-3 shadow-2xl shadow-emerald-900/10 backdrop-blur-xl max-md:top-24"
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedDistrict(arrivalDistrict);
                  setZoneArrivalPrompt(null);
                }}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-emerald-700">Arrived</span>
                <span className="mt-0.5 flex min-w-0 items-center gap-2">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-white shadow-sm"
                    style={{ backgroundColor: arrivalDistrict.color }}
                  >
                    <i className={`fas ${arrivalDistrict.icon} text-[12px]`}></i>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-stone-800">{arrivalDistrict.name}</span>
                    <span className="block truncate text-[10px] font-bold text-stone-500">
                      {(arrivalSummary?.count || 1)} avatar{(arrivalSummary?.count || 1) === 1 ? '' : 's'} here
                      {arrivalSummary?.topActivity ? ` / ${arrivalSummary.topActivity}` : ''}
                    </span>
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setZoneArrivalPrompt(null)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/80 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                title="Dismiss"
                aria-label="Dismiss district arrival"
              >
                <i className="fas fa-xmark text-[10px]"></i>
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedDistrict(arrivalDistrict);
                  setZoneArrivalPrompt(null);
                }}
                className="min-h-9 rounded-md bg-white/85 px-2 text-[8px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-emerald-50"
              >
                <i className="fas fa-map-location-dot mr-1 text-emerald-700"></i>
                Hub
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoneArrivalPrompt(null);
                  void runDistrictAction(arrivalDistrict, 'primary');
                }}
                className="min-h-9 rounded-md bg-pink-500 px-2 text-[8px] font-black uppercase tracking-wider text-white shadow-sm shadow-pink-200 transition hover:bg-pink-600"
              >
                <i className={`fas ${arrivalPrimaryAction.icon} mr-1`}></i>
                {arrivalPrimaryAction.label}
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoneArrivalPrompt(null);
                  void runDistrictAction(arrivalDistrict, 'chat');
                }}
                className="min-h-9 rounded-md bg-white/85 px-2 text-[8px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-emerald-50"
              >
                <i className="fas fa-comment mr-1 text-emerald-700"></i>
                Chat
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {livePrompt && (
          <motion.div
            key={livePrompt.key}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="pointer-events-auto fixed bottom-40 left-1/2 z-[76] w-[min(92vw,430px)] -translate-x-1/2 overflow-hidden rounded-md border border-white/75 bg-[#fffaf1]/95 shadow-2xl shadow-emerald-900/10 backdrop-blur-xl max-md:bottom-[10.5rem]"
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              <button
                type="button"
                onClick={runLivePromptPrimary}
                className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md text-white shadow-sm transition hover:scale-105"
                style={{ backgroundColor: livePrompt.color }}
                title={livePrompt.primaryLabel}
                aria-label={`${livePrompt.primaryLabel} ${livePrompt.title}`}
              >
                {livePrompt.presence?.avatar ? (
                  <img src={livePrompt.presence.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <i className={`fas ${livePrompt.icon}`}></i>
                )}
                <span className="absolute -right-1 -top-1 rounded-full border border-white bg-[#fffaf1] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-stone-700">
                  {formatLivePromptDistance(livePrompt.distance)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (livePrompt.marker) {
                    void onSelectLiveActivityMarker(livePrompt.marker);
                    return;
                  }
                  if (livePrompt.presence) onSelectPresence(livePrompt.presence);
                }}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: livePrompt.color }}>
                  {livePrompt.eyebrow}
                </span>
                <span className="mt-0.5 block truncate text-[13px] font-black text-stone-800">
                  {livePrompt.title}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-bold text-stone-500">
                  {livePrompt.detail || 'Live activity nearby'}
                </span>
              </button>

              {livePrompt.marker?.groupMembers && livePrompt.marker.groupMembers.length > 0 && (
                <div className="hidden shrink-0 -space-x-1.5 sm:flex">
                  {livePrompt.marker.groupMembers.slice(0, 4).map(member => (
                    <span
                      key={member.id}
                      className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#fffaf1] text-[9px] font-black text-white shadow-sm"
                      style={{ backgroundColor: member.color }}
                      title={`${member.name} - ${member.status}`}
                    >
                      {member.name.slice(0, 1).toUpperCase()}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex shrink-0 items-center gap-1">
                {livePrompt.secondaryLabel && (
                  <button
                    type="button"
                    onClick={runLivePromptSecondary}
                    disabled={isEventUpdating && livePrompt.marker?.kind === 'event'}
                    className="h-9 rounded-md bg-white px-3 text-[9px] font-black uppercase tracking-wider text-stone-700 shadow-sm transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isEventUpdating && livePrompt.marker?.kind === 'event' ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      livePrompt.secondaryLabel
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={runLivePromptPrimary}
                  className="h-9 rounded-md px-3 text-[9px] font-black uppercase tracking-wider text-white shadow-sm transition hover:brightness-95"
                  style={{ backgroundColor: livePrompt.color }}
                >
                  {livePrompt.primaryLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedLivePromptKey(livePrompt.key)}
                  className="grid h-9 w-9 place-items-center rounded-md bg-white text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                  title="Dismiss"
                  aria-label="Dismiss live prompt"
                >
                  <i className="fas fa-xmark text-[10px]"></i>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {nearbyAvatarPrompt && (
          <motion.div
            key={nearbyAvatarPrompt.presence.userId}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="pointer-events-auto fixed bottom-24 left-4 z-[76] w-[min(calc(100vw-9rem),310px)] overflow-hidden rounded-md border border-white/75 bg-[#fffaf1]/95 shadow-2xl shadow-emerald-900/10 backdrop-blur-xl md:bottom-6 md:left-6 md:w-80"
          >
            <div className="flex items-center gap-2.5 p-2.5">
              <button
                type="button"
                onClick={() => {
                  onSelectPresence(nearbyAvatarPrompt.presence);
                  if (!nearbyAvatarPrompt.ready) {
                    onMinimapMoveTarget(
                      getFollowDestination(selfPosition, nearbyAvatarPrompt.presence.position),
                      nearbyAvatarPrompt.presence.name
                    );
                  }
                }}
                className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-white/80 bg-emerald-100 text-emerald-800 shadow-sm transition active:scale-95"
                title={nearbyAvatarPrompt.ready ? 'Open avatar actions' : 'Walk closer'}
                aria-label={nearbyAvatarPrompt.ready ? `Open ${nearbyAvatarPrompt.presence.name} actions` : `Walk closer to ${nearbyAvatarPrompt.presence.name}`}
              >
                {nearbyAvatarPrompt.presence.avatar ? (
                  <img src={nearbyAvatarPrompt.presence.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <i className="fas fa-user-group"></i>
                )}
                <span
                  className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-[#fffaf1]"
                  style={{ backgroundColor: nearbyAvatarPrompt.statusMeta.color }}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectPresence(nearbyAvatarPrompt.presence);
                  if (!nearbyAvatarPrompt.ready) {
                    onMinimapMoveTarget(
                      getFollowDestination(selfPosition, nearbyAvatarPrompt.presence.position),
                      nearbyAvatarPrompt.presence.name
                    );
                  }
                }}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex items-center gap-1.5">
                  <span className="min-w-0 truncate text-[12px] font-black text-stone-800">
                    {nearbyAvatarPrompt.presence.name}
                  </span>
                  {nearbyAvatarPrompt.relationship.label && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-emerald-700">
                      {nearbyAvatarPrompt.relationship.label}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-bold text-stone-500">
                  <i className={`fas ${nearbyAvatarPrompt.activityMeta.icon} mr-1.5 text-amber-600`}></i>
                  {nearbyAvatarPrompt.presence.activity} / {nearbyAvatarPrompt.district.name}
                </span>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-stone-500">
                  <i className={`fas ${nearbyAvatarPrompt.ready ? 'fa-hand-sparkles' : 'fa-route'}`}></i>
                  {nearbyAvatarPrompt.ready ? 'Ready' : `${nearbyAvatarPrompt.distance.toFixed(1)}m`}
                </span>
              </button>

              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onSelectPresence(nearbyAvatarPrompt.presence);
                    onMinimapMoveTarget(
                      getFollowDestination(selfPosition, nearbyAvatarPrompt.presence.position),
                      nearbyAvatarPrompt.presence.name
                    );
                  }}
                  className="grid h-8 w-8 place-items-center rounded-md bg-white text-stone-500 shadow-sm transition hover:bg-sky-50 hover:text-sky-700"
                  title="Walk to avatar"
                  aria-label={`Walk to ${nearbyAvatarPrompt.presence.name}`}
                >
                  <i className="fas fa-location-arrow text-[10px]"></i>
                </button>
                {startChatAction && (
                  <button
                    type="button"
                    onClick={() => runWorldAction(startChatAction, nearbyAvatarPrompt.presence)}
                    disabled={Boolean(pendingActionType)}
                    className="grid h-8 w-8 place-items-center rounded-md bg-pink-50 text-pink-600 shadow-sm transition hover:bg-pink-500 hover:text-white disabled:cursor-wait disabled:opacity-60"
                    title="Start chat"
                    aria-label={`Start chat with ${nearbyAvatarPrompt.presence.name}`}
                  >
                    <i className="fas fa-comment text-[10px]"></i>
                  </button>
                )}
                {followUserAction && (
                  <button
                    type="button"
                    onClick={() => runWorldAction(followUserAction, nearbyAvatarPrompt.presence)}
                    disabled={Boolean(pendingActionType)}
                    className={`grid h-8 w-8 place-items-center rounded-md shadow-sm transition disabled:cursor-wait disabled:opacity-60 ${
                      activeFollowTargetId === nearbyAvatarPrompt.presence.userId
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-700 hover:text-white'
                    }`}
                    title={activeFollowTargetId === nearbyAvatarPrompt.presence.userId ? 'Stop follow' : 'Follow avatar'}
                    aria-label={activeFollowTargetId === nearbyAvatarPrompt.presence.userId ? `Stop following ${nearbyAvatarPrompt.presence.name}` : `Follow ${nearbyAvatarPrompt.presence.name}`}
                  >
                    <i className="fas fa-shoe-prints text-[10px]"></i>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-auto fixed left-4 top-20 z-[70] max-h-[calc(100vh-7rem)] w-[min(92vw,340px)] overflow-y-auto rounded-md border border-white/70 bg-[#fffaf1]/90 p-4 shadow-2xl backdrop-blur-xl md:left-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-700">Persistent World</p>
            <h2 className="truncate text-base font-black text-stone-800">{circleName}</h2>
            <p className="truncate text-[11px] font-bold text-stone-500">
              <i className={`fas ${activeDistrict.icon} mr-1.5 text-amber-600`}></i>
              {currentZone}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
              <i className="fas fa-circle text-[7px] mr-1"></i>
              {onlineCountLabel}
            </div>
            <div className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
              isWorldStreamFresh ? 'bg-pink-100 text-pink-600' : 'bg-amber-100 text-amber-700'
            }`}>
              {worldStreamStatusLabel}
            </div>
          </div>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-white/75 px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-stone-400">World Time</p>
            <p className="mt-0.5 truncate text-[11px] font-black text-stone-800">
              <i className={`fas ${worldCycle.phase === 'Night' ? 'fa-moon' : worldCycle.phase === 'Dawn' || worldCycle.phase === 'Dusk' ? 'fa-cloud-sun' : 'fa-sun'} mr-1.5 text-amber-600`}></i>
              {formatWorldTime(worldCycle)}
            </p>
            <p className="truncate text-[9px] font-bold uppercase tracking-wider text-emerald-700">{worldCycle.phase}</p>
          </div>
          <div className="rounded-md bg-white/75 px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-stone-400">Atmosphere</p>
            <p className="mt-0.5 truncate text-[11px] font-black text-stone-800">
              <i className={`fas ${worldWeatherMeta.icon} mr-1.5 text-pink-500`}></i>
              {worldWeatherMeta.label}
            </p>
            <p className="truncate text-[9px] font-bold uppercase tracking-wider text-emerald-700">Shared Cycle</p>
          </div>
        </div>
        {worldPulseEntries.length > 0 && (
          <div className="mb-3 rounded-md border border-white/70 bg-white/55 p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700">
                <i className="fas fa-heart-pulse mr-1.5"></i>
                World Pulse
              </p>
              <span className="shrink-0 rounded-full bg-[#fffaf1] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-stone-500">
                {worldPulseEntries.length} live
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {worldPulseEntries.map(entry => (
                <button
                  key={entry.kind}
                  type="button"
                  onClick={() => void onSelectWorldPulse(entry)}
                  className="group min-w-0 rounded-md border border-white/70 bg-[#fffaf1]/90 px-2.5 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                  title={`${entry.label}: ${entry.detail}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-wider text-stone-700">
                      <i className={`fas ${entry.icon} mr-1.5`} style={{ color: entry.color }}></i>
                      {entry.label}
                    </span>
                    <span
                      className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1 text-[8px] font-black text-white shadow-sm"
                      style={{ backgroundColor: entry.color }}
                    >
                      {entry.count}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-[9px] font-bold text-stone-500 group-hover:text-stone-700">
                    {entry.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCameraMode('isometric')}
            className={`pointer-events-auto h-10 rounded-md text-[10px] font-black uppercase tracking-wider transition ${
              cameraMode === 'isometric' ? 'bg-stone-800 text-white' : 'bg-white/80 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <i className="fas fa-dice-d20 mr-2"></i>
            Isometric
          </button>
          <button
            type="button"
            onClick={() => setCameraMode('third')}
            className={`pointer-events-auto h-10 rounded-md text-[10px] font-black uppercase tracking-wider transition ${
              cameraMode === 'third' ? 'bg-emerald-700 text-white' : 'bg-white/80 text-stone-600 hover:bg-emerald-50'
            }`}
          >
            <i className="fas fa-person-walking mr-2"></i>
            Third
          </button>
        </div>
        <div className="mt-2 grid grid-cols-[44px_1fr_44px] gap-2">
          <button
            type="button"
            onClick={() => setRotation(value => value - CAMERA_KEY_ROTATION_STEP)}
            className="pointer-events-auto h-10 rounded-md bg-white/80 text-stone-600 transition hover:bg-stone-100"
            title="Rotate camera left"
          >
            <i className="fas fa-rotate-left"></i>
          </button>
          <input
            type="range"
            min={CAMERA_ZOOM_MIN}
            max={CAMERA_ZOOM_MAX}
            step="0.05"
            value={zoom}
            onChange={(event) => setZoom(clampCameraZoom(Number(event.target.value)))}
            aria-label="Camera zoom"
            className="pointer-events-auto w-full accent-emerald-700"
          />
          <button
            type="button"
            onClick={() => setRotation(value => value + CAMERA_KEY_ROTATION_STEP)}
            className="pointer-events-auto h-10 rounded-md bg-white/80 text-stone-600 transition hover:bg-stone-100"
            title="Rotate camera right"
          >
            <i className="fas fa-rotate-right"></i>
          </button>
        </div>
        <AnimatePresence>
          {activeFollowPresence && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="pointer-events-auto mt-2 rounded-md border border-emerald-100 bg-emerald-50/90 p-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">
                    <i className="fas fa-route mr-1.5"></i>
                    Following
                  </p>
                  <p className="truncate text-xs font-black text-stone-800">{activeFollowPresence.name}</p>
                  <p className="truncate text-[10px] font-bold text-stone-500">
                    {activeFollowPresence.currentZone}
                    {activeFollowDistance !== null ? ` · ${activeFollowDistance.toFixed(1)}m` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => stopFollowing(`Stopped following ${activeFollowPresence.name}`)}
                  className="h-8 shrink-0 rounded-md bg-white px-3 text-[9px] font-black uppercase tracking-wider text-emerald-700 shadow-sm transition hover:bg-emerald-700 hover:text-white"
                >
                  Stop
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setIsNearbyPanelOpen(prev => !prev)}
          className="pointer-events-auto mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/80 text-[10px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-sky-50 hover:text-sky-700"
        >
          <i className="fas fa-people-arrows"></i>
          Nearby
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] text-sky-700">{nearbyWorldPresences.length}</span>
        </button>
        <AnimatePresence>
          {isNearbyPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto mt-3 rounded-md border border-sky-100 bg-white/85 p-3"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-700">Nearby Avatars</p>
                  <p className="truncate text-[11px] font-bold text-stone-500">
                    {nearbyWorldPresences.length > 0 ? `${nearbyWorldPresences.length} closest in this world` : 'No one else nearby'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#fffaf1] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-stone-500">
                  {worldStreamStatusLabel}
                </span>
              </div>

              {nearbyWorldPresences.length === 0 ? (
                <p className="rounded-md bg-[#fffaf1] px-3 py-4 text-center text-[11px] font-bold text-stone-400">
                  When someone joins, they will appear here with walk, follow, and chat actions.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {nearbyWorldPresences.map(({ presence, distance, district }) => {
                    const statusMeta = getStatusMeta(presence.status);
                    const activityMeta = getActivityMeta(presence.activity);
                    const following = activeFollowTargetId === presence.userId;

                    return (
                      <div key={presence.userId} className="rounded-md bg-[#fffaf1] px-2.5 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectPresence(presence);
                              onMinimapMoveTarget(getFollowDestination(selfPosition, presence.position), presence.name);
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span className="block truncate text-[11px] font-black text-stone-800">
                              {presence.name}
                              {presence.title && <span className="ml-1 text-[9px] text-stone-400">{presence.title}</span>}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] font-bold text-stone-500">
                              <i className={`fas ${activityMeta.icon} mr-1 text-amber-600`}></i>
                              {presence.activity} / {district.name}
                            </span>
                          </button>
                          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-stone-500">
                            {distance.toFixed(1)}m
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-1.5">
                          <span className="min-w-0 inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[8px] font-black uppercase tracking-wider text-stone-600">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusMeta.color }} />
                            <span className="truncate">{statusMeta.label}</span>
                          </span>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectPresence(presence);
                                onMinimapMoveTarget(getFollowDestination(selfPosition, presence.position), presence.name);
                              }}
                              className="h-7 w-7 rounded-md bg-white text-stone-500 transition hover:bg-sky-50 hover:text-sky-700"
                              title="Walk to avatar"
                            >
                              <i className="fas fa-route text-[10px]"></i>
                            </button>
                            {followUserAction && (
                              <button
                                type="button"
                                onClick={() => runWorldAction(followUserAction, presence)}
                                disabled={Boolean(pendingActionType)}
                                className={`h-7 w-7 rounded-md transition disabled:cursor-wait disabled:opacity-60 ${
                                  following ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-700 hover:bg-emerald-50'
                                }`}
                                title={following ? 'Stop follow' : 'Follow avatar'}
                              >
                                <i className="fas fa-shoe-prints text-[10px]"></i>
                              </button>
                            )}
                            {startChatAction && (
                              <button
                                type="button"
                                onClick={() => runWorldAction(startChatAction, presence)}
                                disabled={Boolean(pendingActionType)}
                                className="h-7 w-7 rounded-md bg-white text-pink-600 transition hover:bg-pink-50 disabled:cursor-wait disabled:opacity-60"
                                title="Start chat"
                              >
                                <i className="fas fa-comment text-[10px]"></i>
                              </button>
                            )}
                          </div>
                        </div>
                        {(presence.guild || presence.party || presence.voiceRoomName) && (
                          <p className="mt-1 truncate text-[9px] font-bold text-stone-400">
                            {presence.guild || presence.party || presence.voiceRoomName}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setIsPresencePanelOpen(prev => !prev)}
          className="pointer-events-auto mt-2 flex min-h-11 w-full items-center justify-between gap-3 rounded-md bg-[#fffaf1] px-3 py-2 text-left text-stone-700 shadow-sm transition hover:bg-emerald-50 hover:text-emerald-700"
        >
          <span className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">
              <i className={`fas ${currentStatusMeta.icon} mr-1.5`} style={{ color: currentStatusMeta.color }}></i>
              Presence
            </span>
            <span className="block truncate text-xs font-black text-stone-800">
              <i className={`fas ${currentActivityMeta.icon} mr-1.5 text-amber-600`}></i>
              {selfPresence.activity}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-pink-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-pink-700">
            <i className={`fas ${currentEmoteMeta.icon}`}></i>
            {currentEmoteMeta.label}
          </span>
        </button>
        <AnimatePresence>
          {isPresencePanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto mt-3 rounded-md border border-emerald-100 bg-white/85 p-3"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">Quick Presence</p>
                  <p className="truncate text-[11px] font-bold text-stone-500">
                    {isAutoAway ? 'Idle AFK' : currentStatusMeta.label} in {currentZone}
                  </p>
                </div>
                {isSavingCharacter && (
                  <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-stone-500">
                    <i className="fas fa-spinner fa-spin mr-1"></i>
                    Saving
                  </span>
                )}
              </div>

              <div className="mb-3 flex items-center justify-between gap-3 rounded-md bg-emerald-50/80 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[9px] font-black uppercase tracking-wider text-emerald-700">
                    <i className={`fas ${zonePresenceMeta.icon} mr-1.5`}></i>
                    Zone-aware broadcast
                  </p>
                  <p className="truncate text-[10px] font-bold text-stone-500">
                    {presenceModeLabel} / {selfPresence.activity}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoZonePresenceEnabled(value => !value)}
                  className={`h-8 shrink-0 rounded-full px-3 text-[8px] font-black uppercase tracking-wider transition ${
                    autoZonePresenceEnabled ? 'bg-emerald-700 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  {autoZonePresenceEnabled ? 'Auto' : 'Manual'}
                </button>
              </div>

              <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest text-stone-400">Activity</p>
              <div className="grid grid-cols-2 gap-1.5">
                {ACTIVITY_OPTIONS.map(activity => {
                  const meta = getActivityMeta(activity);
                  const active = currentProfile.activity === activity;
                  return (
                    <button
                      key={activity}
                      type="button"
                      onClick={() => {
                        setAutoZonePresenceEnabled(false);
                        updateQuickPresence(
                          { activity, status: meta.status },
                          `${activity} presence`
                        );
                      }}
                      disabled={isSavingCharacter}
                      className={`min-h-9 rounded-md px-2 text-left text-[9px] font-black uppercase tracking-wider transition disabled:cursor-wait disabled:opacity-60 ${
                        active ? 'bg-emerald-700 text-white' : 'bg-[#fffaf1] text-stone-600 hover:bg-emerald-50'
                      }`}
                    >
                      <i className={`fas ${meta.icon} mr-1.5 ${active ? 'text-white' : 'text-emerald-700'}`}></i>
                      <span className="align-middle">{activity}</span>
                    </button>
                  );
                })}
              </div>

              <p className="mb-1.5 mt-3 text-[8px] font-black uppercase tracking-widest text-stone-400">Status</p>
              <div className="grid grid-cols-4 gap-1.5">
                {STATUS_OPTIONS.map(status => {
                  const meta = getStatusMeta(status);
                  const active = currentProfile.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setAutoZonePresenceEnabled(false);
                        updateQuickPresence({ status }, `${meta.label} status`);
                      }}
                      disabled={isSavingCharacter}
                      className={`h-9 rounded-md text-[8px] font-black uppercase tracking-wider transition disabled:cursor-wait disabled:opacity-60 ${
                        active ? 'bg-stone-800 text-white' : 'bg-[#fffaf1] text-stone-600 hover:bg-stone-100'
                      }`}
                      title={meta.label}
                    >
                      <i className={`fas ${meta.icon} block text-[10px]`} style={{ color: active ? undefined : meta.color }}></i>
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              <p className="mb-1.5 mt-3 text-[8px] font-black uppercase tracking-widest text-stone-400">Emote</p>
              <div className="grid grid-cols-5 gap-1.5">
                {EMOTE_OPTIONS.map(emote => {
                  const meta = getEmoteMeta(emote);
                  const active = currentProfile.emote === emote;
                  return (
                    <button
                      key={emote}
                      type="button"
                      onClick={() => {
                        setAutoZonePresenceEnabled(false);
                        updateQuickPresence({ emote }, `${meta.label} emote`);
                      }}
                      disabled={isSavingCharacter}
                      className={`h-10 rounded-md text-[8px] font-black uppercase tracking-wider transition disabled:cursor-wait disabled:opacity-60 ${
                        active ? 'bg-pink-500 text-white' : 'bg-[#fffaf1] text-stone-600 hover:bg-pink-50'
                      }`}
                      title={meta.label}
                    >
                      <i className={`fas ${meta.icon} block text-[12px]`}></i>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setIsCharacterPanelOpen(prev => !prev)}
          className="pointer-events-auto mt-2 h-10 w-full rounded-md bg-white/80 text-[10px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-pink-50 hover:text-pink-600"
        >
          <i className="fas fa-user-astronaut mr-2"></i>
          Character
          {isSavingCharacter && <i className="fas fa-spinner fa-spin ml-2"></i>}
        </button>
        <AnimatePresence>
          {isCharacterPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto mt-3 rounded-md border border-amber-100 bg-white/80 p-3"
            >
              <div className="grid grid-cols-2 gap-2">
                <label className="min-w-0 text-[9px] font-black uppercase tracking-widest text-stone-500">
                  Name
                  <input
                    value={characterDraft.displayName}
                    onChange={(event) => setCharacterDraft(prev => ({ ...prev, displayName: event.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-stone-200 bg-[#fffaf1] px-2 text-xs font-bold text-stone-800 outline-none focus:border-pink-300"
                  />
                </label>
                <label className="min-w-0 text-[9px] font-black uppercase tracking-widest text-stone-500">
                  Title
                  <input
                    value={characterDraft.title}
                    onChange={(event) => setCharacterDraft(prev => ({ ...prev, title: event.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-stone-200 bg-[#fffaf1] px-2 text-xs font-bold text-stone-800 outline-none focus:border-pink-300"
                  />
                </label>
              </div>
              <label className="mt-2 block text-[9px] font-black uppercase tracking-widest text-stone-500">
                Activity
                <select
                  value={characterDraft.activity}
                  onChange={(event) => setCharacterDraft(prev => ({ ...prev, activity: event.target.value }))}
                  className="mt-1 h-9 w-full rounded-md border border-stone-200 bg-[#fffaf1] px-2 text-xs font-bold text-stone-800 outline-none focus:border-emerald-300"
                >
                  {ACTIVITY_OPTIONS.map(activity => <option key={activity} value={activity}>{activity}</option>)}
                </select>
              </label>
              <label className="mt-2 block text-[9px] font-black uppercase tracking-widest text-stone-500">
                3D Model URL
                <div className="mt-1 flex gap-2">
                  <input
                    value={characterDraft.modelUrl}
                    onChange={(event) => setCharacterDraft(prev => ({ ...prev, modelUrl: event.target.value }))}
                    placeholder="https://.../avatar.glb"
                    className="h-9 min-w-0 flex-1 rounded-md border border-stone-200 bg-[#fffaf1] px-2 text-xs font-bold text-stone-800 outline-none focus:border-emerald-300"
                  />
                  <button
                    type="button"
                    onClick={() => setCharacterDraft(prev => ({ ...prev, modelUrl: '' }))}
                    className="h-9 w-9 shrink-0 rounded-md bg-[#fffaf1] text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                    title="Clear 3D model"
                  >
                    <i className="fas fa-eraser"></i>
                  </button>
                </div>
              </label>
              <button
                type="button"
                onClick={() => saveCharacterProfile({
                  ...characterDraft,
                  modelUrl: characterDraft.modelUrl.trim() || null,
                })}
                className="mt-2 h-9 w-full rounded-md bg-stone-800 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-stone-700"
              >
                Save Identity
              </button>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ['Body', 'bodyColor', BODY_SWATCHES],
                  ['Trim', 'trimColor', TRIM_SWATCHES],
                  ['Hair', 'hairColor', HAIR_SWATCHES],
                ].map(([label, key, colors]) => (
                  <div key={label as string}>
                    <p className="mb-1 text-[8px] font-black uppercase tracking-widest text-stone-400">{label as string}</p>
                    <div className="grid grid-cols-3 gap-1">
                      {(colors as string[]).map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => saveCharacterProfile({ appearance: { ...currentProfile.appearance, [key as keyof CharacterAppearance]: color } })}
                          className="h-6 rounded-full border border-white shadow-sm ring-offset-1 transition hover:scale-105"
                          style={{ backgroundColor: color }}
                          title={`${label as string} ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => saveCharacterProfile({ status })}
                    className={`h-8 rounded-md text-[9px] font-black uppercase tracking-wider transition ${
                      currentProfile.status === status ? 'bg-emerald-700 text-white' : 'bg-[#fffaf1] text-stone-600 hover:bg-emerald-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {EMOTE_OPTIONS.map(emote => (
                  <button
                    key={emote}
                    type="button"
                    onClick={() => saveCharacterProfile({ emote })}
                    className={`h-8 rounded-md text-[9px] font-black uppercase tracking-wider transition ${
                      currentProfile.emote === emote ? 'bg-pink-500 text-white' : 'bg-[#fffaf1] text-stone-600 hover:bg-pink-50'
                    }`}
                  >
                    {emote}
                  </button>
                ))}
              </div>

              <div className="mt-3 space-y-2">
                {[
                  ['Aura', 'aura', COSMETIC_AURAS, currentCosmetics.aura],
                  ['Trail', 'trail', COSMETIC_TRAILS, currentCosmetics.trail],
                  ['Nameplate', 'nameplate', COSMETIC_NAMEPLATES, currentCosmetics.nameplate],
                ].map(([label, key, options, activeValue]) => (
                  <div key={key as string} className="rounded-md bg-[#fffaf1] p-2">
                    <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest text-stone-400">{label as string}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(options as typeof COSMETIC_AURAS | typeof COSMETIC_TRAILS | typeof COSMETIC_NAMEPLATES).map(option => {
                        const isActive = activeValue === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => saveCharacterProfile({
                              cosmetics: {
                                ...currentProfile.cosmetics,
                                [key as string]: option.id,
                              },
                            })}
                            className={`flex min-h-8 items-center gap-1.5 rounded-md px-2 text-left text-[9px] font-black uppercase tracking-wider transition ${
                              isActive ? 'bg-stone-800 text-white' : 'bg-white text-stone-600 hover:bg-pink-50'
                            }`}
                            title={`${label as string}: ${option.label}`}
                          >
                            <i className={`fas ${option.icon}`} style={{ color: isActive ? undefined : 'color' in option ? option.color : undefined }}></i>
                            <span className="truncate">{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-stone-400">Inventory</p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-700">
                    {worldInventory.length} owned
                  </span>
                </div>
                {INVENTORY_SLOTS.map(({ slot, label, icon }) => {
                  const slotItems = worldInventory.filter(item => item.slot === slot);
                  const equippedKey = currentProfile.equipment[slot] || 'none';
                  return (
                    <div key={slot} className="rounded-md bg-[#fffaf1] p-2">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className="text-[9px] font-black uppercase tracking-wider text-stone-600">
                          <i className={`fas ${icon} mr-1.5 text-amber-600`}></i>
                          {label}
                        </p>
                        <span className="truncate text-[8px] font-bold uppercase text-stone-400">
                          {equippedKey === 'none' ? 'empty' : equippedKey.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => equipInventoryItem(slot)}
                          disabled={isEquippingItem === `${slot}:none`}
                          className={`min-h-8 rounded-md px-2 text-left text-[9px] font-black uppercase tracking-wider transition disabled:cursor-wait disabled:opacity-60 ${
                            equippedKey === 'none' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 hover:bg-stone-100'
                          }`}
                        >
                          <i className="fas fa-ban mr-1.5"></i>
                          None
                        </button>
                        {slotItems.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => equipInventoryItem(slot, item.itemKey)}
                            disabled={isEquippingItem === `${slot}:${item.itemKey}`}
                            className={`min-h-8 rounded-md px-2 text-left text-[9px] font-black uppercase tracking-wider transition disabled:cursor-wait disabled:opacity-60 ${
                              item.isEquipped ? 'bg-emerald-700 text-white' : 'bg-white text-stone-600 hover:bg-emerald-50'
                            }`}
                            title={`${item.name} - ${item.rarity}`}
                          >
                            <i className={`fas ${item.icon} mr-1.5`}></i>
                            <span className="align-middle">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setIsAchievementsPanelOpen(prev => !prev)}
          className="pointer-events-auto mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/80 text-[10px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-pink-50 hover:text-pink-600"
        >
          <i className="fas fa-award"></i>
          Achievements
          {worldAchievements.length > 0 && (
            <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[9px] text-pink-700">{worldAchievements.length}</span>
          )}
        </button>
        <AnimatePresence>
          {isAchievementsPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto mt-3 rounded-md border border-pink-100 bg-white/85 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-600">Earned Titles</p>
                  <p className="truncate text-[11px] font-bold text-stone-500">{currentProfile.title}</p>
                </div>
                <span className="shrink-0 rounded-full bg-pink-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-pink-700">
                  {worldAchievements.length} badges
                </span>
              </div>
              {worldAchievements.length === 0 ? (
                <p className="rounded-md bg-[#fffaf1] px-3 py-4 text-center text-[11px] font-bold text-stone-400">
                  Explore, chat, join events, and visit the market to earn your first world badge.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {worldAchievements.map(achievement => (
                    <button
                      key={achievement.id}
                      type="button"
                      onClick={() => equipAchievementTitle(achievement)}
                      disabled={!achievement.titleReward || achievement.isTitleEquipped || isEquippingTitle === achievement.achievementKey}
                      className={`min-h-[58px] w-full rounded-md border px-2.5 py-2 text-left transition disabled:cursor-default disabled:opacity-70 ${
                        achievement.isTitleEquipped ? 'border-pink-200 bg-pink-50' : 'border-stone-100 bg-[#fffaf1] hover:bg-pink-50'
                      }`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-stone-800">
                            <i className={`fas ${achievement.icon} text-pink-600`}></i>
                            <span className="truncate">{achievement.name}</span>
                          </span>
                          <span className="mt-1 line-clamp-2 block text-[10px] font-bold leading-snug text-stone-500">
                            {achievement.description}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${ACHIEVEMENT_RARITY_CLASS[achievement.rarity]}`}>
                            {achievement.rarity}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                            achievement.isTitleEquipped ? 'bg-pink-600 text-white' : 'bg-stone-800 text-white'
                          }`}>
                            {isEquippingTitle === achievement.achievementKey ? <i className="fas fa-spinner fa-spin"></i> : achievement.isTitleEquipped ? 'Active' : achievement.titleReward}
                          </span>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setIsMarketPanelOpen(prev => !prev)}
          className="pointer-events-auto mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/80 text-[10px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-amber-50 hover:text-amber-700"
        >
          <i className="fas fa-store"></i>
          Market
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] text-amber-800">{marketBalance} pts</span>
        </button>
        <AnimatePresence>
          {isMarketPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto mt-3 rounded-md border border-amber-100 bg-white/85 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-700">Mira's Market</p>
                  <p className="truncate text-[11px] font-bold text-stone-500">Gear bought here stays with this world avatar.</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-800">
                  {marketBalance} points
                </span>
              </div>
              <div className="grid gap-2">
                {worldMarketCatalog.map(item => {
                  const pending = isPurchasingItem === item.itemKey || isEquippingItem === `${item.slot}:${item.itemKey}`;
                  const canBuy = item.isOwned || marketBalance >= item.price;
                  const actionLabel = item.isEquipped ? 'Equipped' : item.isOwned ? 'Equip' : `${item.price} pts`;
                  return (
                    <button
                      key={item.itemKey}
                      type="button"
                      onClick={() => item.isOwned ? equipInventoryItem(item.slot, item.itemKey) : purchaseMarketItem(item)}
                      disabled={pending || item.isEquipped || !canBuy}
                      className={`min-h-[58px] rounded-md border px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        item.isEquipped
                          ? 'border-emerald-200 bg-emerald-50'
                          : item.isOwned
                            ? 'border-amber-200 bg-[#fffaf1] hover:bg-amber-50'
                            : canBuy
                              ? 'border-stone-200 bg-white hover:border-amber-300 hover:bg-amber-50'
                              : 'border-stone-100 bg-stone-50'
                      }`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-stone-800">
                            <i className={`fas ${item.icon} text-amber-700`}></i>
                            <span className="truncate">{item.name}</span>
                          </span>
                          <span className="mt-1 line-clamp-2 block text-[10px] font-bold leading-snug text-stone-500">
                            {item.description}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${MARKET_RARITY_CLASS[item.rarity]}`}>
                            {item.rarity}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                            item.isEquipped ? 'bg-emerald-700 text-white' : item.isOwned ? 'bg-stone-800 text-white' : canBuy ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-500'
                          }`}>
                            {pending ? <i className="fas fa-spinner fa-spin"></i> : actionLabel}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={openWorldChat}
          className="pointer-events-auto mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/80 text-[10px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-emerald-50 hover:text-emerald-700"
        >
          <i className="fas fa-comments"></i>
          Chat
          {worldChatMessages.length > 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] text-emerald-800">{worldChatMessages.length}</span>
          )}
        </button>
        <AnimatePresence>
          {isChatPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto mt-3 rounded-md border border-emerald-100 bg-white/85 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">World Chat</p>
                  <p className="truncate text-[11px] font-bold text-stone-500">
                    {chatPanelSubtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChatPanelOpen(false)}
                  className="h-8 w-8 shrink-0 rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                  title="Close chat"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="mb-2 grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setChatChannel('world');
                    setChatSpatialMode('world');
                    setChatTarget(null);
                    setIsSelectedDirectChatOpen(false);
                  }}
                  className={`h-8 rounded-md text-[8px] font-black uppercase tracking-wider transition ${
                    chatChannel === 'world' ? 'bg-emerald-700 text-white' : 'bg-[#fffaf1] text-stone-600 hover:bg-emerald-50'
                  }`}
                >
                  World
                </button>
                <button
                  type="button"
                  disabled={!chatTarget}
                  onClick={() => {
                    setChatChannel('direct');
                    setChatSpatialMode('world');
                  }}
                  className={`h-8 rounded-md text-[8px] font-black uppercase tracking-wider transition disabled:opacity-50 ${
                    chatChannel === 'direct' ? 'bg-pink-500 text-white' : 'bg-[#fffaf1] text-stone-600 hover:bg-pink-50'
                  }`}
                >
                  Direct
                </button>
                <button
                  type="button"
                  disabled={!worldParty}
                  onClick={() => {
                    setChatChannel('party');
                    setChatSpatialMode('world');
                    setChatTarget(null);
                    setIsSelectedDirectChatOpen(false);
                  }}
                  className={`h-8 rounded-md text-[8px] font-black uppercase tracking-wider transition disabled:opacity-50 ${
                    chatChannel === 'party' ? 'bg-pink-500 text-white' : 'bg-[#fffaf1] text-stone-600 hover:bg-pink-50'
                  }`}
                >
                  Party
                </button>
                <button
                  type="button"
                  disabled={!worldGuild}
                  onClick={() => {
                    setChatChannel('guild');
                    setChatSpatialMode('world');
                    setChatTarget(null);
                    setIsSelectedDirectChatOpen(false);
                  }}
                  className={`h-8 rounded-md text-[8px] font-black uppercase tracking-wider transition disabled:opacity-50 ${
                    chatChannel === 'guild' ? 'bg-emerald-700 text-white' : 'bg-[#fffaf1] text-stone-600 hover:bg-emerald-50'
                  }`}
                >
                  Guild
                </button>
              </div>
              {chatChannel === 'world' && (
                <div className="mb-2 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setChatSpatialMode('world')}
                    className={`flex h-8 items-center justify-center gap-1.5 rounded-md text-[8px] font-black uppercase tracking-wider transition ${
                      chatSpatialMode === 'world' ? 'bg-stone-800 text-white' : 'bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                    title="Broadcast to the world"
                  >
                    <i className="fas fa-bullhorn text-[9px]"></i>
                    Broadcast
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatSpatialMode('nearby')}
                    className={`flex h-8 items-center justify-center gap-1.5 rounded-md text-[8px] font-black uppercase tracking-wider transition ${
                      chatSpatialMode === 'nearby' ? 'bg-amber-500 text-white' : 'bg-white text-stone-600 hover:bg-amber-50'
                    }`}
                    title={`Speak within ${NEARBY_SPEECH_RANGE} meters`}
                  >
                    <i className="fas fa-location-dot text-[9px]"></i>
                    Nearby
                  </button>
                </div>
              )}
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-md bg-[#fffaf1] p-2">
                {visibleChatMessages.length === 0 ? (
                  <p className="px-2 py-5 text-center text-[11px] font-bold text-stone-400">
                    {chatChannel === 'world' && chatSpatialMode === 'nearby' ? 'No nearby speech yet' : 'No messages here yet'}
                  </p>
                ) : (
                  visibleChatMessages.map(message => {
                    const nearbySpeech = isNearbySpeechChannel(message);
                    return (
                      <div
                        key={message.id}
                        className={`rounded-md px-2.5 py-2 ${
                          message.fromUserId === userId ? 'bg-emerald-50 text-right' : nearbySpeech ? 'bg-amber-50' : 'bg-white'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="truncate text-[10px] font-black text-stone-700">{message.fromName}</p>
                          <span className={`shrink-0 text-[8px] font-black uppercase tracking-wider ${
                            nearbySpeech ? 'text-amber-700' : 'text-stone-400'
                          }`}>
                            {getChatAudienceDisplay(message, selfPosition)}
                          </span>
                        </div>
                        <p className="break-words text-[12px] font-bold leading-relaxed text-stone-700">{message.body}</p>
                      </div>
                    );
                  })
                )}
              </div>
              <form onSubmit={sendWorldChat} className="mt-2 grid grid-cols-[1fr_40px] gap-2">
                <input
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  maxLength={360}
                  placeholder={chatPlaceholder}
                  className="h-10 rounded-md border border-stone-200 bg-[#fffaf1] px-3 text-xs font-bold text-stone-800 outline-none transition focus:border-emerald-300"
                />
                <button
                  type="submit"
                  disabled={!chatDraft.trim() || isSendingChat}
                  className="h-10 rounded-md bg-stone-800 text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Send"
                >
                  <i className={`fas ${isSendingChat ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setIsSocialPanelOpen(prev => !prev)}
          className="pointer-events-auto mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/80 text-[10px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-sky-50 hover:text-sky-700"
        >
          <i className="fas fa-user-group"></i>
          Social
          {socialSummary.friends.length > 0 && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] text-sky-700">{socialSummary.friends.length}</span>
          )}
        </button>
        <AnimatePresence>
          {isSocialPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto mt-3 rounded-md border border-sky-100 bg-white/85 p-3"
            >
              <div className="mb-3">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-700">Social Bonds</p>
                <p className="truncate text-[11px] font-bold text-stone-500">
                  {socialSummary.friends.length} friends · {socialSummary.following.length} following
                </p>
              </div>
              <div className="space-y-1.5">
                {socialPanelRelationships.map(relationship => {
                  const isSelfFrom = relationship.fromUserId === userId;
                  const name = isSelfFrom ? relationship.toName : relationship.fromName;
                  const label = relationship.type === 'friend'
                    ? relationship.status === 'accepted' ? 'friend' : isSelfFrom ? 'pending' : 'request'
                    : 'following';
                  const targetUserId = isSelfFrom ? relationship.toUserId : relationship.fromUserId;
                  const pendingAccept = pendingRelationshipAction === `accept_friend:${relationship.id}`;
                  const pendingRemove = pendingRelationshipAction === `remove_friend:${relationship.id}`;
                  const pendingUnfollow = pendingRelationshipAction === `unfollow:${relationship.id}`;
                  return (
                    <div key={relationship.id} className="rounded-md bg-[#fffaf1] px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const presence = remotePresences.find(item => item.userId === targetUserId);
                            if (presence) onSelectPresence(presence);
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-[11px] font-black text-stone-700">{name}</span>
                          <span className="mt-0.5 block truncate text-[9px] font-bold text-stone-400">
                            {relationship.type === 'friend' ? 'Friend bond' : 'Movement follow'}
                          </span>
                        </button>
                        <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-sky-700">
                          {label}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-end gap-1.5">
                        {relationship.type === 'friend' && relationship.status === 'pending' && !isSelfFrom && (
                          <button
                            type="button"
                            onClick={() => updateWorldRelationshipFromPanel(relationship, 'accept_friend')}
                            disabled={Boolean(pendingRelationshipAction)}
                            className="h-7 rounded-md bg-emerald-700 px-2 text-[8px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60"
                          >
                            {pendingAccept ? <i className="fas fa-spinner fa-spin"></i> : 'Accept'}
                          </button>
                        )}
                        {relationship.type === 'friend' && (
                          <button
                            type="button"
                            onClick={() => updateWorldRelationshipFromPanel(relationship, 'remove_friend')}
                            disabled={Boolean(pendingRelationshipAction)}
                            className="h-7 rounded-md bg-white px-2 text-[8px] font-black uppercase tracking-wider text-stone-600 transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60"
                          >
                            {pendingRemove ? <i className="fas fa-spinner fa-spin"></i> : relationship.status === 'pending' && isSelfFrom ? 'Cancel' : 'Remove'}
                          </button>
                        )}
                        {relationship.type === 'follow' && (
                          <button
                            type="button"
                            onClick={() => updateWorldRelationshipFromPanel(relationship, 'unfollow')}
                            disabled={Boolean(pendingRelationshipAction)}
                            className="h-7 rounded-md bg-white px-2 text-[8px] font-black uppercase tracking-wider text-stone-600 transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60"
                          >
                            {pendingUnfollow ? <i className="fas fa-spinner fa-spin"></i> : 'Unfollow'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {worldRelationships.length === 0 && (
                  <p className="rounded-md bg-[#fffaf1] px-3 py-4 text-center text-[11px] font-bold text-stone-400">
                    Follow or add nearby avatars from their character panel.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setIsRequestsPanelOpen(prev => !prev)}
          className="pointer-events-auto mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/80 text-[10px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-violet-50 hover:text-violet-700"
        >
          <i className="fas fa-bell"></i>
          Requests
          {(requestSummary.incoming.length + requestSummary.active.length) > 0 && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] text-violet-700">
              {requestSummary.incoming.length + requestSummary.active.length}
            </span>
          )}
        </button>
        <AnimatePresence>
          {isRequestsPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto mt-3 rounded-md border border-violet-100 bg-white/85 p-3"
            >
              <div className="mb-3">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-700">World Requests</p>
                <p className="truncate text-[11px] font-bold text-stone-500">
                  {requestSummary.incoming.length} incoming · {requestSummary.outgoing.length} sent · {requestSummary.active.length} active
                </p>
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {[...requestSummary.incoming, ...requestSummary.active, ...requestSummary.outgoing].map(request => {
                  const isIncoming = request.toUserId === userId;
                  const isOutgoing = request.fromUserId === userId;
                  const otherName = isIncoming ? request.fromName : request.toName || 'the world';
                  const requestReadyState = isInteractionSessionType(request.type)
                    ? getSessionReadyState(request, userId)
                    : null;
                  return (
                    <div key={request.id} className="rounded-md bg-[#fffaf1] px-2.5 py-2">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-[11px] font-black text-stone-700">
                          <i className={`fas ${getRequestIcon(request.type)} mr-1.5 text-violet-600`}></i>
                          {getRequestTitle(request.type)}
                        </p>
                        <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-violet-700">
                          {request.status}
                        </span>
                      </div>
                      <p className="mb-2 truncate text-[10px] font-bold text-stone-500">
                        {isIncoming ? `From ${otherName}` : `To ${otherName}`}
                        {requestReadyState ? ` - ${requestReadyState.readyCount}/2 ready` : ''}
                      </p>
                      {isIncoming && request.status === 'requested' && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => respondToWorldRequest(request, 'accept')}
                            disabled={pendingRequestId === request.id}
                            className="h-8 rounded-md bg-emerald-700 text-[9px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => respondToWorldRequest(request, 'decline')}
                            disabled={pendingRequestId === request.id}
                            className="h-8 rounded-md bg-white text-[9px] font-black uppercase tracking-wider text-stone-600 transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {isOutgoing && request.status === 'requested' && (
                        <button
                          type="button"
                          onClick={() => respondToWorldRequest(request, 'cancel')}
                          disabled={pendingRequestId === request.id}
                          className="h-8 w-full rounded-md bg-white text-[9px] font-black uppercase tracking-wider text-stone-600 transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      )}
                      {request.status === 'accepted' && (
                        isInteractionSessionType(request.type) ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSessionId(request.id);
                                setIsSessionsPanelOpen(true);
                              }}
                              disabled={pendingRequestId === request.id}
                              className="h-8 rounded-md bg-white text-[9px] font-black uppercase tracking-wider text-violet-700 transition hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => respondToWorldRequest(request, 'complete')}
                              disabled={pendingRequestId === request.id || !requestReadyState?.allReady}
                              className="h-8 rounded-md bg-violet-700 text-[9px] font-black uppercase tracking-wider text-white transition hover:bg-violet-600 disabled:cursor-wait disabled:opacity-60"
                            >
                              Complete
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => respondToWorldRequest(request, 'complete')}
                            disabled={pendingRequestId === request.id}
                            className="h-8 w-full rounded-md bg-violet-700 text-[9px] font-black uppercase tracking-wider text-white transition hover:bg-violet-600 disabled:cursor-wait disabled:opacity-60"
                          >
                            Complete
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
                {worldRequests.length === 0 && (
                  <p className="rounded-md bg-[#fffaf1] px-3 py-4 text-center text-[11px] font-bold text-stone-400">
                    Voice, party, guild, trade, and collaboration requests appear here.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {interactionSessions.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setIsSessionsPanelOpen(prev => !prev)}
              className="pointer-events-auto mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/80 text-[10px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-amber-50 hover:text-amber-700"
            >
              <i className="fas fa-people-arrows"></i>
              Sessions
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] text-amber-800">{interactionSessions.length}</span>
            </button>
            <AnimatePresence>
              {isSessionsPanelOpen && activeInteractionSession && activeSessionCounterpart && activeSessionAccent && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`pointer-events-auto mt-3 rounded-md border bg-white/85 p-3 ${activeSessionAccent.border}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${activeSessionAccent.text}`}>
                        <i className={`fas ${activeSessionAccent.icon} mr-1.5`}></i>
                        {activeInteractionSession.type === 'trade' ? 'Trade Session' : 'Collaboration Session'}
                      </p>
                      <p className="truncate text-sm font-black text-stone-800">{activeSessionCounterpart.name}</p>
                      <p className="truncate text-[11px] font-bold text-stone-500">
                        Started {formatActionTime(
                          typeof activeInteractionSession.metadata?.sessionStartedAt === 'string'
                            ? activeInteractionSession.metadata.sessionStartedAt
                            : activeInteractionSession.updatedAt || activeInteractionSession.createdAt
                        )}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${activeSessionAccent.badge}`}>
                      Active
                    </span>
                  </div>

                  <div className="mb-3 rounded-md bg-[#fffaf1] px-3 py-2">
                    <p className="text-[10px] font-bold leading-relaxed text-stone-600">
                      {activeInteractionSession.type === 'trade'
                        ? 'Open the keepsake market, agree in chat, then complete the exchange when both sides are ready.'
                        : 'Use the shared event space and direct chat to coordinate the moment, then complete when the work is done.'}
                    </p>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-1.5">
                    <div className={`rounded-md px-2.5 py-2 ${
                      activeSessionReadyState?.selfReady ? 'bg-emerald-50 text-emerald-700' : 'bg-[#fffaf1] text-stone-500'
                    }`}>
                      <p className="text-[8px] font-black uppercase tracking-wider">You</p>
                      <p className="text-[10px] font-black">{activeSessionReadyState?.selfReady ? 'Ready' : 'Waiting'}</p>
                    </div>
                    <div className={`rounded-md px-2.5 py-2 ${
                      activeSessionReadyState?.otherReady ? 'bg-emerald-50 text-emerald-700' : 'bg-[#fffaf1] text-stone-500'
                    }`}>
                      <p className="text-[8px] font-black uppercase tracking-wider">{activeSessionCounterpart.name}</p>
                      <p className="text-[10px] font-black">{activeSessionReadyState?.otherReady ? 'Ready' : 'Waiting'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => openSessionContext(activeInteractionSession)}
                      className={`h-9 rounded-md text-[9px] font-black uppercase tracking-wider text-white transition ${activeSessionAccent.button}`}
                    >
                      <i className={`fas ${activeInteractionSession.type === 'trade' ? 'fa-store' : 'fa-star'} mr-1.5`}></i>
                      {activeInteractionSession.type === 'trade' ? 'Market' : 'Event'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openSessionChat(activeInteractionSession)}
                      className="h-9 rounded-md bg-white text-[9px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-stone-100"
                    >
                      <i className="fas fa-comment mr-1.5"></i>
                      Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => respondToWorldRequest(
                        activeInteractionSession,
                        activeSessionReadyState?.selfReady ? 'unready' : 'ready'
                      )}
                      disabled={pendingRequestId === activeInteractionSession.id}
                      className={`h-9 rounded-md text-[9px] font-black uppercase tracking-wider transition ${
                        activeSessionReadyState?.selfReady
                          ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      } disabled:cursor-wait disabled:opacity-60`}
                    >
                      <i className={`fas ${activeSessionReadyState?.selfReady ? 'fa-check' : 'fa-hourglass-half'} mr-1.5`}></i>
                      {activeSessionReadyState?.selfReady ? 'Ready' : 'Mark Ready'}
                    </button>
                    <button
                      type="button"
                      onClick={() => respondToWorldRequest(activeInteractionSession, 'complete')}
                      disabled={pendingRequestId === activeInteractionSession.id || !activeSessionReadyState?.allReady}
                      className="h-9 rounded-md bg-stone-800 text-[9px] font-black uppercase tracking-wider text-white transition hover:bg-stone-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      <i className={`fas ${pendingRequestId === activeInteractionSession.id ? 'fa-spinner fa-spin' : 'fa-flag-checkered'} mr-1.5`}></i>
                      Complete
                    </button>
                  </div>

                  {interactionSessions.length > 1 && (
                    <div className="mt-3 flex gap-1.5 overflow-x-auto">
                      {interactionSessions.map(session => (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => setActiveSessionId(session.id)}
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wider transition ${
                            session.id === activeInteractionSession.id
                              ? 'bg-stone-800 text-white'
                              : 'bg-[#fffaf1] text-stone-500 hover:bg-stone-100'
                          }`}
                        >
                          {getRequestTitle(session.type)}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
        <AnimatePresence>
          {nearbyVoiceNudge && !isVoicePanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="pointer-events-auto mt-2 overflow-hidden rounded-md border border-sky-100 bg-[#fffaf1]/95 shadow-lg shadow-sky-100/50"
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <div className="flex shrink-0 -space-x-1.5">
                  {nearbyVoiceNudge.avatars.map(({ presence }) => (
                    presence.avatar ? (
                      <img
                        key={presence.userId}
                        src={presence.avatar}
                        alt=""
                        className="h-7 w-7 rounded-full border-2 border-[#fffaf1] object-cover"
                      />
                    ) : (
                      <span
                        key={presence.userId}
                        className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#fffaf1] bg-sky-100 text-[10px] font-black text-sky-700"
                      >
                        {presence.name.slice(0, 1).toUpperCase()}
                      </span>
                    )
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onSelectPresence(nearbyVoiceNudge.closest.presence)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
                    Nearby voice
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-black text-stone-800">
                    {nearbyVoiceNudge.closest.presence.name}
                    {nearbyVoiceNudge.count > 1 ? ` +${nearbyVoiceNudge.count - 1}` : ''}
                    <span className="ml-1 text-[10px] font-bold text-stone-400">
                      {nearbyVoiceNudge.closest.distance.toFixed(1)}m
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[9px] font-bold text-stone-500">
                    {nearbyVoiceNudge.openMicCount > 0
                      ? `${nearbyVoiceNudge.openMicCount} open mic${nearbyVoiceNudge.openMicCount === 1 ? '' : 's'}`
                      : nearbyVoiceNudge.signal.label}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={joinNearbyVoiceFromNudge}
                    disabled={isVoiceUpdating === `proximity:${currentZone}`}
                    className="h-8 rounded-md bg-sky-600 px-3 text-[9px] font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isVoiceUpdating === `proximity:${currentZone}` ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      'Join'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedProximityVoiceKey(nearbyVoiceNudge.key)}
                    className="grid h-8 w-8 place-items-center rounded-md bg-white text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                    title="Dismiss"
                    aria-label="Dismiss nearby voice"
                  >
                    <i className="fas fa-xmark text-[10px]"></i>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setIsVoicePanelOpen(prev => !prev)}
          className="pointer-events-auto mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/80 text-[10px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-violet-50 hover:text-violet-700"
        >
          <i className={`fas ${voiceMediaStatus === 'requesting' ? 'fa-spinner fa-spin' : activeVoiceRoom ? 'fa-headset' : 'fa-microphone'}`}></i>
          Voice
          <span className={`rounded-full px-2 py-0.5 text-[9px] ${activeVoiceRoom ? 'bg-violet-100 text-violet-800' : 'bg-stone-100 text-stone-500'}`}>
            {activeVoiceRoom ? activeVoiceRoom.members.length : nearbyVoicePresences.length}
          </span>
        </button>
        <AnimatePresence>
          {isVoicePanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto mt-3 rounded-md border border-violet-100 bg-white/85 p-3"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-700">World Voice</p>
                  <p className="truncate text-[11px] font-bold text-stone-500">
                    {activeVoiceRoom ? activeVoiceRoom.name : `${nearbyVoicePresences.length} nearby avatars`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleVoiceMute}
                  disabled={Boolean(activeVoiceRoom && isVoiceUpdating === `mute:${activeVoiceRoom.id}`)}
                  className={`h-9 w-9 shrink-0 rounded-md transition disabled:cursor-wait disabled:opacity-60 ${
                    isVoiceMuted ? 'bg-stone-800 text-white' : 'bg-[#fffaf1] text-violet-700 hover:bg-violet-50'
                  }`}
                  title={isVoiceMuted ? 'Unmute' : 'Mute'}
                >
                  <i className={`fas ${isVoiceMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                </button>
              </div>

              <div className="mb-3 rounded-md bg-[#fffaf1] px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${voiceMediaMeta.className}`}>
                    <i className={`fas ${voiceMediaMeta.icon} shrink-0`}></i>
                    <span className="truncate">{voiceMediaMeta.label}</span>
                  </span>
                  <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                    voiceSignalStatus.state === 'syncing'
                      ? 'bg-amber-100 text-amber-800'
                      : voiceSignalStatus.state === 'listening'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-stone-100 text-stone-500'
                  }`}>
                    <i className={`fas ${voiceSignalStatus.state === 'syncing' ? 'fa-spinner fa-spin' : 'fa-tower-broadcast'} shrink-0`}></i>
                    <span className="truncate">
                      {voiceSignalStatus.state === 'idle'
                        ? 'Local'
                        : voiceSignalStatus.state === 'syncing'
                          ? 'Syncing'
                          : linkedVoicePeerCount > 0
                            ? `${linkedVoicePeerCount} linked`
                            : `${voiceSignalStatus.peers} peer${voiceSignalStatus.peers === 1 ? '' : 's'}`}
                    </span>
                  </span>
                  {activeVoiceRoom && (
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-stone-400">
                      {getVoiceOpenMemberCount(activeVoiceRoom)} open
                    </span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-[1fr_42px] items-center gap-2">
                  <div className="flex h-6 items-end gap-1 rounded-md bg-white/75 px-2 py-1">
                    {Array.from({ length: 8 }).map((_, index) => {
                      const active = voiceMediaStatus === 'ready' && !isVoiceMuted && index < voiceInputBarCount;
                      return (
                        <span
                          key={index}
                          className={`flex-1 rounded-full transition-colors ${active ? 'bg-violet-500' : 'bg-stone-200'}`}
                          style={{
                            height: `${4 + index * 1.6}px`,
                            opacity: active ? 0.5 + index * 0.055 : 0.55,
                          }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-right text-[9px] font-black uppercase tracking-wider text-stone-500">
                    {voiceMediaStatus === 'ready' && !isVoiceMuted ? `${voiceInputPercent}%` : '0%'}
                  </span>
                </div>
                {voiceMediaError && (
                  <p className="mt-1 line-clamp-2 text-[9px] font-bold leading-snug text-rose-600">{voiceMediaError}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => joinVoiceRoom('proximity')}
                  disabled={isVoiceUpdating === `proximity:${currentZone}`}
                  className="min-h-10 rounded-md bg-[#fffaf1] px-2 text-[9px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60"
                >
                  Nearby
                </button>
                <button
                  type="button"
                  onClick={() => joinVoiceRoom('party')}
                  disabled={!worldParty || isVoiceUpdating === `party:${currentZone}`}
                  className="min-h-10 rounded-md bg-[#fffaf1] px-2 text-[9px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Party
                </button>
                <button
                  type="button"
                  onClick={() => joinVoiceRoom('guild')}
                  disabled={!worldGuild || isVoiceUpdating === `guild:${currentZone}`}
                  className="min-h-10 rounded-md bg-[#fffaf1] px-2 text-[9px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Guild
                </button>
              </div>

              {activeVoiceRoom && (
                <div className="mt-3 rounded-md bg-[#fffaf1] p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[10px] font-black uppercase tracking-wider text-stone-700">
                      <i className="fas fa-headset mr-1.5 text-violet-700"></i>
                      {activeVoiceRoom.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => leaveVoiceRoom(activeVoiceRoom.id)}
                      disabled={isVoiceUpdating === `leave:${activeVoiceRoom.id}`}
                      className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-stone-600 transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60"
                    >
                      Leave
                    </button>
                  </div>
                  <div className="space-y-1">
                    {activeVoiceRoom.members.map(member => (
                      <div key={member.userId} className="flex items-center justify-between gap-2 rounded-md bg-white/80 px-2 py-1.5">
                        <p className="min-w-0 truncate text-[10px] font-black text-stone-700">{member.name}</p>
                        <i className={`fas ${member.isMuted ? 'fa-microphone-slash text-stone-400' : 'fa-microphone text-violet-600'} shrink-0 text-[10px]`}></i>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <p className="mb-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-stone-400">Nearby</p>
                {nearbyVoicePresences.length === 0 ? (
                  <p className="rounded-md bg-[#fffaf1] px-3 py-3 text-center text-[10px] font-bold text-stone-400">
                    Move closer to another avatar for proximity voice.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {nearbyVoicePresences.map(({ presence, distance }) => {
                      const signalMeta = getVoiceSignalMeta(distance);
                      return (
                        <div key={presence.userId} className="flex items-center justify-between gap-2 rounded-md bg-[#fffaf1] px-2 py-1.5">
                          <p className="min-w-0 truncate text-[10px] font-black text-stone-700">
                            {presence.name}
                            <span className="ml-1 text-stone-400">{distance.toFixed(1)}m</span>
                            <span className="ml-1 text-violet-500">{signalMeta.label}</span>
                          </p>
                          {presence.voiceRoomName ? (
                            <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-violet-700">
                              In voice
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => joinVoiceRoom('direct', { userId: presence.userId, name: presence.name })}
                              disabled={isVoiceUpdating === `direct:${presence.userId}`}
                              className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-violet-700 transition hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60"
                            >
                              Call
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setIsEventPanelOpen(prev => !prev)}
          className="pointer-events-auto mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/80 text-[10px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-amber-50 hover:text-amber-700"
        >
          <i className="fas fa-star"></i>
          Event
          {worldEvent && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] text-amber-800">{worldEvent.participants.length}</span>
          )}
          {isEventUpdating && <i className="fas fa-spinner fa-spin"></i>}
        </button>
        <AnimatePresence>
          {isEventPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto mt-3 rounded-md border border-amber-100 bg-white/85 p-3"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">World Event</p>
                  <p className="truncate text-sm font-black text-stone-800">{worldEvent?.title || 'Garden Gathering'}</p>
                  <p className="truncate text-[11px] font-bold text-stone-500">{worldEvent?.district || currentZone}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={isJoinedEvent ? () => leaveWorldEvent() : () => joinWorldEvent(currentZone)}
                    disabled={isEventUpdating}
                    className="h-9 rounded-md bg-[#fffaf1] px-3 text-[9px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-amber-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isJoinedEvent ? 'Leave' : 'Join'}
                  </button>
                  <button
                    type="button"
                    onClick={() => rallyWorldEvent(currentZone)}
                    disabled={isEventUpdating}
                    className="grid h-9 w-9 place-items-center rounded-md bg-rose-500 text-white shadow-sm shadow-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-600 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-60"
                    title="Rally event"
                    aria-label="Rally event"
                  >
                    <i className="fas fa-bullhorn text-[11px]"></i>
                  </button>
                </div>
              </div>
              {worldEvent ? (
                <div className="space-y-1.5">
                  {worldEvent.description && (
                    <p className="rounded-md bg-[#fffaf1] px-3 py-2 text-[11px] font-bold leading-relaxed text-stone-500">
                      {worldEvent.description}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded-md bg-amber-50 px-2.5 py-2">
                      <p className="text-[8px] font-black uppercase tracking-wider text-amber-600">Rallies</p>
                      <p className="text-sm font-black text-stone-800">{eventRallyCount}</p>
                    </div>
                    <div className="min-w-0 rounded-md bg-rose-50 px-2.5 py-2">
                      <p className="text-[8px] font-black uppercase tracking-wider text-rose-500">Last Call</p>
                      <p className="truncate text-sm font-black text-stone-800">{eventLastRallyBy || 'Waiting'}</p>
                    </div>
                  </div>
                  {eventLastRallyAt && (
                    <p className="rounded-md bg-[#fffaf1] px-2.5 py-1.5 text-[10px] font-bold text-stone-500">
                      <i className="fas fa-location-crosshairs mr-1 text-amber-600"></i>
                      {formatActionTime(eventLastRallyAt)}
                      {eventRallyZone ? ` near ${eventRallyZone}` : ''}
                    </p>
                  )}
                  {worldEvent.participants.length > 0 ? (
                    worldEvent.participants.map(participant => (
                      <div key={participant.userId} className="flex items-center justify-between gap-2 rounded-md bg-[#fffaf1] px-2.5 py-2">
                        <p className="min-w-0 truncate text-[11px] font-black text-stone-700">{participant.name}</p>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-700">
                          {participant.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-md bg-[#fffaf1] px-3 py-4 text-center text-[11px] font-bold text-stone-400">
                      Join from here or speak with Lena at the event lawn.
                    </p>
                  )}
                </div>
              ) : (
                <p className="rounded-md bg-[#fffaf1] px-3 py-4 text-center text-[11px] font-bold text-stone-400">
                  The event board is being prepared.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setIsGuildPanelOpen(prev => !prev)}
          className="pointer-events-auto mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/80 text-[10px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-emerald-50 hover:text-emerald-700"
        >
          <i className="fas fa-shield-heart"></i>
          Guild
          {worldGuild && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] text-emerald-700">{worldGuild.members.length}</span>
          )}
          {isGuildUpdating && <i className="fas fa-spinner fa-spin"></i>}
        </button>
        <AnimatePresence>
          {isGuildPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto mt-3 rounded-md border border-emerald-100 bg-white/85 p-3"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">Guild Hall</p>
                  <p className="truncate text-sm font-black text-stone-800">{worldGuild?.name || 'No active guild'}</p>
                  <p className="truncate text-[11px] font-bold text-stone-500">{worldGuild ? `${worldGuild.members.length} members` : currentZone}</p>
                </div>
                <button
                  type="button"
                  onClick={worldGuild ? leaveGuild : () => void ensureGuild()}
                  disabled={isGuildUpdating}
                  className="h-9 rounded-md bg-[#fffaf1] px-3 text-[9px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
                >
                  {worldGuild ? 'Leave' : 'Create'}
                </button>
              </div>
              {worldGuild ? (
                <div className="space-y-1.5">
                  {worldGuild.motto && (
                    <p className="rounded-md bg-[#fffaf1] px-3 py-2 text-[11px] font-bold leading-relaxed text-stone-500">
                      {worldGuild.motto}
                    </p>
                  )}
                  {worldGuild.members.map(member => (
                    <div key={member.userId} className="flex items-center justify-between gap-2 rounded-md bg-[#fffaf1] px-2.5 py-2">
                      <p className="min-w-0 truncate text-[11px] font-black text-stone-700">{member.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                        member.role === 'leader' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md bg-[#fffaf1] px-3 py-4 text-center text-[11px] font-bold text-stone-400">
                  Create a guild here, then invite nearby avatars from their character panel.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setIsPartyPanelOpen(prev => !prev)}
          className="pointer-events-auto mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/80 text-[10px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-pink-50 hover:text-pink-600"
        >
          <i className="fas fa-users"></i>
          Party
          {worldParty && (
            <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[9px] text-pink-700">{worldParty.members.length}</span>
          )}
          {isPartyUpdating && <i className="fas fa-spinner fa-spin"></i>}
        </button>
        <AnimatePresence>
          {isPartyPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto mt-3 rounded-md border border-pink-100 bg-white/85 p-3"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-600">Party</p>
                  <p className="truncate text-sm font-black text-stone-800">{worldParty?.name || 'No active party'}</p>
                  <p className="truncate text-[11px] font-bold text-stone-500">{worldParty ? `${worldParty.members.length} members` : currentZone}</p>
                </div>
                <button
                  type="button"
                  onClick={worldParty ? leaveParty : () => void ensureParty()}
                  disabled={isPartyUpdating}
                  className="h-9 rounded-md bg-[#fffaf1] px-3 text-[9px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-pink-50 disabled:cursor-wait disabled:opacity-60"
                >
                  {worldParty ? 'Leave' : 'Create'}
                </button>
              </div>
              {worldParty ? (
                <div className="space-y-1.5">
                  {worldParty.members.map(member => (
                    <div key={member.userId} className="flex items-center justify-between gap-2 rounded-md bg-[#fffaf1] px-2.5 py-2">
                      <p className="min-w-0 truncate text-[11px] font-black text-stone-700">{member.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                        member.role === 'leader' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md bg-[#fffaf1] px-3 py-4 text-center text-[11px] font-bold text-stone-400">
                  Create a party here, then invite nearby avatars from their character panel.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setIsActionFeedOpen(prev => !prev)}
          className="pointer-events-auto mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/80 text-[10px] font-black uppercase tracking-wider text-stone-700 transition hover:bg-amber-50 hover:text-amber-700"
        >
          <i className="fas fa-scroll"></i>
          World Feed
          {activityBeacons.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] text-amber-800">{activityBeacons.length}</span>
          )}
        </button>
        <AnimatePresence>
          {isActionFeedOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pointer-events-auto mt-3 max-h-56 overflow-y-auto rounded-md border border-amber-100 bg-white/80 p-2"
            >
              {activityBeacons.length === 0 ? (
                <p className="px-2 py-4 text-center text-[11px] font-bold text-stone-400">No live activity beacons yet</p>
              ) : (
                <div className="space-y-1.5">
                  {activityBeacons.map(beacon => {
                    const createdAt = beacon.action?.createdAt || beacon.message?.createdAt || '';
                    const audience = beacon.message ? getChatAudience(beacon.message) : '';
                    return (
                      <button
                        key={beacon.id}
                        type="button"
                        onClick={() => focusActivityBeacon(beacon)}
                        className="group w-full rounded-md bg-[#fffaf1] px-2.5 py-2 text-left transition hover:bg-amber-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-[11px] font-black text-stone-700">
                            <i className={`fas ${beacon.icon} mr-1.5`} style={{ color: beacon.color }}></i>
                            {beacon.action ? getActivityActionLine(beacon.action) : `${beacon.label} ${audience}`}
                          </p>
                          <span className="shrink-0 text-[9px] font-black uppercase text-stone-400">{formatActionTime(createdAt)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-[9px] font-bold uppercase tracking-wider text-emerald-700">{beacon.detail}</p>
                          <span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-stone-400 transition group-hover:text-amber-700">
                            <i className="fas fa-location-crosshairs mr-1"></i>
                            Focus
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-auto fixed bottom-8 left-4 z-[70] flex max-w-[calc(100vw-9rem)] items-end gap-2 md:left-6">
        <button
          type="button"
          onClick={() => setIsEmoteWheelOpen(prev => !prev)}
          disabled={isSavingCharacter}
          className={`flex h-12 min-w-[3rem] items-center justify-center rounded-md border px-3 text-[10px] font-black uppercase tracking-wider shadow-2xl backdrop-blur-xl transition active:scale-95 disabled:cursor-wait disabled:opacity-60 ${
            isEmoteWheelOpen ? 'border-pink-200 bg-pink-500 text-white' : 'border-white/70 bg-[#fffaf1]/90 text-stone-700 hover:bg-pink-50 hover:text-pink-600'
          }`}
          title="Emotes"
          aria-label="Emotes"
        >
          <i className={`fas ${isSavingCharacter ? 'fa-spinner fa-spin' : currentEmoteMeta.icon} text-base`}></i>
          <span className="ml-2 hidden sm:inline">{currentEmoteMeta.label}</span>
        </button>
        <AnimatePresence>
          {isEmoteWheelOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.96 }}
              className="grid grid-cols-5 gap-1.5 rounded-md border border-white/70 bg-white/90 p-2 shadow-2xl backdrop-blur-xl"
            >
              {EMOTE_OPTIONS.map(emote => {
                const meta = getEmoteMeta(emote);
                const active = selfPresence.emote === emote || (!selfPresence.emote && currentProfile.emote === emote);
                return (
                  <button
                    key={emote}
                    type="button"
                    onClick={() => runEmoteAction(emote)}
                    disabled={isSavingCharacter}
                    className={`h-10 w-10 rounded-md text-sm shadow-sm transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 ${
                      active ? 'bg-pink-500 text-white' : 'bg-[#fffaf1] text-stone-600 hover:bg-pink-50 hover:text-pink-600'
                    }`}
                    title={meta.label}
                    aria-label={meta.label}
                  >
                    <i className={`fas ${meta.icon}`}></i>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-auto fixed bottom-7 right-4 z-[70] md:hidden">
        <div
          role="button"
          tabIndex={0}
          aria-label="Move avatar"
          aria-pressed={mobileMovePad.active}
          title="Move avatar"
          onPointerDown={handleMobileMovePadPointerDown}
          onPointerMove={handleMobileMovePadPointerMove}
          onPointerUp={releaseMobileMovePad}
          onPointerCancel={releaseMobileMovePad}
          onLostPointerCapture={releaseMobileMovePad}
          onContextMenu={(event) => event.preventDefault()}
          className={`relative h-28 w-28 touch-none select-none rounded-full border shadow-2xl backdrop-blur-xl transition ${
            mobileMovePad.active
              ? 'border-emerald-200 bg-emerald-50/85 shadow-emerald-900/20'
              : 'border-white/75 bg-[#fffaf1]/85 shadow-emerald-900/10'
          }`}
        >
          <div className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-emerald-700/20" />
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-[10px] text-emerald-700/70">
            <i className="fas fa-chevron-up"></i>
          </div>
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-emerald-700/55">
            <i className="fas fa-chevron-down"></i>
          </div>
          <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-700/55">
            <i className="fas fa-chevron-left"></i>
          </div>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-700/55">
            <i className="fas fa-chevron-right"></i>
          </div>
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-[#fffaf1] text-emerald-800 shadow-lg shadow-emerald-900/15"
            animate={{
              x: mobileMovePad.knobX,
              y: mobileMovePad.knobY,
              scale: mobileMovePad.active ? 1.08 : 1,
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <i className={`fas ${mobileMovePad.active ? 'fa-location-arrow' : 'fa-circle-dot'} text-sm`}></i>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {selectedLandObject && selectedLandObjectMeta && selectedLandObjectPosition && (
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            className="fixed right-4 top-20 z-[85] max-h-[calc(100vh-6.5rem)] w-[min(92vw,340px)] overflow-y-auto rounded-md border border-white/70 bg-[#fffaf1]/95 p-4 shadow-2xl backdrop-blur-xl md:right-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-600">Land Object</p>
                <h3 className="truncate text-lg font-black text-stone-800">
                  <i className={`fas ${selectedLandObjectMeta.icon} mr-2`} style={{ color: selectedLandObjectMeta.color }}></i>
                  {selectedLandObjectMeta.label}
                </h3>
                <p className="truncate text-xs font-bold text-emerald-700">{activeLandName || 'Active Land'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLandObject(null)}
                className="h-9 w-9 shrink-0 rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                title="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onMinimapMoveTarget(getMiniMapVector(selectedLandObjectPosition), selectedLandObjectMeta.label)}
                className="min-h-14 rounded-md bg-white/85 px-3 py-2 text-left transition hover:bg-emerald-50"
              >
                <span className="block text-[10px] font-black uppercase tracking-wider text-stone-700">
                  <i className="fas fa-route mr-1.5 text-emerald-600"></i>
                  Walk Here
                </span>
                <span className="mt-1 block truncate text-[10px] font-bold text-stone-400">
                  {selectedLandObjectPosition[0].toFixed(1)}, {selectedLandObjectPosition[2].toFixed(1)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void inspectLandObject(selectedLandObject)}
                className="min-h-14 rounded-md bg-amber-600 px-3 py-2 text-left text-white shadow-md shadow-amber-200/70 transition hover:bg-amber-500"
              >
                <span className="block text-[10px] font-black uppercase tracking-wider">
                  <i className="fas fa-magnifying-glass mr-1.5"></i>
                  Inspect
                </span>
                <span className="mt-1 block truncate text-[10px] font-bold text-white/75">Broadcast object activity</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (objectCartPortal) onSelectPortal(objectCartPortal);
                }}
                className="min-h-14 rounded-md bg-white/85 px-3 py-2 text-left transition hover:bg-amber-50"
              >
                <span className="block text-[10px] font-black uppercase tracking-wider text-stone-700">
                  <i className="fas fa-cart-shopping mr-1.5 text-amber-600"></i>
                  Object Cart
                </span>
                <span className="mt-1 block truncate text-[10px] font-bold text-stone-400">Place more keepsakes</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDistrict(WORLD_DISTRICTS.find(district => district.id === 'workshop') || null);
                  setSelectedLandObject(null);
                  setSelectedPortal(null);
                  setSelectedNpc(null);
                  setSelectedPresence(null);
                  setIsSelectedDirectChatOpen(false);
                }}
                className="min-h-14 rounded-md bg-white/85 px-3 py-2 text-left transition hover:bg-sky-50"
              >
                <span className="block text-[10px] font-black uppercase tracking-wider text-stone-700">
                  <i className="fas fa-hammer mr-1.5 text-sky-700"></i>
                  Workshop
                </span>
                <span className="mt-1 block truncate text-[10px] font-bold text-stone-400">Land tools and gear</span>
              </button>
            </div>

            <div className="mt-3 rounded-md bg-white/70 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-stone-500">Object Data</p>
              <p className="mt-1 truncate text-[11px] font-bold text-stone-600">
                Type {selectedLandObject.type} / Rotation {(selectedLandObject.rotation || 0).toFixed(2)}
              </p>
              {selectedLandObject.modelUrl && (
                <p className="mt-1 truncate text-[10px] font-bold text-sky-700">
                  <i className="fas fa-cube mr-1.5"></i>
                  Custom model attached
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPortal && (
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            className="fixed right-4 top-20 z-[85] max-h-[calc(100vh-6.5rem)] w-[min(92vw,340px)] overflow-y-auto rounded-md border border-white/70 bg-[#fffaf1]/95 p-4 shadow-2xl backdrop-blur-xl md:right-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-pink-500">World Portal</p>
                <h3 className="truncate text-lg font-black text-stone-800">
                  <i className={`fas ${selectedPortal.icon} mr-2`} style={{ color: selectedPortal.color }}></i>
                  {selectedPortal.name}
                </h3>
                <p className="truncate text-xs font-bold text-emerald-700">{selectedPortal.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPortal(null);
                  setActivePortalPanelId(null);
                }}
                className="h-9 w-9 shrink-0 rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                title="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onMinimapMoveTarget(getMiniMapVector(selectedPortal.position), selectedPortal.name)}
                className="min-h-14 rounded-md bg-white/85 px-3 py-2 text-left transition hover:bg-emerald-50"
              >
                <span className="block text-[10px] font-black uppercase tracking-wider text-stone-700">
                  <i className="fas fa-route mr-1.5 text-emerald-600"></i>
                  Walk Here
                </span>
                <span className="mt-1 block truncate text-[10px] font-bold text-stone-400">Move to portal marker</span>
              </button>
              <button
                type="button"
                onClick={() => void openWorldPortal(selectedPortal)}
                className="min-h-14 rounded-md px-3 py-2 text-left text-white shadow-md transition hover:-translate-y-0.5"
                style={{ backgroundColor: selectedPortal.color }}
              >
                <span className="block text-[10px] font-black uppercase tracking-wider">
                  <i className={`fas ${selectedPortal.icon} mr-1.5`}></i>
                  Open Here
                </span>
                <span className="mt-1 block truncate text-[10px] font-bold text-white/75">Open inside Narinyland</span>
              </button>
              <button
                type="button"
                onClick={() => openPortalBoard(selectedPortal)}
                className="min-h-14 rounded-md bg-white/85 px-3 py-2 text-left transition hover:bg-pink-50"
              >
                <span className="block text-[10px] font-black uppercase tracking-wider text-stone-700">
                  <i className="fas fa-table-list mr-1.5 text-pink-500"></i>
                  Board
                </span>
                <span className="mt-1 block truncate text-[10px] font-bold text-stone-400">Stay in-world</span>
              </button>
            </div>
            <p className="mt-3 rounded-md bg-white/70 px-3 py-2 text-[11px] font-bold leading-relaxed text-stone-500">
              This keeps navigation anchored in the world: walk to the marker, then open the activity from here.
            </p>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-emerald-50/80 px-3 py-2">
              <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-wider text-emerald-700">
                <i className="fas fa-signal mr-1.5"></i>
                Broadcast
              </span>
              <span className="shrink-0 truncate text-[10px] font-bold text-stone-600">
                {selectedPortal.activity} / {getStatusMeta(selectedPortal.status).label}
              </span>
            </div>
            {activePortal && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">
                    <i className={`fas ${activePortal.icon} mr-1.5`} style={{ color: activePortal.color }}></i>
                    In-World Board
                  </p>
                  <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-stone-500">
                    Live
                  </span>
                </div>

                {activePortal.id === 'home' && (
                  <div className="space-y-1.5">
                    {portalMemoryItems.length > 0 ? portalMemoryItems.map((memory, index) => (
                      <div key={memory.id || memory.url || index} className="flex items-center gap-2 rounded-md bg-white/80 px-2.5 py-2">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-pink-50">
                          <img src={memory.url} alt={memory.caption || 'Memory'} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-black text-stone-700">{memory.caption || 'Shared memory'}</p>
                          <p className="truncate text-[9px] font-bold text-stone-400">{memory.privacy} grove item</p>
                        </div>
                      </div>
                    )) : (
                      <p className="rounded-md bg-white/80 px-3 py-4 text-center text-[11px] font-bold text-stone-400">
                        No grove memories yet.
                      </p>
                    )}
                  </div>
                )}

                {activePortal.id === 'timeline' && (
                  <div className="space-y-1.5">
                    {portalTimelineItems.length > 0 ? portalTimelineItems.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onFlagClick(item)}
                        className="w-full rounded-md bg-white/80 px-2.5 py-2 text-left transition hover:bg-sky-50"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-[11px] font-black text-stone-700">{item.text}</span>
                          <span className="shrink-0 text-[9px] font-black text-sky-700">{formatPortalDate(item.timestamp)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[9px] font-bold text-stone-400">
                          {item.location || 'Story marker'}{getInteractionMediaCount(item) ? ` / ${getInteractionMediaCount(item)} media` : ''}
                        </span>
                      </button>
                    )) : (
                      <p className="rounded-md bg-white/80 px-3 py-4 text-center text-[11px] font-bold text-stone-400">
                        No story markers yet.
                      </p>
                    )}
                  </div>
                )}

                {activePortal.id === 'coupons' && (
                  <div className="space-y-1.5">
                    {portalCouponItems.length > 0 ? portalCouponItems.map(coupon => (
                      <div key={coupon.id} className="rounded-md bg-white/80 px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-[11px] font-black text-stone-700">
                            <span className="mr-1.5">{coupon.emoji}</span>
                            {coupon.title}
                          </p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                            coupon.isRedeemed ? 'bg-stone-100 text-stone-500' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {coupon.isRedeemed ? 'Redeemed' : `${coupon.points || 0} pts`}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[9px] font-bold text-stone-400">{coupon.desc}</p>
                      </div>
                    )) : (
                      <p className="rounded-md bg-white/80 px-3 py-4 text-center text-[11px] font-bold text-stone-400">
                        No reward tickets yet.
                      </p>
                    )}
                  </div>
                )}

                {activePortal.id === 'letters' && (
                  <div className="space-y-1.5">
                    {portalLetterItems.length > 0 ? portalLetterItems.map(letter => {
                      const state = getLetterState(letter);
                      return (
                        <div key={letter.id} className="rounded-md bg-white/80 px-2.5 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="min-w-0 truncate text-[11px] font-black text-stone-700">
                              Letter from {letter.fromId || 'someone'}
                            </p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${state.className}`}>
                              <i className={`fas ${state.icon} mr-1`}></i>
                              {state.label}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[9px] font-bold text-stone-400">{letter.content}</p>
                        </div>
                      );
                    }) : (
                      <p className="rounded-md bg-white/80 px-3 py-4 text-center text-[11px] font-bold text-stone-400">
                        No lantern letters yet.
                      </p>
                    )}
                  </div>
                )}

                {activePortal.id === 'shop' && (
                  <div className="space-y-1.5">
                    {landObjects.length > 0 ? landObjects.slice(0, 6).map(item => {
                      const meta = getLandObjectMeta(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectLandObject(item)}
                          className="flex w-full items-center justify-between gap-2 rounded-md bg-white/80 px-2.5 py-2 text-left transition hover:bg-amber-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[11px] font-black text-stone-700">
                              <i className={`fas ${meta.icon} mr-1.5 text-amber-600`}></i>
                              {meta.label}
                            </span>
                            <span className="mt-0.5 block truncate text-[9px] font-bold text-stone-400">
                              x {item.x.toFixed(1)} / z {item.z.toFixed(1)}
                            </span>
                          </span>
                          <i className="fas fa-chevron-right shrink-0 text-[9px] text-stone-300"></i>
                        </button>
                      );
                    }) : (
                      <p className="rounded-md bg-white/80 px-3 py-4 text-center text-[11px] font-bold text-stone-400">
                        The cart is ready for your first decoration.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDistrictPanelOpen && selectedDistrict && selectedDistrictPrimaryAction && (
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            className="fixed right-4 top-20 z-[85] max-h-[calc(100vh-6.5rem)] w-[min(92vw,360px)] overflow-y-auto rounded-md border border-white/70 bg-[#fffaf1]/95 p-4 shadow-2xl backdrop-blur-xl md:right-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-700">District Hub</p>
                <h3 className="truncate text-lg font-black text-stone-800">
                  <i className={`fas ${selectedDistrict.icon} mr-2 text-amber-600`}></i>
                  {selectedDistrict.name}
                </h3>
                <p className="truncate text-xs font-bold text-emerald-700">{selectedDistrictZone}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDistrict(null)}
                className="h-9 w-9 shrink-0 rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                title="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void runDistrictAction(selectedDistrict, 'walk')}
                className="min-h-14 rounded-md bg-white/85 px-3 py-2 text-left transition hover:bg-emerald-50"
              >
                <span className="block text-[10px] font-black uppercase tracking-wider text-stone-700">
                  <i className="fas fa-route mr-1.5 text-emerald-600"></i>
                  Walk Here
                </span>
                <span className="mt-1 block truncate text-[10px] font-bold text-stone-400">Move to district center</span>
              </button>
              <button
                type="button"
                onClick={() => void runDistrictAction(selectedDistrict, 'primary')}
                className="min-h-14 rounded-md bg-pink-500 px-3 py-2 text-left text-white shadow-md shadow-pink-200/70 transition hover:bg-pink-600"
              >
                <span className="block text-[10px] font-black uppercase tracking-wider">
                  <i className={`fas ${selectedDistrictPrimaryAction.icon} mr-1.5`}></i>
                  {selectedDistrictPrimaryAction.label}
                </span>
                <span className="mt-1 block truncate text-[10px] font-bold text-white/75">{selectedDistrictPrimaryAction.hint}</span>
              </button>
              <button
                type="button"
                onClick={() => void runDistrictAction(selectedDistrict, 'party')}
                disabled={isPartyUpdating}
                className="min-h-14 rounded-md bg-white/85 px-3 py-2 text-left transition hover:bg-amber-50 disabled:cursor-wait disabled:opacity-60"
              >
                <span className="block text-[10px] font-black uppercase tracking-wider text-stone-700">
                  <i className={`fas ${isPartyUpdating ? 'fa-spinner fa-spin' : 'fa-users'} mr-1.5 text-amber-600`}></i>
                  Party Up
                </span>
                <span className="mt-1 block truncate text-[10px] font-bold text-stone-400">{worldParty ? worldParty.name : 'Create local party'}</span>
              </button>
              <button
                type="button"
                onClick={() => void runDistrictAction(selectedDistrict, 'chat')}
                className="min-h-14 rounded-md bg-white/85 px-3 py-2 text-left transition hover:bg-emerald-50"
              >
                <span className="block text-[10px] font-black uppercase tracking-wider text-stone-700">
                  <i className="fas fa-comment mr-1.5 text-emerald-600"></i>
                  World Chat
                </span>
                <span className="mt-1 block truncate text-[10px] font-bold text-stone-400">{worldChatMessages.length} recent messages</span>
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-500">Nearby Here</p>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700">{selectedDistrictPresences.length}</span>
              </div>
              {selectedDistrictPresences.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedDistrictPresences.map(presence => {
                    const statusMeta = getStatusMeta(presence.status);
                    const isSelf = presence.userId === userId;
                    return (
                      <button
                        key={presence.userId}
                        type="button"
                        onClick={() => {
                          if (!isSelf) onSelectPresence(presence);
                        }}
                        disabled={isSelf}
                        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-md bg-white/75 px-2.5 py-2 text-left transition hover:bg-pink-50 disabled:cursor-default disabled:hover:bg-white/75"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-black text-stone-800">{isSelf ? `${presence.name} (You)` : presence.name}</span>
                          <span className="block truncate text-[10px] font-bold text-stone-400">{presence.activity}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-stone-100 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-stone-600">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusMeta.color }} />
                          {statusMeta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-md bg-white/70 px-3 py-4 text-center text-[11px] font-bold text-stone-400">No avatars are standing here yet.</p>
              )}
            </div>

            {selectedDistrictNpcs.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-stone-500">Guides Here</p>
                <div className="grid gap-1.5">
                  {selectedDistrictNpcs.map(npc => (
                    <button
                      key={npc.id}
                      type="button"
                      onClick={() => onSelectNpc(npc)}
                      className="flex min-h-10 items-center justify-between gap-2 rounded-md bg-amber-50/80 px-2.5 py-2 text-left transition hover:bg-amber-100"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-black text-stone-800">
                          <i className={`fas ${npc.icon} mr-1.5 text-amber-600`}></i>
                          {npc.name}
                        </span>
                        <span className="block truncate text-[10px] font-bold text-amber-700">{npc.role}</span>
                      </span>
                      <i className="fas fa-chevron-right shrink-0 text-[10px] text-amber-700"></i>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedNpc && (
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            className="fixed right-4 top-20 z-[85] max-h-[calc(100vh-6.5rem)] w-[min(92vw,360px)] overflow-y-auto rounded-md border border-white/70 bg-[#fffaf1]/95 p-4 shadow-2xl backdrop-blur-xl md:right-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-600">District NPC</p>
                <h3 className="truncate text-lg font-black text-stone-800">
                  <i className={`fas ${selectedNpc.icon} mr-2 text-amber-600`}></i>
                  {selectedNpc.name}
                </h3>
                <p className="truncate text-xs font-bold text-emerald-700">{selectedNpc.role} in {selectedNpc.district}</p>
                <p className="truncate text-[11px] font-black uppercase tracking-wider text-stone-400">
                  {selectedNpcQueued
                    ? 'Approaching'
                    : selectedNpcDistance !== null
                      ? selectedNpcDistance <= NPC_INTERACTION_RANGE
                        ? 'Ready nearby'
                        : `${selectedNpcDistance.toFixed(1)}m away`
                      : 'Patrolling'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedNpcPosition || tupleToPresenceVector(selectedNpc.position);
                    onMinimapMoveTarget(getFollowDestination(selfPosition, target), selectedNpc.name);
                  }}
                  className="h-9 w-9 rounded-md bg-amber-100 text-amber-700 transition hover:bg-amber-200"
                  title="Walk to guide"
                  aria-label="Walk to guide"
                >
                  <i className="fas fa-location-crosshairs text-[11px]"></i>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNpc(null)}
                  className="h-9 w-9 rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                  title="Close"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {selectedNpc.actions.map(action => (
                <button
                  key={action.intent}
                  type="button"
                  onClick={() => runNpcAction(selectedNpc, action)}
                  disabled={pendingNpcIntent === action.intent}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md bg-white/80 px-3 py-2 text-left transition hover:bg-amber-50 disabled:cursor-wait disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-black uppercase tracking-wider text-stone-700">{action.label}</span>
                    <span className="block truncate text-[10px] font-bold text-stone-400">
                      {pendingNpcIntent === action.intent && selectedNpcQueued
                        ? 'Approaching guide'
                        : selectedNpcDistance !== null && selectedNpcDistance > NPC_INTERACTION_RANGE
                          ? `${selectedNpcDistance.toFixed(1)}m away`
                          : selectedNpc.district}
                    </span>
                  </span>
                  <i className={`fas ${pendingNpcIntent === action.intent ? 'fa-spinner fa-spin' : 'fa-chevron-right'} shrink-0 text-[10px] text-amber-600`}></i>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPresence && selectedCharacterPanelUserId === selectedPresence.userId && (
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            className="fixed right-4 top-20 z-[85] max-h-[calc(100vh-6.5rem)] w-[min(92vw,360px)] overflow-y-auto rounded-md border border-white/70 bg-[#fffaf1]/95 p-4 shadow-2xl backdrop-blur-xl md:right-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-pink-500">Character</p>
                <h3 className="truncate text-lg font-black text-stone-800">{selectedPresence.name}</h3>
                <p className="truncate text-xs font-bold text-emerald-700">{selectedPresence.activity} in {selectedPresence.currentZone}</p>
                <p className="truncate text-[11px] font-black uppercase tracking-wider text-stone-400">
                  {selectedQueuedAction
                    ? 'Approaching'
                    : selectedPresenceReady
                      ? 'Ready nearby'
                      : selectedPresenceDistance !== null
                        ? `${selectedPresenceDistance.toFixed(1)}m away`
                        : 'In world'}
                </p>
                {selectedPresence.guild && (
                  <p className="truncate text-[11px] font-black uppercase tracking-wider text-emerald-600">
                    <i className="fas fa-shield-heart mr-1.5"></i>
                    {selectedPresence.guild}
                  </p>
                )}
                {selectedRelationship?.label && (
                  <p className="truncate text-[11px] font-black uppercase tracking-wider text-sky-600">
                    <i className="fas fa-heart-circle-check mr-1.5"></i>
                    {selectedRelationship.label}
                  </p>
                )}
                {selectedPresence.achievements && selectedPresence.achievements.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedPresence.achievements.map(achievement => (
                      <span
                        key={achievement.achievementKey}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-700"
                        title={achievement.titleReward || achievement.name}
                      >
                        <i className={`fas ${achievement.icon}`}></i>
                        {achievement.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMinimapMoveTarget(getFollowDestination(selfPosition, selectedPresence.position), selectedPresence.name)}
                  className="h-9 w-9 rounded-md bg-pink-100 text-pink-600 transition hover:bg-pink-200"
                  title="Walk to avatar"
                  aria-label="Walk to avatar"
                >
                  <i className="fas fa-location-crosshairs text-[11px]"></i>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPresence(null);
                    setSelectedCharacterPanelUserId(null);
                    setSelectedActivityFeed(null);
                    setIsSelectedProfileOpen(false);
                    setIsSelectedActivityOpen(false);
                    setIsSelectedDirectChatOpen(false);
                  }}
                  className="h-9 w-9 rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                  title="Close"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <AvatarInspectionPreview
              presence={selectedPresence}
              quality={quality}
              relationshipLabel={selectedRelationship?.label}
              rangeLabel={
                selectedQueuedAction
                  ? 'Approaching'
                  : selectedPresenceReady
                    ? 'Ready nearby'
                    : selectedPresenceDistance !== null
                      ? `${selectedPresenceDistance.toFixed(1)}m away`
                      : 'In world'
              }
            />
            <div className="mb-3 rounded-md bg-white/75 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">Current Activity</p>
                  <p className="truncate text-sm font-black text-stone-800">
                    {selectedActivityFeed?.userId === selectedPresence.userId
                      ? selectedActivityFeed.profile?.activity || selectedPresence.activity
                      : selectedPresence.activity}
                  </p>
                  <p className="truncate text-[10px] font-bold text-stone-500">{selectedPresence.currentZone}</p>
                  {selectedPresence.intent && (
                    <p className="mt-1 truncate text-[10px] font-black uppercase tracking-wider text-amber-700">
                      <i className={`fas ${selectedPresence.intent.icon || getPresenceIntentMeta(selectedPresence.intent)?.icon || 'fa-location-dot'} mr-1.5`}></i>
                      {selectedPresence.intent.label}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                  {selectedActivityFeed?.userId === selectedPresence.userId
                    ? selectedActivityFeed.profile?.status || selectedPresence.status
                    : selectedPresence.status}
                </span>
              </div>
            </div>
            {selectedQueuedAction && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-md border border-amber-100 bg-amber-50/90 px-3 py-2 text-amber-800">
                <div className="flex min-w-0 items-center gap-2">
                  <i className="fas fa-person-walking shrink-0 text-xs"></i>
                  <div className="min-w-0">
                    <p className="truncate text-[9px] font-black uppercase tracking-[0.18em]">Approaching</p>
                    <p className="truncate text-[10px] font-bold">Walking closer for {selectedQueuedAction.label}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => cancelQueuedAvatarApproach()}
                  className="h-7 shrink-0 rounded-md bg-white/80 px-2 text-[8px] font-black uppercase tracking-wider text-amber-800 transition hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {WORLD_ACTIONS.map(action => {
                const isLiveFollowAction = action.type === 'follow_user' && activeFollowTargetId === selectedPresence.userId;
                const queued = selectedQueuedAction?.type === action.type;
                const needsApproach = AVATAR_PROXIMITY_ACTION_TYPES.has(action.type) && !selectedPresenceReady;
                const hint = isLiveFollowAction
                  ? 'Following'
                  : getAvatarActionRangeHint(action.type, selectedPresenceDistance, selectedPresenceReady, selectedQueuedAction?.type);
                return (
                  <button
                    key={action.type}
                    type="button"
                    onClick={() => runWorldAction(action, selectedPresence)}
                    disabled={pendingActionType === action.type}
                    className={`flex min-h-12 min-w-0 flex-col items-center justify-center rounded-md px-2 py-1.5 text-center transition disabled:cursor-wait disabled:opacity-60 ${getAvatarPanelActionClasses(action.type, isLiveFollowAction, queued, needsApproach)}`}
                  >
                    <span className="flex max-w-full items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                      <i className={`fas ${pendingActionType === action.type ? 'fa-spinner fa-spin' : isLiveFollowAction ? 'fa-route' : action.icon} shrink-0 text-[10px]`}></i>
                      <span className="truncate">
                        {isLiveFollowAction ? 'Stop Follow' : getRelationshipActionLabel(action.type, action.label, selectedRelationship)}
                      </span>
                    </span>
                    <span className="mt-0.5 block max-w-full truncate text-[8px] font-black uppercase tracking-wider opacity-70">
                      {hint}
                    </span>
                  </button>
                );
              })}
            </div>
            {isSelectedProfileOpen && (
              <div className="mt-4 rounded-md bg-white/75 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-500">Profile Passport</p>
                    <p className="truncate text-sm font-black text-stone-800">{selectedPresence.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadSelectedProfile(selectedPresence)}
                    disabled={isLoadingSelectedProfile}
                    className="h-7 w-7 shrink-0 rounded-md text-stone-500 transition hover:bg-pink-50 hover:text-pink-600 disabled:cursor-wait disabled:opacity-50"
                    title="Refresh profile"
                  >
                    <i className={`fas ${isLoadingSelectedProfile ? 'fa-spinner fa-spin' : 'fa-rotate-right'} text-[10px]`}></i>
                  </button>
                </div>
                {isLoadingSelectedProfile && selectedActivityFeed?.userId !== selectedPresence.userId ? (
                  <div className="flex h-24 items-center justify-center rounded-md bg-[#fffaf1] text-[11px] font-black uppercase tracking-wider text-stone-400">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Inspecting
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-[56px_1fr] gap-3">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-md border border-white/80 shadow-inner"
                        style={{ background: selectedProfileAppearance.bodyColor }}
                      >
                        <div
                          className="h-8 w-8 rounded-full border-2"
                          style={{
                            background: selectedProfileAppearance.skinColor,
                            borderColor: selectedProfileAppearance.trimColor,
                          }}
                        />
                      </div>
                      <div className="min-w-0 rounded-md bg-[#fffaf1] px-3 py-2">
                        <p className="truncate text-[11px] font-black uppercase tracking-wider text-stone-700">
                          {selectedProfileSummary?.title || selectedPresence.title || 'Explorer'}
                        </p>
                        <p className="truncate text-[10px] font-bold text-emerald-700">
                          {selectedProfileSummary?.activity || selectedPresence.activity}
                        </p>
                        <p className="truncate text-[9px] font-bold text-stone-400">
                          Last seen {formatActionTime(selectedActivityFeed?.presence?.lastSeen || selectedPresence.lastSeen)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {INVENTORY_SLOTS.map(item => (
                        <div key={item.slot} className="rounded-md bg-[#fffaf1] px-2 py-2">
                          <p className="truncate text-[8px] font-black uppercase tracking-wider text-stone-400">
                            <i className={`fas ${item.icon} mr-1 text-amber-600`}></i>
                            {item.label}
                          </p>
                          <p className="mt-1 truncate text-[10px] font-black text-stone-700">{getEquipmentLabel(selectedProfileEquipment[item.slot])}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-md bg-[#fffaf1] px-3 py-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Palette</p>
                      <div className="flex shrink-0 gap-1.5">
                        {[selectedProfileAppearance.bodyColor, selectedProfileAppearance.trimColor, selectedProfileAppearance.hairColor].map(color => (
                          <span
                            key={color}
                            className="h-5 w-5 rounded-full border border-white shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    {selectedPresence.achievements && selectedPresence.achievements.length > 0 ? (
                      <div className="rounded-md bg-[#fffaf1] px-3 py-2">
                        <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-amber-700">Badges</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedPresence.achievements.slice(0, 5).map(achievement => (
                            <span
                              key={achievement.achievementKey}
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-700"
                              title={achievement.titleReward || achievement.name}
                            >
                              <i className={`fas ${achievement.icon}`}></i>
                              {achievement.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-md bg-[#fffaf1] px-3 py-3 text-center text-[11px] font-bold text-stone-400">
                        No visible badges yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {isSelectedActivityOpen && (
              <div className="mt-4 rounded-md bg-white/75 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-500">Activity Feed</p>
                  <button
                    type="button"
                    onClick={() => loadSelectedActivityFeed(selectedPresence)}
                    disabled={isLoadingSelectedActivity}
                    className="h-7 w-7 shrink-0 rounded-md text-stone-500 transition hover:bg-pink-50 hover:text-pink-600 disabled:cursor-wait disabled:opacity-50"
                    title="Refresh activity"
                  >
                    <i className={`fas ${isLoadingSelectedActivity ? 'fa-spinner fa-spin' : 'fa-rotate-right'} text-[10px]`}></i>
                  </button>
                </div>
                {isLoadingSelectedActivity && selectedActivityEntries.length === 0 ? (
                  <div className="flex h-20 items-center justify-center rounded-md bg-[#fffaf1] text-[11px] font-black uppercase tracking-wider text-stone-400">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Loading
                  </div>
                ) : selectedActivityEntries.length > 0 ? (
                  <div className="space-y-2">
                    {selectedActivityEntries.map(entry => (
                      <div key={entry.id} className="rounded-md bg-[#fffaf1] px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-[11px] font-black text-stone-700">
                            <i className={`fas ${entry.kind === 'chat' ? 'fa-comment' : 'fa-compass'} mr-1.5 text-pink-500`}></i>
                            {entry.kind === 'chat' ? `${entry.message.fromName} chatted` : getActivityActionLine(entry.action)}
                          </p>
                          <span className="shrink-0 text-[9px] font-black text-stone-400">{formatActionTime(entry.createdAt)}</span>
                        </div>
                        {entry.kind === 'chat' && (
                          <p className="mt-1 line-clamp-2 text-[10px] font-bold text-stone-500">
                            {entry.message.body}
                          </p>
                        )}
                        {entry.kind === 'action' && typeof entry.action.metadata?.currentZone === 'string' && (
                          <p className="mt-1 truncate text-[10px] font-bold text-emerald-600">{String(entry.action.metadata.currentZone)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md bg-[#fffaf1] px-3 py-4 text-center text-[11px] font-bold text-stone-500">
                    No visible world activity yet.
                  </div>
                )}
              </div>
            )}
            {!isSelectedActivityOpen && recentTargetActions.length > 0 && (
              <div className="mt-4 rounded-md bg-white/70 p-3">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Recent</p>
                <div className="space-y-2">
                  {recentTargetActions.map(action => (
                    <div key={action.id} className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-[11px] font-bold text-stone-700">
                        {getActionLabel(action)} {action.toName ? `with ${action.toName}` : ''}
                      </p>
                      <span className="shrink-0 text-[9px] font-black text-stone-400">{formatActionTime(action.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {worldToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-8 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-stone-900/85 px-4 py-2 text-sm font-bold text-white shadow-2xl backdrop-blur-md"
          >
            {worldToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
