import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deleteFile } from '@/lib/s3';

// GET /api/config
export async function GET() {
  try {
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
      timelineDefaultRows: config.timelineDefaultRows,
      musicUrl: config.musicUrl,
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
      musicUrl,
      proposal,
      partners,
      isProposalAccepted,
      proposalProgress,
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
    if (timelineDefaultRows !== undefined) updateData.timelineDefaultRows = timelineDefaultRows;
    if (musicUrl !== undefined) updateData.musicUrl = musicUrl;
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

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
  }
}
