import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { deleteFile } from '@/lib/storage';

import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

type MediaInput = {
  type?: string;
  url?: string;
};

type PartnerInput = {
  name?: string;
  avatar?: string;
};

type CouponInput = {
  id: string;
  title?: string;
  emoji?: string;
  desc?: string;
  color?: string;
  for?: string;
  forPartner?: string;
  points?: number;
  isRedeemed?: boolean;
  redeemedAt?: string | Date | null;
};

type GalleryInput = {
  url: string;
  privacy?: 'public' | 'private';
  caption?: string | null;
  albumId?: string | null;
};

type TimelineInput = {
  id: string;
  text?: string;
  type?: string;
  location?: string;
  timestamp?: string | Date;
  media?: MediaInput;
  mediaItems?: MediaInput[];
};

type ConfigUpdateBody = {
  appName?: string;
  anniversaryDate?: string | Date;
  treeStyle?: string;
  galleryStyle?: string;
  gallerySource?: string;
  instagramUsername?: string;
  daysPerTree?: number;
  daysPerFlower?: number;
  flowerType?: string;
  mixedFlowers?: string[];
  skyMode?: string;
  petType?: string;
  pets?: Prisma.InputJsonValue;
  timelineDefaultRows?: number;
  timelineLayoutMode?: string;
  timelineZoomLevel?: number;
  musicPlaylist?: string[];
  proposal?: {
    questions?: string[];
    progress?: number;
  };
  partners?: Record<string, PartnerInput>;
  coupons?: CouponInput[];
  gallery?: GalleryInput[];
  timeline?: TimelineInput[];
  isProposalAccepted?: boolean;
  proposalProgress?: number;
  graphicsQuality?: string;
  showQRCode?: boolean;
  showCouponsOnTimeline?: boolean;
  timelineCardScale?: number;
  showProposal?: boolean;
};

function getMemoryCacheKey(configId: string, privacy: string | null): string {
  return `memories:${configId}:${privacy || 'all'}`;
}

async function invalidateConfigCaches(configId: string, configCacheKey: string) {
  await Promise.all([
    redis.del(configCacheKey),
    redis.del(`timeline_events:${configId}`),
    redis.del(`love_letters:${configId}`),
    redis.del(`app_stats:${configId}`),
    redis.del(getMemoryCacheKey(configId, null)),
    redis.del(getMemoryCacheKey(configId, 'public')),
    redis.del(getMemoryCacheKey(configId, 'private')),
  ]);
}

