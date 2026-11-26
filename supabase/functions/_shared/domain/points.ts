// TỰ SINH từ apps/mobile/src/domain/points.ts bằng scripts/sync-shared.mjs — đừng sửa tay.
// Tính điểm và hạng theo cấu hình (Q-05). Hàm thuần, không phụ thuộc UI hay mạng,
// để dùng lại y hệt trong Edge Function trên Supabase.
import type { LoyaltyRuleVersion, Tier } from './types.ts';

export interface OrderForPoints {
  subtotal: number; // trước giảm giá
  discount: number;
  at: string; // ISO
}

/** Chọn phiên bản cấu hình đang hiệu lực tại thời điểm `at`. */
export function ruleAt(versions: LoyaltyRuleVersion[], at: string): LoyaltyRuleVersion {
  const t = new Date(at).getTime();
  const valid = versions
    .filter((v) => new Date(v.effectiveFrom).getTime() <= t)
    .sort((a, b) => b.version - a.version);
  if (!valid[0]) throw new Error('Chưa có cấu hình điểm hiệu lực tại thời điểm này');
  return valid[0];
}

export function earnedPoints(order: OrderForPoints, tierId: string, rule: LoyaltyRuleVersion): number {
  const base = rule.earn.base === 'after_discount' ? order.subtotal - order.discount : order.subtotal;
  if (base <= 0 || rule.earn.amountPerPoint <= 0) return 0;
  // Ngày trong tuần theo giờ Việt Nam (UTC+7), không theo múi giờ của máy chạy code (server chạy UTC).
  const weekday = new Date(new Date(order.at).getTime() + 7 * 3_600_000).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const factor = (rule.tierMultipliers[tierId] ?? 1) * (rule.weekdayMultipliers[weekday] ?? 1);
  const raw = (base / rule.earn.amountPerPoint) * factor;
  return Math[rule.earn.rounding](raw);
}

export interface TierProgress {
  current: Tier;
  next: Tier | null;
  /** Điểm còn thiếu để lên hạng kế tiếp (0 nếu đã cao nhất). */
  remaining: number;
  /** 0..1 */
  ratio: number;
}

export function tierProgress(lifetimePoints: number, tiers: Tier[]): TierProgress {
  const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
  let idx = 0;
  sorted.forEach((t, i) => {
    if (lifetimePoints >= t.minPoints) idx = i;
  });
  const current = sorted[idx];
  const next = sorted[idx + 1] ?? null;
  if (!next) return { current, next: null, remaining: 0, ratio: 1 };
  const span = next.minPoints - current.minPoints;
  return {
    current,
    next,
    remaining: next.minPoints - lifetimePoints,
    ratio: span > 0 ? (lifetimePoints - current.minPoints) / span : 1,
  };
}
