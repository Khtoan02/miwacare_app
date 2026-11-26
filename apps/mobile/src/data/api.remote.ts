// Lớp dữ liệu nối Supabase. Cùng chữ ký với bản mẫu trong api.ts.
// Đọc: truy vấn thẳng (RLS chỉ trả dòng của chính khách). Ghi: qua Edge Function `member`.
import { Platform } from 'react-native';

import { ruleAt, tierProgress } from '@/domain/points';
import type { ClaimResult, LedgerEntry, LedgerReason, LoyaltyRuleVersion, Member, Offer, Order, OrderStatus } from '@/domain/types';
import { t } from '@/i18n/vi';
import { formatDayMonth, formatNumber } from '@/lib/format';
import { supabase, toE164 } from '@/lib/supabase';

type Row = Record<string, unknown>;

function client() {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return supabase;
}

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

async function uid() {
  const { data } = await client().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('not_signed_in');
  return id;
}

/** Gọi Edge Function `member`; lỗi máy chủ trả về dạng { error }. */
async function call<T>(action: string, payload: Row = {}): Promise<T> {
  const { data, error } = await client().functions.invoke('member', { body: { action, payload } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const body = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null;
    throw new Error(body?.error ?? error.message);
  }
  return data as T;
}

let rulesCache: { at: number; rows: LoyaltyRuleVersion[] } | null = null;
async function getRules(): Promise<LoyaltyRuleVersion[]> {
  if (rulesCache && Date.now() - rulesCache.at < 60_000) return rulesCache.rows;
  const rows = must(await client().from('loyalty_rule_versions').select('version, effective_from, config').order('version')) ?? [];
  const out = rows.map((r: Row) => ({ ...(r.config as Omit<LoyaltyRuleVersion, 'version' | 'effectiveFrom'>), version: r.version as number, effectiveFrom: r.effective_from as string }));
  rulesCache = { at: Date.now(), rows: out };
  return out;
}

async function getMe(): Promise<Member> {
  const id = await uid();
  const row = must(await client().from('v_admin_members').select('id, phone, full_name, points, lifetime_points').eq('id', id).maybeSingle()) as Row | null;
  if (!row) throw new Error('member_missing');
  const rules = await getRules();
  let tierId = '';
  try {
    tierId = tierProgress(Number(row.lifetime_points), ruleAt(rules, new Date().toISOString()).tiers).current.id;
  } catch {
    tierId = '';
  }
  return {
    id,
    fullName: (row.full_name as string | null)?.trim() || t.common.memberFallbackName,
    phone: String(row.phone),
    points: Number(row.points),
    lifetimePoints: Number(row.lifetime_points),
    tierId,
    updatedAt: new Date().toISOString(),
  };
}

const REASONS: LedgerReason[] = ['order', 'redeem', 'birthday', 'signup', 'program', 'adjust'];

async function getLedger(): Promise<LedgerEntry[]> {
  const id = await uid();
  const rows = must(await client().from('point_ledger').select('id, created_at, delta, reason, title, meta, rule_version').eq('member_id', id).order('created_at', { ascending: false }).limit(200)) ?? [];
  return rows.map((r: Row) => ({
    id: String(r.id),
    at: String(r.created_at),
    delta: Number(r.delta),
    // 'expire' (điểm hết hạn) hiển thị như một dòng điều chỉnh.
    reason: REASONS.includes(r.reason as LedgerReason) ? (r.reason as LedgerReason) : 'adjust',
    title: String(r.title),
    meta: String(r.meta ?? ''),
    ruleVersion: (r.rule_version as number | null) ?? undefined,
  }));
}

async function getOrders(): Promise<Order[]> {
  const id = await uid();
  const [orders, earned] = await Promise.all([
    client().from('orders').select('id, code, ordered_at, status, items, channel, subtotal, discount').eq('member_id', id).order('ordered_at', { ascending: false }).limit(100),
    client().from('point_ledger').select('order_id, delta').eq('member_id', id).eq('reason', 'order').not('order_id', 'is', null),
  ]);
  const pointsBy = new Map<string, number>();
  for (const l of must(earned) ?? []) pointsBy.set(String(l.order_id), (pointsBy.get(String(l.order_id)) ?? 0) + Number(l.delta));
  return (must(orders) ?? []).map((o: Row) => ({
    id: String(o.id),
    code: String(o.code),
    at: String(o.ordered_at),
    status: o.status as OrderStatus,
    items: Array.isArray(o.items) ? (o.items as string[]).join(', ') : '',
    channel: String(o.channel),
    total: Number(o.subtotal) - Number(o.discount),
    pointsEarned: pointsBy.get(String(o.id)) ?? null,
  }));
}

const DAY = 86_400_000;

async function getOffers(): Promise<Offer[]> {
  const id = await uid();
  const nowIso = new Date().toISOString();
  const [offers, mine, me] = await Promise.all([
    client().from('offers').select('*').or(`ends_at.is.null,ends_at.gte.${nowIso}`).order('created_at', { ascending: false }),
    client().from('member_offers').select('offer_id, used_at').eq('member_id', id),
    getMe(),
  ]);
  const used = new Set((must(mine) ?? []).filter((m: Row) => m.used_at).map((m: Row) => String(m.offer_id)));
  return (must(offers) ?? [])
    .filter((o: Row) => !used.has(String(o.id)) && (!o.starts_at || String(o.starts_at) <= nowIso))
    .map((o: Row): Offer => {
      const kind = o.kind === 'redeem' ? 'redeem' : o.kind === 'event' ? 'event' : 'mine';
      const ends = o.ends_at ? new Date(String(o.ends_at)).getTime() : null;
      const daysLeft = ends ? Math.ceil((ends - Date.now()) / DAY) : null;
      let tag: string = t.offers.ongoing;
      let tagWarn = false;
      if (kind === 'redeem' && o.points_cost != null) {
        const lack = Number(o.points_cost) - me.points;
        tag = lack <= 0 ? t.offers.enoughPoints : t.offers.notEnough;
        tagWarn = lack > 0;
      } else if (daysLeft != null) {
        tagWarn = daysLeft <= 7;
        tag = tagWarn ? t.offers.daysLeft(daysLeft) : t.offers.until(formatDayMonth(String(o.ends_at)));
      }
      const lackMeta = kind === 'redeem' && o.points_cost != null && Number(o.points_cost) > me.points ? t.offers.lack(formatNumber(Number(o.points_cost) - me.points)) : '';
      return {
        id: String(o.id),
        kind,
        value: String(o.value),
        unit: String(o.unit),
        tone: o.tone as Offer['tone'],
        title: String(o.title),
        meta: lackMeta || String(o.body ?? ''),
        tag,
        tagWarn,
        cta: kind === 'mine' ? t.offers.ctaUse : kind === 'redeem' ? t.offers.ctaRedeem : t.offers.ctaDetail,
        primary: kind !== 'redeem',
      };
    });
}

export const remoteApi = {
  async sendOtp(phone: string): Promise<void> {
    const { error } = await client().auth.signInWithOtp({ phone: toE164(phone) });
    if (error) throw new Error(error.message);
  },

  /** Xác thực OTP, rồi chạy onboard (ghi đồng ý, ghép đơn cũ, cộng điểm). */
  async verifyOtp(phone: string, code: string, marketing?: boolean): Promise<{ token: string }> {
    const { data, error } = await client().auth.verifyOtp({ phone: toE164(phone), token: code, type: 'sms' });
    if (error || !data.session) throw new Error('otp_invalid');
    // onboard an toàn khi chạy lại: lỗi ở đây không chặn đăng nhập, lần đăng nhập sau sẽ ghép tiếp.
    await call('onboard', { marketing, device: Platform.OS }).catch((e) => console.warn('onboard', e));
    return { token: data.session.access_token };
  },

  getMe,
  getRules,
  getLedger,
  getOrders,
  getOffers,

  async claimProgramCode(raw: string): Promise<ClaimResult> {
    return call<ClaimResult>('claimCode', { code: raw });
  },
};
