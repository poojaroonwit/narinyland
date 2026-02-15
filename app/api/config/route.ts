import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deleteFile } from '@/lib/s3';

import { redis } from '@/lib/redis';

// GET /api/config
export async function GET() {
  try {
    // Check cache
    const cached = await redis.get('app_config');
    if (cached) return NextResponse.json(JSON.parse(cached));

    let config = await prisma.appConfig.findUnique({
      where: { id: 'default' },
      include: {
        partners: true,
        coupons: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!config) {
      // Auto-create default config
      config = await prisma.appConfig.create({
        data: {
          id: 'default',
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
        },
      });
    }

    // Transform to frontend-expected format
    const partner1 = config.partners.find((p: any) => p.partnerId === 'partner1');
    const partner2 = config.partners.find((p: any) => p.partnerId === 'partner2');

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
      timelineDefaultRows: (config as any).timelineDefaultRows,
      timelineLayoutMode: (config as any).timelineLayoutMode || 'vertical',
      timelineZoomLevel: (config as any).timelineZoomLevel || 0,
      pwaName: (config as any).pwaName || 'Narinyland',
      pwaShortName: (config as any).pwaShortName || 'Narinyland',
      pwaDescription: (config as any).pwaDescription || 'Our Love Story',
      pwaThemeColor: (config as any).pwaThemeColor || '#ec4899',
      pwaBackgroundColor: (config as any).pwaBackgroundColor || '#ffffff',
      pwaIconUrl: (config as any).pwaIconUrl || null,
      musicPlaylist: (config as any).musicPlaylist || [],
      proposal: {
        questions: config.proposalQuestions,
        isAccepted: config.isProposalAccepted,
        progress: config.proposalProgress,
      },
      partners: {
        partner1: { name: partner1?.name || 'Her', avatar: partner1?.avatar || '👩' },
        partner2: { name: partner2?.name || 'Him', avatar: partner2?.avatar || '👨' },
      },
      coupons: config.coupons.map((c: any) => ({
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
    };

    // Cache config for 60s
    await redis.setex('app_config', 60, JSON.stringify(response));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
  }
}

// PUT /api/config
export async function PUT(request: Request) {
  try {
    const body = await request.json();
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
      musicUrl,
      proposal,
      partners,
      isProposalAccepted,
      proposalProgress,
      graphicsQuality,
      showQRCode,
      showCouponsOnTimeline,
      timelineCardScale,
    } = body;

    const updateData: any = {};
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
    // @ts-ignore: Prisma client outdated
    if (timelineLayoutMode !== undefined) updateData.timelineLayoutMode = timelineLayoutMode;
    // @ts-ignore: Prisma client outdated
    if (timelineZoomLevel !== undefined) updateData.timelineZoomLevel = timelineZoomLevel;
    
    // PWA Update
    if (body.pwaName !== undefined) updateData.pwaName = body.pwaName;
    if (body.pwaShortName !== undefined) updateData.pwaShortName = body.pwaShortName;
    if (body.pwaDescription !== undefined) updateData.pwaDescription = body.pwaDescription;
    if (body.pwaThemeColor !== undefined) updateData.pwaThemeColor = body.pwaThemeColor;
    if (body.pwaBackgroundColor !== undefined) updateData.pwaBackgroundColor = body.pwaBackgroundColor;
    if (body.pwaIconUrl !== undefined) updateData.pwaIconUrl = body.pwaIconUrl;
    
    if (graphicsQuality !== undefined) updateData.graphicsQuality = graphicsQuality;
    if (showQRCode !== undefined) updateData.showQRCode = showQRCode;
    if (showCouponsOnTimeline !== undefined) updateData.showCouponsOnTimeline = showCouponsOnTimeline;
    if (timelineCardScale !== undefined) updateData.timelineCardScale = timelineCardScale;
    
    if (body.musicPlaylist !== undefined) updateData.musicPlaylist = body.musicPlaylist;
    if (proposal) {
      if (proposal.questions !== undefined) updateData.proposalQuestions = proposal.questions;
      if (proposal.progress !== undefined) updateData.proposalProgress = proposal.progress;
    }
    if (isProposalAccepted !== undefined) updateData.isProposalAccepted = isProposalAccepted;
    if (proposalProgress !== undefined) updateData.proposalProgress = proposalProgress;

    const config = await prisma.appConfig.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData,
      },
    });

    // Update partners if provided
    if (partners) {
      for (const [partnerId, data] of Object.entries(partners) as [string, any][]) {
        await prisma.partner.upsert({
          where: {
            configId_partnerId: { configId: 'default', partnerId },
          },
          update: { name: data.name, avatar: data.avatar },
          create: {
            partnerId,
            name: data.name,
            avatar: data.avatar,
            configId: 'default',
          },
        });
      }
    }

    // Sync Coupons if provided
    if (body.coupons && Array.isArray(body.coupons)) {
      const existingCoupons = await prisma.coupon.findMany({ where: { configId: 'default' } });
      const incomingIds = new Set(body.coupons.map((c: any) => c.id));
      
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
              emoji: c.emoji,
              desc: c.desc,
              color: c.color,
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
              title: c.title,
              emoji: c.emoji,
              desc: c.desc,
              color: c.color,
              forPartner: c.for || c.forPartner || 'partner1',
              points: c.points || 0,
              isRedeemed: c.isRedeemed ?? false,
              redeemedAt: c.isRedeemed ? (c.redeemedAt || new Date()) : null,
              configId: 'default',
            }
          });
        }
      }
    }

    // Sync Gallery (Memories) if provided
    if (body.gallery && Array.isArray(body.gallery)) {
      const existingMemories = await prisma.memory.findMany({});
      const incomingUrls = new Set(body.gallery.map((m: any) => m.url));

      // Delete removed memories
      const toDelete = existingMemories.filter(m => !incomingUrls.has(m.url));
      for (const m of toDelete) {
        if (m.s3Key) {
          try {
             await deleteFile(m.s3Key);
          } catch(e) { console.error("S3 delete failed", e); }
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
               caption: item.caption
             }
           });
        }
      }
    }

    // Sync Timeline if provided
    if (body.timeline && Array.isArray(body.timeline)) {
      const existingEvents = await prisma.timelineEvent.findMany({ where: { configId: 'default' } });
      const incomingIds = new Set(body.timeline.map((t: any) => t.id).filter((id: string) => !id.startsWith('temp-')));
      
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
              text: t.text,
              type: t.type,
              location: t.location,
              timestamp,
              mediaUrl: t.media?.url,
              mediaType: t.media?.type,
              mediaUrls: t.mediaItems?.map((m: any) => m.url) || [],
              mediaTypes: t.mediaItems?.map((m: any) => m.type) || [],
            }
          });
        } else if (!t.id.toString().startsWith('temp-')) {
          await prisma.timelineEvent.create({
            data: {
               id: t.id,
               text: t.text,
               type: t.type,
               location: t.location,
               timestamp,
               mediaUrl: t.media?.url,
               mediaType: t.media?.type,
               mediaUrls: t.mediaItems?.map((m: any) => m.url) || [],
               mediaTypes: t.mediaItems?.map((m: any) => m.type) || [],
               configId: 'default'
            }
          });
        }
      }
    }

    // Invalidate cache
    await redis.del('app_config');

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
  }
}
