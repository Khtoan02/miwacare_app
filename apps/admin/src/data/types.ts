// Kiểu dữ liệu phía quản trị — bám theo bảng trong supabase/migrations/20261126000000_init.sql.
import type { LoyaltyRuleVersion, Tier } from '@domain/types';

export type { LoyaltyRuleVersion, Tier };

export type Role = 'viewer' | 'editor' | 'admin';

export interface Session {
  email: string;
  role: Role;
}

export interface AdminMember {
  id: string;
  fullName: string;
  phone: string;
  birthday: string | null; // YYYY-MM-DD
  createdAt: string;
  /** Đồng ý nhận tin khuyến mãi (consents.purpose = 'marketing'). */
  marketing: boolean;
}

/** Thành viên kèm số liệu tính từ sổ điểm (view v_member_balance). */
export interface MemberRow extends AdminMember {
  points: number;
  lifetimePoints: number;
  tier: Tier;
  orderCount: number;
  lastOrderAt: string | null;
}

export type OrderStatus = 'done' | 'shipping' | 'cancelled';
export type OrderSource = 'admin' | 'import' | 'pancake';

export interface AdminOrder {
  id: string;
  code: string;
  memberId: string | null;
  phone: string;
  status: OrderStatus;
  channel: string;
  items: string;
  subtotal: number;
  discount: number;
  orderedAt: string;
  source: OrderSource;
  createdAt: string;
}

export type LedgerReason = 'order' | 'redeem' | 'birthday' | 'signup' | 'program' | 'adjust' | 'expire';

export interface LedgerRow {
  id: string;
  memberId: string;
  delta: number;
  reason: LedgerReason;
  title: string;
  meta: string;
  orderId?: string;
  ruleVersion?: number;
  createdBy?: string;
  createdAt: string;
}

export type OfferKind = 'voucher' | 'redeem' | 'event';
export type OfferTone = 'sun' | 'sky' | 'leaf' | 'lemon';

export interface AdminOffer {
  id: string;
  kind: OfferKind;
  value: string;
  unit: string;
  tone: OfferTone;
  title: string;
  body: string;
  startsAt: string | null;
  endsAt: string | null;
  pointsCost: number | null;
  /** false = chỉ khách được cấp (qua chương trình) mới thấy. */
  public: boolean;
}

export interface ProgramCode {
  code: string;
  singleUse: boolean;
  usedCount: number;
}

export type ProgramStatus = 'draft' | 'active' | 'ended';

export interface Program {
  id: string;
  name: string;
  place: string;
  startsAt: string;
  endsAt: string;
  giftOfferId: string | null;
  maxClaims: number | null;
  status: ProgramStatus;
  codes: ProgramCode[];
  claims: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  at: string;
}