// GET /api/config
export async function GET(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const cacheKey = `app_config:${configId}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(JSON.parse(cached));

    let config = await prisma.appConfig.findUnique({
      where: { id: configId },
      include: {
        partners: true,
        coupons: { orderBy: { createdAt: 'asc' } },
        albums: { orderBy: { createdAt: 'desc' } },
        lands: { orderBy: { createdAt: 'desc' }, include: { items: true } },
      },
    });

    if (!config) {
      // Auto-create config for this circle/world
      config = await prisma.appConfig.create({
        data: {
          id: configId,
          partners: {
            create: [
              { partnerId: 'partner1', name: 'Her', avatar: '👩' },
              { partnerId: 'partner2', name: 'Him', avatar: '👨' },
            ],
          },
        },
        include: {
          partners: true,
          coupons: { orderBy: { createdAt: 'asc' } },
          albums: { orderBy: { createdAt: 'desc' } },
          lands: { orderBy: { createdAt: 'desc' }, include: { items: true } },
        },
      });
    }

    // Transform to frontend-expected format — return ALL partners dynamically
    const partnersRecord: Record<string, { name: string; avatar: string }> = {};
    for (const p of config.partners) {
      partnersRecord[p.partnerId] = { name: p.name, avatar: p.avatar };
    }
    // Ensure at least two default slots exist if none are stored
    if (Object.keys(partnersRecord).length === 0) {
      partnersRecord['partner1'] = { name: 'Her', avatar: '👩' };
      partnersRecord['partner2'] = { name: 'Him', avatar: '👨' };
    }

    const response = {
      appName: config.appName,
      anniversaryDate: config.anniversaryDate.toISOString(),
      treeStyle: config.treeStyle,
      galleryStyle: config.galleryStyle,
      gallerySource: config.gallerySource,
      instagramUsername: config.instagramUsername,
      daysPerTree: config.daysPerTree,
      daysPerFlower: config.daysPerFlower,
      flowerType: config.flowerType,
      mixedFlowers: config.mixedFlowers,
      skyMode: config.skyMode,
      petType: config.petType,
      pets: config.pets,
      timelineDefaultRows: config.timelineDefaultRows,
      timelineLayoutMode: config.timelineLayoutMode || 'vertical',
      timelineZoomLevel: config.timelineZoomLevel || 0,
      pwaName: process.env.PWA_NAME || 'Narinyland',
      pwaShortName: process.env.PWA_SHORT_NAME || 'Narinyland',
      pwaDescription: process.env.PWA_DESCRIPTION || 'Our Love Story',
      pwaThemeColor: process.env.PWA_THEME_COLOR || '#ec4899',
      pwaBackgroundColor: process.env.PWA_BG_COLOR || '#ffffff',
      pwaIconUrl: process.env.PWA_ICON_URL || null,
      musicPlaylist: config.musicPlaylist || [],
      showProposal: config.showProposal ?? true,
      proposal: {
        questions: config.proposalQuestions,
        isAccepted: config.isProposalAccepted,
        progress: config.proposalProgress,
      },
      partners: partnersRecord,
      coupons: config.coupons.map((c) => ({
        id: c.id,
        title: c.title,
        emoji: c.emoji,
        desc: c.desc,
        color: c.color,
        for: c.forPartner,
        isRedeemed: c.isRedeemed,
        redeemedAt: c.redeemedAt,
        points: c.points || 0,
      })),
      albums: config.albums || [],
      lands: config.lands || [],
      gallery: config.gallery || [],
    };

    // Cache config for 60s
    await redis.setex(cacheKey, 60, JSON.stringify(response));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
  }
}

// PUT /api/config
export async function PUT(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const cacheKey = `app_config:${configId}`;
    const body = (await request.json()) as ConfigUpdateBody;
    const {
      appName,
      anniversaryDate,
      treeStyle,
      galleryStyle,
      gallerySource,
      instagramUsername,
      daysPerTree,
      daysPerFlower,
      flowerType,
      mixedFlowers,
      skyMode,
      timelineDefaultRows,
      timelineLayoutMode,
      timelineZoomLevel,
      proposal,
      partners,
      isProposalAccepted,
      proposalProgress,
      graphicsQuality,
      showQRCode,
      showCouponsOnTimeline,
      timelineCardScale,
      showProposal,
    } = body;

    const updateData: Prisma.AppConfigUncheckedUpdateInput = {};
    if (appName !== undefined) updateData.appName = appName;
    if (anniversaryDate !== undefined) updateData.anniversaryDate = new Date(anniversaryDate);
    if (treeStyle !== undefined) updateData.treeStyle = treeStyle;
    if (galleryStyle !== undefined) updateData.galleryStyle = galleryStyle;
    if (gallerySource !== undefined) updateData.gallerySource = gallerySource;
    if (instagramUsername !== undefined) updateData.instagramUsername = instagramUsername;
    if (daysPerTree !== undefined) updateData.daysPerTree = daysPerTree;
    if (daysPerFlower !== undefined) updateData.daysPerFlower = daysPerFlower;
    if (flowerType !== undefined) updateData.flowerType = flowerType;
    if (mixedFlowers !== undefined) updateData.mixedFlowers = mixedFlowers;
    if (skyMode !== undefined) updateData.skyMode = skyMode;
    if (body.petType !== undefined) updateData.petType = body.petType;
    if (body.pets !== undefined) updateData.pets = body.pets;
    if (timelineDefaultRows !== undefined) updateData.timelineDefaultRows = timelineDefaultRows;
    if (timelineLayoutMode !== undefined) updateData.timelineLayoutMode = timelineLayoutMode;
    if (timelineZoomLevel !== undefined) updateData.timelineZoomLevel = timelineZoomLevel;
    
    if (graphicsQuality !== undefined) updateData.graphicsQuality = graphicsQuality;
    if (showQRCode !== undefined) updateData.showQRCode = showQRCode;
    if (showCouponsOnTimeline !== undefined) updateData.showCouponsOnTimeline = showCouponsOnTimeline;
    if (timelineCardScale !== undefined) updateData.timelineCardScale = timelineCardScale;
    
    if (showProposal !== undefined) updateData.showProposal = showProposal;
    
    if (body.musicPlaylist !== undefined) updateData.musicPlaylist = body.musicPlaylist;
    if (proposal) {
      if (proposal.questions !== undefined) updateData.proposalQuestions = proposal.questions;
      if (proposal.progress !== undefined) updateData.proposalProgress = proposal.progress;
    }
    if (isProposalAccepted !== undefined) updateData.isProposalAccepted = isProposalAccepted;
    if (proposalProgress !== undefined) updateData.proposalProgress = proposalProgress;

    const config = await prisma.appConfig.upsert({
      where: { id: configId },
      update: updateData,
      create: {
        id: configId,
        ...(updateData as Prisma.AppConfigUncheckedCreateInput),
      },
    });

    // Update partners if provided
    if (partners) {
      for (const [partnerId, data] of Object.entries(partners)) {
        await prisma.partner.upsert({
          where: {
            configId_partnerId: { configId, partnerId },
          },
          update: { name: data.name || partnerId, avatar: data.avatar || '' },
          create: {
            partnerId,
            name: data.name || partnerId,
            avatar: data.avatar || '',
            configId,
          },
        });
      }
    }

    // Sync Coupons if provided
    if (body.coupons && Array.isArray(body.coupons)) {
      const existingCoupons = await prisma.coupon.findMany({ where: { configId } });
      const incomingIds = new Set(body.coupons.map((c) => c.id));
      
      // Delete removed coupons
      const toDelete = existingCoupons.filter(c => !incomingIds.has(c.id));
      for (const c of toDelete) {
        await prisma.coupon.delete({ where: { id: c.id } });
      }

      // Upsert incoming
      for (const c of body.coupons) {
        // Check if ID is a valid one in DB, if not create new
        const exists = existingCoupons.find(ec => ec.id === c.id);
        if (exists) {
          await prisma.coupon.update({
            where: { id: c.id },
            data: {
              title: c.title,
              emoji: c.emoji || '🎁',
              desc: c.desc || '',
              color: c.color || 'from-pink-400 to-rose-400',
              forPartner: c.for || c.forPartner || 'partner1',
              points: c.points || 0,
              isRedeemed: c.isRedeemed ?? false,
              redeemedAt: c.isRedeemed ? (c.redeemedAt || new Date()) : null
            }
          });
        } else {
          await prisma.coupon.create({
            data: {
              id: c.id,
              title: c.title || 'Untitled Coupon',
              emoji: c.emoji || '🎁',
              desc: c.desc || '',
              color: c.color || 'from-pink-400 to-rose-400',
              forPartner: c.for || c.forPartner || 'partner1',
              points: c.points || 0,
              isRedeemed: c.isRedeemed ?? false,
              redeemedAt: c.isRedeemed ? (c.redeemedAt || new Date()) : null,
              configId,
            }
          });
        }
      }
    }

    // Sync Gallery (Memories) if provided
    if (body.gallery && Array.isArray(body.gallery)) {
      const existingMemories = await prisma.memory.findMany({ where: { configId } });
      const incomingUrls = new Set(body.gallery.map((m) => m.url));
      const albums = await prisma.album.findMany({
        where: { configId },
        select: { id: true },
      });
      const albumIds = new Set(albums.map((album) => album.id));

      // Delete removed memories
      const toDelete = existingMemories.filter(m => !incomingUrls.has(m.url));
      for (const m of toDelete) {
        if (m.s3Key) {
          try {
             await deleteFile(m.s3Key);
          } catch (e) { console.error("Storage delete failed", e); }
        }
        await prisma.memory.delete({ where: { id: m.id } });
      }

      // Upsert incoming
      for (let i = 0; i < body.gallery.length; i++) {
        const item = body.gallery[i];
        const exists = existingMemories.find(m => m.url === item.url);
        
        if (exists) {
           await prisma.memory.update({
             where: { id: exists.id },
             data: {
               privacy: item.privacy,
               sortOrder: i,
               caption: item.caption
             }
           });
        } else {
           await prisma.memory.create({
             data: {
               url: item.url,
               privacy: item.privacy,
               sortOrder: i,
               caption: item.caption,
               albumId: item.albumId && albumIds.has(item.albumId) ? item.albumId : null,
               configId
             }
           });
        }
      }
    }

    // Sync Timeline if provided
    if (body.timeline && Array.isArray(body.timeline)) {
      const existingEvents = await prisma.timelineEvent.findMany({ where: { configId } });
      const incomingIds = new Set(body.timeline.map((t) => t.id).filter((id) => !id.startsWith('temp-')));
      
      // Delete removed events (only those that are in DB)
      const toDelete = existingEvents.filter(e => !incomingIds.has(e.id));
      for (const e of toDelete) {
        await prisma.timelineEvent.delete({ where: { id: e.id } });
      }

      // Upsert incoming
      for (const t of body.timeline) {
        const timestamp = t.timestamp ? new Date(t.timestamp) : new Date();
        const exists = existingEvents.find(ee => ee.id === t.id);
        
        if (exists) {
          await prisma.timelineEvent.update({
            where: { id: t.id },
            data: {
              text: t.text || '',
              type: t.type || 'system',
              location: t.location,
              timestamp,
              mediaUrl: t.media?.url,
              mediaType: t.media?.type,
              mediaUrls: t.mediaItems?.map((m) => m.url || '') || [],
              mediaTypes: t.mediaItems?.map((m) => m.type || 'image') || [],
            }
          });
        } else if (!t.id.toString().startsWith('temp-')) {
          await prisma.timelineEvent.create({
            data: {
               id: t.id,
               text: t.text || '',
               type: t.type || 'system',
               location: t.location,
               timestamp,
               mediaUrl: t.media?.url,
               mediaType: t.media?.type,
               mediaUrls: t.mediaItems?.map((m) => m.url || '') || [],
               mediaTypes: t.mediaItems?.map((m) => m.type || 'image') || [],
               configId
            }
          });
        }
      }
    }

    await invalidateConfigCaches(configId, cacheKey);

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
  }
}
