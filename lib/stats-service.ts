import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getErrorField } from '@/lib/errors';

type StatsClient = PrismaClient | Prisma.TransactionClient;

export const LEAF_COST = 100;

export class StatsServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'StatsServiceError';
  }
}

type StatsResponse = {
  xp: number;
  level: number;
  xpForNextLevel: number;
  totalXP: number;
  leaves: number;
  points: number;
  partnerPoints: {
    partner1: number;
    partner2: number;
  };
  success?: boolean;
  leveledUp?: boolean;
};

type SharedPointPartner = { id: string; points: number };
export type SharedPointDeduction = { id: string; amount: number };

function getStatsCacheKey(configId: string): string {
  return `app_stats:${configId}`;
}

export function calculateLevel(totalXP: number): {
  level: number;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
} {
  const level = Math.min(50, Math.floor(totalXP / 100) + 1);
  const xpInCurrentLevel = totalXP % 100;
  return { level, xpInCurrentLevel, xpForNextLevel: 100 };
}

export function allocateSharedPointSpend(partners: SharedPointPartner[], amount: number): SharedPointDeduction[] {
  if (!Number.isFinite(amount) || amount < 0) throw new StatsServiceError('invalid_amount', 400, 'Invalid point amount');
  const ordered = [...partners].sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));
  const total = ordered.reduce((sum, partner) => sum + Math.max(0, partner.points), 0);
  if (total < amount) throw new StatsServiceError('not_enough_points', 400, 'Not enough points (combined)');

  let remaining = amount;
  const deductions: SharedPointDeduction[] = [];
  for (const partner of ordered) {
    if (remaining <= 0) break;
    const spendable = Math.max(0, partner.points);
    const deduction = Math.min(spendable, remaining);
    if (deduction > 0) deductions.push({ id: partner.id, amount: deduction });
    remaining -= deduction;
  }
  return deductions;
}

export async function spendSharedPoints(client: StatsClient, configId: string, amount: number): Promise<SharedPointDeduction[]> {
  const partners = await client.partner.findMany({
    where: { configId },
    orderBy: [{ points: 'desc' }, { id: 'asc' }],
    select: { id: true, points: true },
  });
  const deductions = allocateSharedPointSpend(partners, amount);
  for (const deduction of deductions) {
    await client.partner.update({
      where: { id: deduction.id },
      data: { points: { decrement: deduction.amount } },
    });
  }
  await invalidateStatsCache(configId);
  return deductions;
}

async function getPartnerTotals(client: StatsClient, configId: string) {
  const partners = await client.partner.findMany({
    where: { configId },
    select: { partnerId: true, points: true, lifetimePoints: true },
  });

  return {
    totalXP: partners.reduce((sum, partner) => sum + (partner.lifetimePoints || 0), 0),
    spendablePoints: partners.reduce((sum, partner) => sum + (partner.points || 0), 0),
    partnerPoints: {
      partner1: partners.find((partner) => partner.partnerId === 'partner1')?.points || 0,
      partner2: partners.find((partner) => partner.partnerId === 'partner2')?.points || 0,
    },
  };
}

async function getOrCreateStats(client: StatsClient, configId: string) {
  return client.loveStats.upsert({
    where: { id: configId },
    update: {},
    create: { id: configId },
  });
}

async function buildStatsResponse(
  client: StatsClient,
  configId: string,
  options: { sync?: boolean } = {}
): Promise<StatsResponse> {
  const stats = await getOrCreateStats(client, configId);
  const totals = await getPartnerTotals(client, configId);
  const { level, xpInCurrentLevel, xpForNextLevel } = calculateLevel(totals.totalXP);

  const syncedStats =
    options.sync && (stats.level !== level || stats.xp !== xpInCurrentLevel)
      ? await client.loveStats.update({
          where: { id: configId },
          data: { level, xp: xpInCurrentLevel },
        })
      : stats;

  return {
    xp: xpInCurrentLevel,
    level,
    xpForNextLevel,
    totalXP: totals.totalXP,
    leaves: syncedStats.leaves,
    points: totals.spendablePoints,
    partnerPoints: totals.partnerPoints,
  };
}

async function invalidateStatsCache(configId: string): Promise<void> {
  await redis.del(getStatsCacheKey(configId));
}

async function runStatsTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  retries = 2
): Promise<T> {
  try {
    return await prisma.$transaction(callback, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    if (retries > 0 && getErrorField(error, 'code') === 'P2034') {
      return runStatsTransaction(callback, retries - 1);
    }
    throw error;
  }
}

export async function getStats(configId: string): Promise<StatsResponse> {
  const cacheKey = getStatsCacheKey(configId);
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as StatsResponse;

  const response = await buildStatsResponse(prisma, configId, { sync: true });
  await redis.setex(cacheKey, 60, JSON.stringify(response));
  return response;
}

export async function addXP(configId: string, amount: number, partnerId = 'partner1') {
  const response = await runStatsTransaction(async (tx) => {
    const previousStats = await getOrCreateStats(tx, configId);

    await tx.partner.updateMany({
      where: { configId, partnerId },
      data: {
        points: { increment: amount },
        lifetimePoints: { increment: amount },
      },
    });

    const summary = await buildStatsResponse(tx, configId, { sync: true });
    return {
      ...summary,
      leveledUp: summary.level > previousStats.level,
    };
  });

  await invalidateStatsCache(configId);
  return response;
}

export async function addPoints(configId: string, amount: number) {
  const response = await runStatsTransaction(async (tx) => {
    await tx.partner.updateMany({
      where: { configId, partnerId: 'partner1' },
      data: {
        points: { increment: amount },
        lifetimePoints: { increment: amount },
      },
    });

    return buildStatsResponse(tx, configId, { sync: true });
  });

  await invalidateStatsCache(configId);
  return response;
}

export async function buyLeaf(configId: string) {
  const response = await runStatsTransaction(async (tx) => {
    const previousStats = await getOrCreateStats(tx, configId);
    const totals = await getPartnerTotals(tx, configId);

    if (totals.spendablePoints < LEAF_COST) {
      throw new StatsServiceError('not_enough_points', 400, 'Not enough points (combined)');
    }

    const partners = await tx.partner.findMany({
      where: { configId },
      orderBy: { points: 'desc' },
      select: { id: true, points: true },
    });

    let remainingCost = LEAF_COST;
    for (const partner of partners) {
      if (remainingCost <= 0) break;
      const deduct = Math.min(partner.points, remainingCost);
      if (deduct <= 0) continue;

      await tx.partner.update({
        where: { id: partner.id },
        data: {
          points: { decrement: deduct },
          lifetimePoints: { increment: deduct },
        },
      });
      remainingCost -= deduct;
    }

    const afterPurchase = await buildStatsResponse(tx, configId);
    const updatedStats = await tx.loveStats.update({
      where: { id: configId },
      data: {
        leaves: { increment: 1 },
        xp: afterPurchase.xp,
        level: afterPurchase.level,
      },
    });

    return {
      ...afterPurchase,
      success: true,
      leaves: updatedStats.leaves,
      leveledUp: afterPurchase.level > previousStats.level,
    };
  });

  await invalidateStatsCache(configId);
  return response;
}
