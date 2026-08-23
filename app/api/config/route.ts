import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { ensureActiveLand, isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

type PartnerInput = { name?: string; avatar?: string };

type ConfigUpdateBody = {
  appName?: unknown;
  anniversaryDate?: unknown;
  treeStyle?: unknown;
  galleryStyle?: unknown;
  gallerySource?: unknown;
  instagramUsername?: unknown;
  daysPerTree?: unknown;
  daysPerFlower?: unknown;
  flowerType?: unknown;
  mixedFlowers?: unknown;
  skyMode?: unknown;
  petType?: unknown;
  pets?: unknown;
  timelineDefaultRows?: unknown;
  timelineLayoutMode?: unknown;
  timelineZoomLevel?: unknown;
  timelineThumbnailHeight?: unknown;
  musicPlaylist?: unknown;
  proposal?: { questions?: unknown; progress?: unknown };
  partners?: Record<string, PartnerInput>;
  isProposalAccepted?: unknown;
  proposalProgress?: unknown;
  graphicsQuality?: unknown;
  showQRCode?: unknown;
  showCouponsOnTimeline?: unknown;
  timelineCardScale?: unknown;
  showProposal?: unknown;
};

const configInclude = {
  partners: true,
  coupons: { orderBy: { createdAt: 'asc' } },
  albums: { orderBy: { createdAt: 'desc' } },
  lands: { orderBy: { createdAt: 'desc' }, include: { items: true } },
} satisfies Prisma.AppConfigInclude;

function boundedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim().slice(0, maxLength);
}

function boundedNumber(value: unknown, min: number, max: number, integer = false): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const normalized = Math.min(max, Math.max(min, value));
  return integer ? Math.round(normalized) : normalized;
}

