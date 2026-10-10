import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import prisma from '@/lib/prisma';
import { buildCoupleQuestView, coupleDayKey, dailyCoupleQuests } from '@/lib/couple-world/quests';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };

type Member = { id: string; userId: string | null; name: string };

async function circleMembers(configId: string) {
  const rows = await prisma.partner.findMany({
    where: { configId },
    select: { id: true, userId: true, name: true },
    orderBy: { id: 'asc' },
  });
  // Older worlds can have duplicate Partner records for the same AppKit user.
  // They must never count as two people to unlock a private answer.
  const seen = new Set<string>();
  return rows.filter((member) => {
    const identity = member.userId || member.id;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function findMe(members: Member[], userId: string, authSource?: string) {
  return members.find((member) =>
    member.userId === userId || (authSource === 'name-login' && member.id === userId));
}

async function state(configId: string, userId: string, authSource?: string) {
  if (configId === 'default') {
    return NextResponse.json({ error: 'Create or select a private world for your couple first.' }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const members = await circleMembers(configId);
  const me = findMe(members, userId, authSource);
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: PRIVATE_HEADERS });
  if (members.length > 2) {
    return NextResponse.json({ error: 'Couple adventures are private to two members. Create a separate world for your couple.' }, { status: 409, headers: PRIVATE_HEADERS });
  }

  const [config, entries] = await Promise.all([
    prisma.appConfig.findUnique({ where: { id: configId }, select: { appName: true } }),
    prisma.coupleQuestEntry.findMany({
      where: { configId },
      select: { dayKey: true, questKey: true, partnerId: true, answer: true },
    }),
  ]);
  if (!config) return NextResponse.json({ error: 'World not found' }, { status: 404, headers: PRIVATE_HEADERS });

  return NextResponse.json({
    worldName: config.appName,
    ...buildCoupleQuestView(configId, coupleDayKey(new Date()), members, me.id, entries),
  }, { headers: PRIVATE_HEADERS });
}

export async function GET(request: Request) {
  const access = await requireConfigAccess(request);
  if (isConfigAccessDenied(access)) return access.response;
  try {
    return await state(access.configId, access.userId, access.authSource);
  } catch (error) {
    console.error('Couple adventure loading failed', error);
    return NextResponse.json({ error: 'Unable to load your private adventure.' }, { status: 500, headers: PRIVATE_HEADERS });
  }
}

export async function POST(request: Request) {
  const access = await requireConfigAccess(request);
  if (isConfigAccessDenied(access)) return access.response;
  if (access.configId === 'default') {
    return NextResponse.json({ error: 'Select a private couple world first.' }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const body = await request.json().catch(() => null) as { questKey?: unknown; answer?: unknown } | null;
  const dayKey = coupleDayKey(new Date());
  const questKey = typeof body?.questKey === 'string' ? body.questKey : '';
  const answer = typeof body?.answer === 'string' ? body.answer.trim() : '';
  if (!dailyCoupleQuests(access.configId, dayKey).some((quest) => quest.key === questKey) ||
      answer.length < 2 || answer.length > 240) {
    return NextResponse.json({ error: 'Choose today’s quest and write an answer of 2–240 characters.' }, { status: 400, headers: PRIVATE_HEADERS });
  }

  try {
    const members = await circleMembers(access.configId);
    const me = findMe(members, access.userId, access.authSource);
    if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: PRIVATE_HEADERS });
    if (members.length > 2) {
      return NextResponse.json({ error: 'This adventure requires a private world with no more than two members.' }, { status: 409, headers: PRIVATE_HEADERS });
    }
    await prisma.coupleQuestEntry.create({
      data: { configId: access.configId, partnerId: me.id, dayKey, questKey, answer },
    });
    return await state(access.configId, access.userId, access.authSource);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Your answer is already saved for this quest.' }, { status: 409, headers: PRIVATE_HEADERS });
    }
    console.error('Couple adventure submission failed', error);
    return NextResponse.json({ error: 'Could not save your answer. Please try again.' }, { status: 500, headers: PRIVATE_HEADERS });
  }
}
