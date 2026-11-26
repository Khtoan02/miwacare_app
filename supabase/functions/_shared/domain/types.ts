// TỰ SINH từ apps/mobile/src/domain/types.ts bằng scripts/sync-shared.mjs — đừng sửa tay.
// Kiểu dữ liệu nghiệp vụ dùng chung cho app (sau này chuyển sang packages/shared).

export type TierKey = 'tier1' | 'tier2' | 'tier3' | 'tier4';

export interface Tier {
  id: string;
  name: string;
  /** Điểm tích luỹ tối thiểu để đạt hạng (theo cấu hình). */
  minPoints: number;
  colorKey: TierKey;
}

/** Một phiên bản cấu hình chương trình thành viên (Q-05, docs/12). */
export interface LoyaltyRuleVersion {
  version: number;
  effectiveFrom: string; // ISO date
  earn: {
    /** Số tiền (đồng) cho 1 điểm. */
    amountPerPoint: number;
    base: 'after_discount' | 'before_discount';
    rounding: 'floor' | 'round' | 'ceil';
  };
  /** Nhân điểm theo hạng: { tierId: hệ số } */
  tierMultipliers: Record<string, number>;
  /** Nhân điểm theo ngày trong tuần (0 = CN … 6 = T7). */
  weekdayMultipliers: Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, number>>;
  birthdayBonus: number;
  signupBonus: number;
  /** 1 điểm = bao nhiêu đồng khi dùng điểm. */
  redeemValue: number;
  /** null = điểm không hết hạn. */
  expiryMonths: number | null;
  tiers: Tier[];
}

export interface Member {
  id: string;
  fullName: string;
  phone: string;
  points: number;
  /** Điểm tích luỹ dùng để xét hạng (có thể khác số dư nếu đã dùng điểm). */
  lifetimePoints: number;
  tierId: string;
  updatedAt: string;
}

export type LedgerReason = 'order' | 'redeem' | 'birthday' | 'signup' | 'program' | 'adjust';

export interface LedgerEntry {
  id: string;
  at: string;
  delta: number;
  reason: LedgerReason;
  title: string;
  meta: string;
  ruleVersion?: number;
}

export type OrderStatus = 'done' | 'shipping' | 'cancelled';

export interface Order {
  id: string;
  code: string;
  at: string;
  status: OrderStatus;
  items: string;
  channel: string;
  total: number;
  pointsEarned: number | null;
}

export type OfferKind = 'mine' | 'redeem' | 'event';
export type OfferTone = 'sun' | 'sky' | 'leaf' | 'lemon';

export interface Offer {
  id: string;
  kind: OfferKind;
  value: string;
  unit: string;
  tone: OfferTone;
  title: string;
  meta: string;
  tag: string;
  tagWarn: boolean;
  cta: string;
  primary: boolean;
}

export type ClaimFailure = 'invalid' | 'expired' | 'exhausted' | 'claimed' | 'rate_limited';

export type ClaimResult =
  | {
      ok: true;
      program: { name: string; when: string; where: string };
      gift: { value: string; title: string; note: string };
    }
  | { ok: false; reason: ClaimFailure };
