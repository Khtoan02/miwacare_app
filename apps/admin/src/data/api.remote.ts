// Lớp dữ liệu THẬT của trang quản trị: Supabase.
// - Đọc: truy vấn thẳng bảng/view, RLS chỉ cho admin_users đọc (is_admin()).
// - Ghi: gọi Edge Function `admin` (supabase/functions/admin) — kiểm tra quyền, tính điểm, ghi nhật ký trên server.
// Chữ ký hàm giống api.mock.ts (api.ts kiểm tra điều này khi biên dịch).
import { ruleAt, tierProgress } from '@domain/points';
import { normalizeVnPhone } from '@shared/format';

import { supabase as sb } from '@/lib/supabase';

import type {
  AdminOffer,
  AdminOrder,
  AuditLog,
  LedgerRow,
  LoyaltyRuleVersion,
  MemberRow,
  OrderStatus,
  Program,
  ProgramCode,
} from './types';
import { ApiError, randomCode, type ImportRowResult, type OrderInput, type ProgramInput } from './api.mock';


function client() {
  if (!sb) throw new ApiError('Chưa cấu hình Supabase');
  return sb;
}

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new ApiError(r.error.message);
  return r.data;
}

/** Gọi Edge Function `admin`. Lỗi nghiệp vụ trả về { error } với mã 4xx. */
async function call<T>(action: string, payload: unknown = {}): Promise<T> {
  const { data, error } = await client().functions.invoke('admin', { body: { action, payload } });
  if (error) {
    let msg = 'Không kết nối được máy chủ, thử lại sau';
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json().catch(() => null);
      if (body?.error) msg = body.error;
    }
    throw new ApiError(msg);
  }
  return data as T;
}

// ---------- Đổi tên cột DB → kiểu dùng trong UI ----------
type DbRow = Record<string, unknown>;
const s = (v: unknown) => (v == null ? '' : String(v));

let rulesCache: { at: number; rules: LoyaltyRuleVersion[] } | null = null;

async function loadRules(): Promise<LoyaltyRuleVersion[]> {
  if (rulesCache && Date.now() - rulesCache.at < 30_000) return rulesCache.rules;
  const rows = must(await client().from('loyalty_rule_versions').select('version, effective_from, config').order('version'));
  const rules = (rows ?? []).map((r) => ({ ...(r.config as Omit<LoyaltyRuleVersion, 'version' | 'effectiveFrom'>), version: r.version as number, effectiveFrom: r.effective_from as string }));
  rulesCache = { at: Date.now(), rules };
  return rules;
}

const currentRule = (rules: LoyaltyRuleVersion[]) => ruleAt(rules, new Date().toISOString());

function toMember(r: DbRow, rules: LoyaltyRuleVersion[]): MemberRow {
  const lifetime = Number(r.lifetime_points ?? 0);
  return {
    id: s(r.id),
    fullName: s(r.full_name),
    phone: s(r.phone),
    birthday: (r.birthday as string) ?? null,
    createdAt: s(r.created_at),
    marketing: !!r.marketing,
    points: Number(r.points ?? 0),
    lifetimePoints: lifetime,
    tier: tierProgress(lifetime, currentRule(rules).tiers).current,
    orderCount: Number(r.order_count ?? 0),
    lastOrderAt: (r.last_order_at as string) ?? null,
  };
}

function toOrder(r: DbRow): AdminOrder {
  const items = Array.isArray(r.items) ? (r.items as unknown[]).map(s).join(', ') : s(r.items);
  return {
    id: s(r.id),
    code: s(r.code),
    memberId: (r.member_id as string) ?? null,
    phone: s(r.phone),
    status: r.status as OrderStatus,
    channel: s(r.channel),
    items,
    subtotal: Number(r.subtotal),
    discount: Number(r.discount),
    orderedAt: s(r.ordered_at),
    source: r.source as AdminOrder['source'],
    createdAt: s(r.created_at),
  };
}

function toLedger(r: DbRow): LedgerRow {
  return {
    id: s(r.id),
    memberId: s(r.member_id),
    delta: Number(r.delta),
    reason: r.reason as LedgerRow['reason'],
    title: s(r.title),
    meta: s(r.meta),
    orderId: (r.order_id as string) ?? undefined,
    ruleVersion: (r.rule_version as number) ?? undefined,
    createdBy: (r.created_by as string) ?? undefined,
    createdAt: s(r.created_at),
  };
}

function toOffer(r: DbRow): AdminOffer {
  return {
    id: s(r.id),
    kind: r.kind as AdminOffer['kind'],
    value: s(r.value),
    unit: s(r.unit),
    tone: r.tone as AdminOffer['tone'],
    title: s(r.title),
    body: s(r.body),
    startsAt: (r.starts_at as string) ?? null,
    endsAt: (r.ends_at as string) ?? null,
    pointsCost: (r.points_cost as number) ?? null,
    public: !!r.public,
  };
}

