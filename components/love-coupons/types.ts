export interface Coupon {
  id: string;
  title: string;
  emoji: string;
  desc: string;
  color: string;
  expiry?: string;
  for?: string;
  isRedeemed?: boolean;
  points?: number;
}

export interface Partners {
  partner1: { name: string; avatar: string };
  partner2: { name: string; avatar: string };
}

export type CouponDraft = {
  title: string;
  emoji: string;
  desc: string;
  color: string;
  forPartner: 'partner1' | 'partner2';
  points: number;
};

export interface LoveCouponsProps {
  coupons: Coupon[];
  partners?: Partners;
  onRedeem?: (id: string) => void; // Parent confirmation function
  onDelete?: (id: string) => void;
  onAdd?: (data: CouponDraft) => void;
}
