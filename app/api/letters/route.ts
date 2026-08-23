import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deleteFile, uploadLetterMedia } from '@/lib/storage';
import { redis, redisSetNxPx } from '@/lib/redis';
import { validateUploadFile } from '@/lib/upload-validation';
import { isConfigAccessDenied, requireConfigAccess, type ConfigAccess } from '@/lib/config-access';

const LETTER_REWARD_POINTS = 20;
const LETTER_REWARD_COOLDOWN_SECONDS = 60 * 60;

function rewardKey(configId: string, userId: string) {
  return `letter_reward:${configId}:${userId}`;
}

function normalizeMediaType(value: unknown): 'image' | 'video' | 'audio' {
  return value === 'video' || value === 'audio' ? value : 'image';
}

function normalizeLocalMediaUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/api/serve-image?')) return null;
  try {
    const parsed = new URL(value, 'https://narinyland.invalid');
    return parsed.pathname === '/api/serve-image' && parsed.searchParams.get('key') ? value : null;
  } catch {
    return null;
  }
}

async function getAuthenticatedPartner(access: Exclude<ConfigAccess, { response: NextResponse }>) {
  return prisma.partner.findFirst({
    where: {
      configId: access.configId,
      OR: access.authSource === 'name-login'
        ? [{ id: access.userId }, { userId: access.userId }]
        : [{ userId: access.userId }],
    },
    select: { id: true, partnerId: true },
  });
}

export async function GET(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const currentPartner = await getAuthenticatedPartner(access);
    if (!currentPartner) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const letters = await prisma.loveLetter.findMany({
      where: { from: { configId: access.configId } },
      include: { from: true },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    return NextResponse.json(letters.map((letter) => {
      const isSender = letter.fromId === currentPartner.id;
      const isLocked = letter.unlockDate.getTime() > now && !isSender;
      return {
        id: letter.id,
        fromId: letter.from.partnerId,
        content: isLocked ? '' : letter.content,
        timestamp: letter.createdAt.toISOString(),
        unlockDate: letter.unlockDate.toISOString(),
        isRead: isLocked ? false : letter.isRead,
        readAt: isLocked ? undefined : letter.readAt?.toISOString(),
        locked: isLocked,
        media: !isLocked && letter.mediaType && letter.mediaUrl
          ? { type: letter.mediaType, url: letter.mediaUrl }
          : undefined,
      };
    }));
  } catch (error) {
    console.error('Error fetching letters:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Failed to fetch letters' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let uploadedKey: string | null = null;
  let rewardClaimed = false;
  let claimedRewardKey = '';

  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const sender = await getAuthenticatedPartner(access);
    if (!sender) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const contentType = request.headers.get('content-type') || '';
    let content = '';
    let unlockDate = '';
    let file: File | null = null;
    let mediaUrl: string | null = null;
    let mediaType: 'image' | 'video' | 'audio' = 'image';

    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null) as Record<string, unknown> | null;
      content = typeof body?.content === 'string' ? body.content.trim() : '';
      unlockDate = typeof body?.unlockDate === 'string' ? body.unlockDate : '';
      mediaUrl = normalizeLocalMediaUrl(body?.mediaUrl);
      mediaType = normalizeMediaType(body?.mediaType);
    } else {
      const formData = await request.formData();
      content = String(formData.get('content') || '').trim();
      unlockDate = String(formData.get('unlockDate') || '');
      const media = formData.get('media');
      file = media instanceof File ? media : null;
      mediaUrl = normalizeLocalMediaUrl(formData.get('mediaUrl'));
      mediaType = normalizeMediaType(formData.get('mediaType'));
    }

    if (!content || content.length > 10_000) {
      return NextResponse.json({ error: 'Letter content is required' }, { status: 400 });
    }

    const parsedUnlockDate = new Date(unlockDate || Date.now());
    if (Number.isNaN(parsedUnlockDate.getTime())) {
      return NextResponse.json({ error: 'Invalid unlock date' }, { status: 400 });
    }

    if (file) {
      const validationError = validateUploadFile(file);
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadLetterMedia(buffer, file.name, file.type, access.configId);
      mediaUrl = result.url;
      uploadedKey = result.key;
      if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';
      else mediaType = 'image';
    }

    claimedRewardKey = rewardKey(access.configId, access.userId);
    rewardClaimed = await redisSetNxPx(
      claimedRewardKey,
      '1',
      LETTER_REWARD_COOLDOWN_SECONDS * 1000,
    );

    const letter = await prisma.$transaction(async (tx) => {
      const created = await tx.loveLetter.create({
        data: {
          content,
          fromId: sender.id,
          unlockDate: parsedUnlockDate,
          mediaType: mediaUrl ? mediaType : null,
          mediaUrl,
          mediaS3Key: uploadedKey,
        },
        include: { from: true },
      });

      if (rewardClaimed) {
        await tx.partner.update({
          where: { id: sender.id },
          data: {
            points: { increment: LETTER_REWARD_POINTS },
            lifetimePoints: { increment: LETTER_REWARD_POINTS },
          },
        });
      }
      return created;
    });

    await redis.del(`app_stats:${access.configId}`).catch(() => {});
    return NextResponse.json({
      id: letter.id,
      fromId: letter.from.partnerId,
      content: letter.content,
      timestamp: letter.createdAt.toISOString(),
      unlockDate: letter.unlockDate.toISOString(),
      isRead: letter.isRead,
      locked: false,
      rewardGranted: rewardClaimed,
      media: letter.mediaType && letter.mediaUrl ? { type: letter.mediaType, url: letter.mediaUrl } : undefined,
    }, { status: 201 });
  } catch (error) {
    if (rewardClaimed && claimedRewardKey) await redis.del(claimedRewardKey).catch(() => {});
    if (uploadedKey) await deleteFile(uploadedKey).catch(() => {});
    console.error('Error creating letter:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Failed to create letter' }, { status: 500 });
  }
}