function toProgram(r: DbRow): Program {
  const codes = ((r.program_codes as DbRow[]) ?? []).map((c) => ({ code: s(c.code), singleUse: !!c.single_use, usedCount: Number(c.used_count ?? 0) }));
  const claims = (r.program_claims as { count: number }[] | undefined)?.[0]?.count ?? 0;
  return {
    id: s(r.id),
    name: s(r.name),
    place: s(r.place),
    startsAt: s(r.starts_at),
    endsAt: s(r.ends_at),
    giftOfferId: (r.gift_offer_id as string) ?? null,
    maxClaims: (r.max_claims as number) ?? null,
    status: r.status as Program['status'],
    codes,
    claims,
    createdAt: s(r.created_at),
  };
}

const PROGRAM_SELECT = '*, program_codes(code, single_use, used_count), program_claims(count), gift:offers(*)';

// ---------- Tổng quan (F-71) ----------
function monthStartIso() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getDashboard() {
  const c = client();
  const rules = await loadRules();
  const monthStart = monthStartIso();
  const [members, ledgerMonth, ordersMonth, unmatched, recent] = await Promise.all([
    c.from('v_admin_members').select('*'),
    c.from('point_ledger').select('delta, reason').gte('created_at', monthStart),
    c.from('orders').select('status, subtotal, discount').gte('ordered_at', monthStart).neq('status', 'cancelled'),
    c.from('orders').select('id', { count: 'exact', head: true }).is('member_id', null),
    c.from('point_ledger').select('*, members(full_name)').order('created_at', { ascending: false }).limit(8),
  ]);
  const rows = (must(members) ?? []).map((r) => toMember(r, rules));
  const d30 = Date.now() - 30 * 86_400_000;
  const led = must(ledgerMonth) ?? [];
  const ord = must(ordersMonth) ?? [];
  return {
    members: rows.length,
    newMembers30d: rows.filter((r) => new Date(r.createdAt).getTime() >= d30).length,
    marketingRate: rows.length ? rows.filter((r) => r.marketing).length / rows.length : 0,
    pointsIssuedMonth: led.filter((l) => l.delta > 0).reduce((sum, l) => sum + l.delta, 0),
    pointsRedeemedMonth: -led.filter((l) => l.reason === 'redeem').reduce((sum, l) => sum + l.delta, 0),
    ordersMonth: ord.length,
    revenueMonth: ord.filter((o) => o.status === 'done').reduce((sum, o) => sum + Number(o.subtotal) - Number(o.discount), 0),
    tierCounts: currentRule(rules).tiers.map((t) => ({ tier: t, count: rows.filter((r) => r.tier.id === t.id).length })),
    unmatchedOrders: unmatched.count ?? 0,
    recentLedger: (must(recent) ?? []).map((r) => ({ ...toLedger(r), memberName: s((r.members as DbRow | null)?.full_name) })),
  };
}

// ---------- Thành viên (F-72) ----------
export async function listMembers(filter: { q?: string; tierId?: string } = {}): Promise<MemberRow[]> {
  const rules = await loadRules();
  let q = client().from('v_admin_members').select('*').order('created_at', { ascending: false }).limit(1000);
  const text = filter.q?.trim() ?? '';
  const digits = text.replace(/\D/g, '');
  if (text) {
    const safe = text.replace(/[%,()]/g, ' ');
    q = digits.length >= 3 ? q.or(`full_name.ilike.%${safe}%,phone.like.%${digits}%`) : q.ilike('full_name', `%${safe}%`);
  }
  const rows = (must(await q) ?? []).map((r) => toMember(r, rules));
  return filter.tierId ? rows.filter((r) => r.tier.id === filter.tierId) : rows;
}

async function memberRow(id: string, rules?: LoyaltyRuleVersion[]): Promise<MemberRow> {
  const r = must(await client().from('v_admin_members').select('*').eq('id', id).maybeSingle());
  if (!r) throw new ApiError('Không tìm thấy thành viên');
  return toMember(r, rules ?? (await loadRules()));
}

export async function getMember(id: string) {
  const rules = await loadRules();
  const [member, ledger, orders] = await Promise.all([
    memberRow(id, rules),
    client().from('point_ledger').select('*').eq('member_id', id).order('created_at', { ascending: false }),
    client().from('orders').select('*').eq('member_id', id).order('ordered_at', { ascending: false }),
  ]);
  return {
    member,
    progress: tierProgress(member.lifetimePoints, currentRule(rules).tiers),
    ledger: (must(ledger) ?? []).map(toLedger),
    orders: (must(orders) ?? []).map(toOrder),
  };
}

export async function adjustPoints(memberId: string, delta: number, note: string) {
  await call('adjustPoints', { memberId, delta, note });
}