function boundedStringList(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

async function invalidateConfigCaches(configId: string) {
  await Promise.all([
    redis.del(`app_config:${configId}`),
    redis.del(`app_stats:${configId}`),
  ]);
}

export async function GET(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const cacheKey = `app_config:${configId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const cachedLands = Array.isArray(parsed?.lands) ? parsed.lands : [];
      if (cachedLands.length > 0 && cachedLands.some((land: { isActive?: boolean }) => land.isActive)) {
        return NextResponse.json(parsed);
      }
      await redis.del(cacheKey);
    }

    let config = await prisma.appConfig.findUnique({ where: { id: configId }, include: configInclude });
    if (!config) {
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
        include: configInclude,
      });
    }

    if (await ensureActiveLand(configId)) {
      config = await prisma.appConfig.findUnique({ where: { id: configId }, include: configInclude });
    }
    if (!config) return NextResponse.json({ error: 'Failed to load configuration' }, { status: 500 });

    const partnersRecord: Record<string, { name: string; avatar: string }> = {};
    for (const partner of config.partners) {
      partnersRecord[partner.partnerId] = { name: partner.name, avatar: partner.avatar };
    }
    if (Object.keys(partnersRecord).length === 0) {
      partnersRecord.partner1 = { name: 'Her', avatar: '👩' };
      partnersRecord.partner2 = { name: 'Him', avatar: '👨' };
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
      timelineThumbnailHeight: config.timelineThumbnailHeight,
      graphicsQuality: config.graphicsQuality,
      showQRCode: config.showQRCode,
      showCouponsOnTimeline: config.showCouponsOnTimeline,
      timelineCardScale: config.timelineCardScale,
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
      coupons: config.coupons.map((coupon) => ({
        id: coupon.id,
        title: coupon.title,
        emoji: coupon.emoji,
        desc: coupon.desc,
        color: coupon.color,
        for: coupon.forPartner,
        isRedeemed: coupon.isRedeemed,
        redeemedAt: coupon.redeemedAt,
        points: coupon.points || 0,
      })),
      albums: config.albums || [],
      lands: config.lands || [],
      gallery: config.gallery || [],
    };

    await redis.setex(cacheKey, 60, JSON.stringify(response));
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching config:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
  }
}

/**
 * PUT /api/config updates configuration only. Entity collections such as
 * coupons, memories/gallery, and timeline events have dedicated APIs and are
 * intentionally ignored here to prevent stale-client bulk overwrite/replay.
 */
export async function PUT(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const body = (await request.json().catch(() => ({}))) as ConfigUpdateBody;
    const updateData: Prisma.AppConfigUncheckedUpdateInput = {};

    const appName = boundedString(body.appName, 80);
    if (appName !== undefined && appName) updateData.appName = appName;

    if (typeof body.anniversaryDate === 'string' || body.anniversaryDate instanceof Date) {
      const anniversary = new Date(body.anniversaryDate);
      if (!Number.isNaN(anniversary.getTime())) updateData.anniversaryDate = anniversary;
    }

    const scalarStrings: Array<[keyof ConfigUpdateBody, keyof Prisma.AppConfigUncheckedUpdateInput, number]> = [
      ['treeStyle', 'treeStyle', 64],
      ['galleryStyle', 'galleryStyle', 64],
      ['gallerySource', 'gallerySource', 64],
      ['instagramUsername', 'instagramUsername', 80],
      ['flowerType', 'flowerType', 64],
      ['skyMode', 'skyMode', 64],
      ['petType', 'petType', 64],
      ['timelineLayoutMode', 'timelineLayoutMode', 32],
      ['graphicsQuality', 'graphicsQuality', 32],
    ];
    for (const [inputKey, dataKey, maxLength] of scalarStrings) {
      const value = boundedString(body[inputKey], maxLength);
      if (value !== undefined) (updateData as Record<string, unknown>)[dataKey as string] = value;
    }

    const daysPerTree = boundedNumber(body.daysPerTree, 1, 3650, true);
    if (daysPerTree !== undefined) updateData.daysPerTree = daysPerTree;
    const daysPerFlower = boundedNumber(body.daysPerFlower, 1, 3650, true);
    if (daysPerFlower !== undefined) updateData.daysPerFlower = daysPerFlower;
    const timelineDefaultRows = boundedNumber(body.timelineDefaultRows, 1, 50, true);
    if (timelineDefaultRows !== undefined) updateData.timelineDefaultRows = timelineDefaultRows;
    const timelineZoomLevel = boundedNumber(body.timelineZoomLevel, -10, 10, true);
    if (timelineZoomLevel !== undefined) updateData.timelineZoomLevel = timelineZoomLevel;
    const timelineThumbnailHeight = boundedNumber(body.timelineThumbnailHeight, 40, 600, true);
    if (timelineThumbnailHeight !== undefined) updateData.timelineThumbnailHeight = timelineThumbnailHeight;
    const timelineCardScale = boundedNumber(body.timelineCardScale, 0.5, 2.5);
    if (timelineCardScale !== undefined) updateData.timelineCardScale = timelineCardScale;

    if (typeof body.showQRCode === 'boolean') updateData.showQRCode = body.showQRCode;
    if (typeof body.showCouponsOnTimeline === 'boolean') updateData.showCouponsOnTimeline = body.showCouponsOnTimeline;
    if (typeof body.showProposal === 'boolean') updateData.showProposal = body.showProposal;
    if (typeof body.isProposalAccepted === 'boolean') updateData.isProposalAccepted = body.isProposalAccepted;

    const mixedFlowers = boundedStringList(body.mixedFlowers, 12, 40);
    if (mixedFlowers !== undefined) updateData.mixedFlowers = mixedFlowers;
    const musicPlaylist = boundedStringList(body.musicPlaylist, 50, 500);
    if (musicPlaylist !== undefined) updateData.musicPlaylist = musicPlaylist;

    if (body.pets !== undefined && body.pets !== null && typeof body.pets === 'object') {
      updateData.pets = body.pets as Prisma.InputJsonValue;
    }

    if (body.proposal && typeof body.proposal === 'object') {
      const questions = boundedStringList(body.proposal.questions, 20, 300);
      if (questions !== undefined) updateData.proposalQuestions = questions;
      const progress = boundedNumber(body.proposal.progress, 0, 100, true);
      if (progress !== undefined) updateData.proposalProgress = progress;
    }
    const proposalProgress = boundedNumber(body.proposalProgress, 0, 100, true);
    if (proposalProgress !== undefined) updateData.proposalProgress = proposalProgress;

    const config = await prisma.appConfig.upsert({
      where: { id: configId },
      update: updateData,
      create: { id: configId, ...(updateData as Prisma.AppConfigUncheckedCreateInput) },
    });

    // Presentation edits may update existing partner slots only. Membership is
    // provisioned exclusively by authenticated circle creation/join/sync flows.
    if (body.partners && typeof body.partners === 'object') {
      for (const [partnerId, data] of Object.entries(body.partners).slice(0, 20)) {
        if (!partnerId || partnerId.length > 128 || !data || typeof data !== 'object') continue;
        const existing = await prisma.partner.findUnique({
          where: { configId_partnerId: { configId, partnerId } },
          select: { id: true },
        });
        if (!existing) continue;

        const name = boundedString(data.name, 80);
        const avatar = boundedString(data.avatar, 240);
        await prisma.partner.update({
          where: { id: existing.id },
          data: {
            ...(name !== undefined && name ? { name } : {}),
            ...(avatar !== undefined ? { avatar } : {}),
          },
        });
      }
    }

    await invalidateConfigCaches(configId);
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating config:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
  }
}
