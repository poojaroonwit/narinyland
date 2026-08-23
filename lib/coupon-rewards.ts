export const MAX_COUPON_REWARD_POINTS = 100;

export function normalizeCouponRewardPoints(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) return null;
  if (value < 0 || value > MAX_COUPON_REWARD_POINTS) return null;
  return value;
}

export function normalizeCouponPartner(value: unknown): 'partner1' | 'partner2' | null {
  return value === 'partner1' || value === 'partner2' ? value : null;
}