// ---------- Đơn hàng ----------
export async function listOrders(filter: { q?: string; status?: OrderStatus | ''; unmatched?: boolean } = {}) {
  let q = client().from('orders').select('*, members(full_name), point_ledger(delta, reason)').order('ordered_at', { ascending: false }).limit(500);
  if (filter.status) q = q.eq('status', filter.status);
  if (filter.unmatched) q = q.is('member_id', null);
  const text = filter.q?.trim() ?? '';
  if (text) {
    const digits = text.replace(/\D/g, '');
    const safe = text.replace(/[%,()]/g, ' ');
    q = digits.length >= 3 ? q.or(`code.ilike.%${safe}%,phone.like.%${digits}%`) : q.ilike('code', `%${safe}%`);
  }
  return (must(await q) ?? []).map((r) => ({
    ...toOrder(r),
    memberName: ((r.members as DbRow | null)?.full_name as string) ?? null,
    points: ((r.point_ledger as DbRow[]) ?? []).find((l) => l.reason === 'order')?.delta as number | undefined ?? null,
  }));
}

interface PreviewRow {
  index: number;
  error: string | null;
  phone: string | null;
  memberId: string | null;
  memberName: string | null;
  points: number;
  previewPoints: number;
  ruleVersion: number | null;
}

/** Xem trước: khớp khách theo SĐT và số điểm sẽ được cộng — tính trên server, cùng hàm với lúc lưu. */
export async function previewOrder(input: Pick<OrderInput, 'phone' | 'orderedAt' | 'subtotal' | 'discount'>) {
  const phone = normalizeVnPhone(input.phone);
  const empty = { phone, member: null as MemberRow | null, points: 0, ruleVersion: null as number | null };
  if (!phone || !input.orderedAt || !(input.subtotal > 0)) return empty;
  const [r] = await call<PreviewRow[]>('preview', { rows: [{ ...input, code: '#preview', channel: '', items: '', status: 'done' }] });
  if (!r?.memberId) return empty;
  return { phone, member: await memberRow(r.memberId), points: r.previewPoints, ruleVersion: r.ruleVersion };
}

export async function createOrder(input: OrderInput) {
  const r = await call<{ order: { id: string }; points: number }>('createOrder', { input });
  const row = must(await client().from('orders').select('*').eq('id', r.order.id).single());
  return { order: toOrder(row), points: r.points };
}

export async function setOrderStatus(id: string, status: OrderStatus) {
  await call('setOrderStatus', { id, status });
}

export async function rematchOrders() {
  return call<{ matched: number; points: number }>('rematchOrders');
}

export async function checkImport(rows: OrderInput[]): Promise<ImportRowResult[]> {
  if (!rows.length) return [];
  const res = await call<PreviewRow[]>('preview', { rows });
  return res.map((r) => ({ line: r.index + 2, input: rows[r.index] ?? null, error: r.error, memberName: r.memberName, points: r.points }));
}

export async function importOrders(rows: OrderInput[]) {
  return call<{ imported: number; skipped: number; points: number }>('importOrders', { rows });
}

// ---------- Cấu hình điểm & hạng (Q-05) ----------
export async function getRules() {
  const rules = await loadRules();
  return { versions: [...rules].sort((a, b) => b.version - a.version), current: currentRule(rules) };
}

export async function saveRuleVersion(draft: Omit<LoyaltyRuleVersion, 'version'>) {
  const v = await call<LoyaltyRuleVersion>('saveRuleVersion', { draft });
  rulesCache = null;
  return v;
}

// ---------- Ưu đãi ----------
export async function listOffers() {
  return (must(await client().from('offers').select('*').order('created_at', { ascending: false })) ?? []).map(toOffer);
}

export async function createOffer(input: Omit<AdminOffer, 'id'>) {
  const { id } = await call<{ id: string }>('createOffer', { input });
  return { ...input, id } as AdminOffer;
}

export async function deleteOffer(id: string) {
  await call('deleteOffer', { id });
}

// ---------- Chương trình & mã QR (F-81) ----------
export { randomCode };

export async function listPrograms() {
  const rows = must(await client().from('programs').select(PROGRAM_SELECT).order('created_at', { ascending: false })) ?? [];
  return rows.map((r) => ({ ...toProgram(r), gift: r.gift ? toOffer(r.gift as DbRow) : null }));
}

export async function getProgram(id: string) {
  const r = must(await client().from('programs').select(PROGRAM_SELECT).eq('id', id).maybeSingle());
  if (!r) throw new ApiError('Không tìm thấy chương trình');
  return { ...toProgram(r), gift: r.gift ? toOffer(r.gift as DbRow) : null };
}

export async function createProgram(input: ProgramInput) {
  const { id } = await call<{ id: string }>('createProgram', { input });
  const p = await getProgram(id);
  return p as Program;
}

export async function addProgramCode(programId: string, code?: string): Promise<ProgramCode> {
  return call<ProgramCode>('addProgramCode', { programId, code: code ?? randomCode() });
}

export async function endProgram(id: string) {
  await call('endProgram', { id });
}

// ---------- Nhật ký (F-79) ----------
export async function listAudit(): Promise<AuditLog[]> {
  const rows = must(await client().from('audit_logs').select('*').order('created_at', { ascending: false }).limit(300)) ?? [];
  return rows.map((r) => {
    const d = (r.detail ?? {}) as { text?: string; email?: string };
    return { id: s(r.id), actor: d.email ?? s(r.actor), action: s(r.action), target: s(r.target), detail: d.text ?? '', at: s(r.created_at) };
  });
}
