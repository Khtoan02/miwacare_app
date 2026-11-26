// Edge Function `admin`: mọi thao tác GHI của trang quản trị.
// - Xác thực người gọi bằng access token Supabase, lấy vai từ bảng admin_users.
// - Ghi bằng service_role (bỏ qua RLS) nên kiểm tra quyền + dữ liệu ở đây, ghi nhật ký audit_logs.
// - Tính điểm bằng đúng hàm của app (bản sao trong _shared, sinh bởi scripts/sync-shared.mjs).
// Đọc dữ liệu thì trang quản trị truy vấn thẳng (RLS cho phép admin đọc).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { earnedPoints, ruleAt, tierProgress } from '../_shared/domain/points.ts';
import type { LoyaltyRuleVersion, Tier } from '../_shared/domain/types.ts';
import { normalizeVnPhone } from '../_shared/format.ts';

type Role = 'viewer' | 'editor' | 'admin';
type OrderStatus = 'done' | 'shipping' | 'cancelled';
const ROLES: Role[] = ['viewer', 'editor', 'admin'];

interface OrderInput {
  code: string;
  phone: string;
  orderedAt: string;
  subtotal: number;
  discount: number;
  channel: string;
  items: string;
  status: OrderStatus;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
const bad = (m: string) => new HttpError(400, m);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db: SupabaseClient = createClient(URL_, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ---------- Tiện ích ----------
function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new HttpError(500, r.error.message);
  return r.data;
}

interface Actor {
  id: string;
  email: string;
  role: Role;
}

async function actorFrom(req: Request): Promise<Actor> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Chưa đăng nhập');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Phiên đăng nhập hết hạn, hãy đăng nhập lại');
  const row = must(await db.from('admin_users').select('role').eq('id', data.user.id).maybeSingle());
  if (!row) throw new HttpError(403, 'Tài khoản này không có quyền quản trị');
  return { id: data.user.id, email: data.user.email ?? data.user.id, role: row.role as Role };
}

function requireRole(a: Actor, min: Role) {
  if (ROLES.indexOf(a.role) < ROLES.indexOf(min)) throw new HttpError(403, 'Tài khoản của bạn không có quyền thực hiện thao tác này');
}

async function audit(a: Actor, action: string, target: string, detail = '') {
  must(await db.from('audit_logs').insert({ actor: a.id, action, target, detail: { text: detail, email: a.email } }));
}

async function loadRules(): Promise<LoyaltyRuleVersion[]> {
  const rows = must(await db.from('loyalty_rule_versions').select('version, effective_from, config'));
  return (rows ?? []).map((r) => ({ ...(r.config as Omit<LoyaltyRuleVersion, 'version' | 'effectiveFrom'>), version: r.version, effectiveFrom: r.effective_from }));
}

async function lifetimeOf(memberId: string) {
  const row = must(await db.from('v_admin_members').select('points, lifetime_points, full_name, phone').eq('id', memberId).maybeSingle());
  if (!row) throw bad('Không tìm thấy thành viên');
  return row as { points: number; lifetime_points: number; full_name: string | null; phone: string };
}

async function memberByPhone(phone: string) {
  return must(await db.from('members').select('id, full_name').eq('phone', phone).is('deleted_at', null).maybeSingle()) as { id: string; full_name: string | null } | null;
}

/** Điểm sẽ cộng cho một đơn (0 nếu chưa có khách hoặc chưa có cấu hình). */
async function pointsFor(rules: LoyaltyRuleVersion[], memberId: string, o: { subtotal: number; discount: number; orderedAt: string }) {
  try {
    const rule = ruleAt(rules, o.orderedAt);
    const { lifetime_points } = await lifetimeOf(memberId);
    const tier = tierProgress(lifetime_points, ruleAt(rules, new Date().toISOString()).tiers).current;
    return { points: earnedPoints({ subtotal: o.subtotal, discount: o.discount, at: o.orderedAt }, tier.id, rule), ruleVersion: rule.version };
  } catch {
    return { points: 0, ruleVersion: null as number | null };
  }
}

function normalizeOrder(input: OrderInput) {
  const raw = String(input.code ?? '').trim();
  const code = raw.startsWith('#') ? raw : `#${raw}`;
  if (code.length < 2) throw bad('Thiếu mã đơn');
  const phone = normalizeVnPhone(String(input.phone ?? ''));
  if (!phone) throw bad('Số điện thoại không hợp lệ');
  const subtotal = Number(input.subtotal);
  const discount = Number(input.discount ?? 0);
  if (!Number.isFinite(subtotal) || !(subtotal > 0)) throw bad('Tổng tiền phải lớn hơn 0');
  if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) throw bad('Giảm giá không hợp lệ');
  if (Number.isNaN(new Date(input.orderedAt).getTime())) throw bad('Ngày mua không hợp lệ');
  if (!['done', 'shipping', 'cancelled'].includes(input.status)) throw bad('Trạng thái đơn không hợp lệ');
  return { code, phone, subtotal: Math.round(subtotal), discount: Math.round(discount), orderedAt: new Date(input.orderedAt).toISOString(), status: input.status, channel: String(input.channel ?? '').trim() || 'Cửa hàng', items: String(input.items ?? '').trim() };
}

/** Cộng điểm cho đơn đã hoàn thành — một đơn chỉ một lần (ràng buộc unique(order_id, reason)). */
async function award(rules: LoyaltyRuleVersion[], a: Actor, o: { id: string; code: string; member_id: string | null; status: string; subtotal: number; discount: number; ordered_at: string; channel: string }) {
  if (!o.member_id || o.status !== 'done') return 0;
  const { points, ruleVersion } = await pointsFor(rules, o.member_id, { subtotal: o.subtotal, discount: o.discount, orderedAt: o.ordered_at });
  if (points <= 0) return 0;
  const { error } = await db.from('point_ledger').insert({ member_id: o.member_id, delta: points, reason: 'order', title: `Đơn hàng ${o.code}`, meta: o.channel, order_id: o.id, rule_version: ruleVersion, created_by: a.id });
  if (error) {
    if (error.code === '23505') return 0; // đã cộng rồi
    throw new HttpError(500, error.message);
  }
  return points;
}

// ---------- Các thao tác ----------
async function preview(rows: OrderInput[]) {
  const rules = await loadRules();
  const codes = rows.map((r) => {
    const c = String(r.code ?? '').trim();
    return c.startsWith('#') ? c : `#${c}`;
  });
  const existing = new Set(
    (must(await db.from('orders').select('code').in('code', codes.filter((c) => c.length > 1))) ?? []).map((r: { code: string }) => r.code.toLowerCase()),
  );
  const seen = new Set<string>();
  const out = [];
  for (const [i, input] of rows.entries()) {
    try {
      const o = normalizeOrder(input);
      const key = o.code.toLowerCase();
      if (existing.has(key)) throw bad(`Mã đơn ${o.code} đã tồn tại`);
      if (seen.has(key)) throw bad(`Trùng mã đơn ${o.code} trong file`);
      seen.add(key);
      const m = await memberByPhone(o.phone);
      const p = m ? await pointsFor(rules, m.id, o) : { points: 0, ruleVersion: null };
      out.push({ index: i, error: null, phone: o.phone, memberId: m?.id ?? null, memberName: m?.full_name ?? null, points: o.status === 'done' ? p.points : 0, previewPoints: p.points, ruleVersion: p.ruleVersion });
    } catch (e) {
      out.push({ index: i, error: (e as Error).message, phone: null, memberId: null, memberName: null, points: 0, previewPoints: 0, ruleVersion: null });
    }
  }
  return out;
}

async function insertOrders(a: Actor, rows: OrderInput[], source: 'admin' | 'import') {
  const rules = await loadRules();
  const checked = await preview(rows);
  let points = 0;
  const created = [];
  for (const r of checked) {
    if (r.error) continue;
    const o = normalizeOrder(rows[r.index]);
    const ins = await db
      .from('orders')
      .insert({ code: o.code, member_id: r.memberId, phone: o.phone, status: o.status, channel: o.channel, items: o.items ? [o.items] : [], subtotal: o.subtotal, discount: o.discount, ordered_at: o.orderedAt, source })
      .select('id, code, member_id, status, subtotal, discount, ordered_at, channel')
      .single();
    if (ins.error) {
      if (ins.error.code === '23505') continue; // trùng mã đơn (gửi lại hai lần)
      throw new HttpError(500, ins.error.message);
    }
    const pts = await award(rules, a, ins.data);
    points += pts;
    created.push({ id: ins.data.id, code: ins.data.code, points: pts, memberName: r.memberName });
  }
  return { checked, created, points };
}

async function createOrder(a: Actor, input: OrderInput) {
  requireRole(a, 'editor');
  const [check] = await preview([input]);
  if (check.error) throw bad(check.error);
  const { created, points } = await insertOrders(a, [input], 'admin');
  if (!created[0]) throw bad('Đơn đã được lưu trước đó');
  await audit(a, 'Nhập đơn', created[0].code, `${check.phone}${check.memberName ? ` · ${check.memberName}` : ' · chưa có tài khoản app'}${points ? ` · +${points} điểm` : ''}`);
  return { order: { id: created[0].id, code: created[0].code }, points };
}

async function importOrders(a: Actor, rows: OrderInput[]) {
  requireRole(a, 'editor');
  if (!Array.isArray(rows) || rows.length === 0) throw bad('File không có dòng nào');
  if (rows.length > 2000) throw bad('Tối đa 2.000 dòng mỗi lần nhập');
  const { created, points } = await insertOrders(a, rows, 'import');
  await audit(a, 'Nhập đơn từ CSV', `${created.length} đơn`, `+${points} điểm`);
  return { imported: created.length, skipped: rows.length - created.length, points };
}

const STATUS_VI: Record<OrderStatus, string> = { done: 'Hoàn thành', shipping: 'Đang giao', cancelled: 'Đã huỷ' };

async function setOrderStatus(a: Actor, id: string, status: OrderStatus) {
  requireRole(a, 'editor');
  if (!['done', 'shipping', 'cancelled'].includes(status)) throw bad('Trạng thái không hợp lệ');
  const o = must(await db.from('orders').select('id, code, member_id, status, subtotal, discount, ordered_at, channel').eq('id', id).maybeSingle());
  if (!o) throw bad('Không tìm thấy đơn');
  if (o.status === status) return { points: 0 };
  if (o.status === 'cancelled') throw bad('Đơn đã huỷ không đổi lại được — hãy nhập đơn mới');
  must(await db.from('orders').update({ status }).eq('id', id));
  let note = '';
  let delta = 0;
  if (status === 'done') {
    delta = await award(await loadRules(), a, { ...o, status });
    if (delta) note = ` · +${delta} điểm`;
  } else if (status === 'cancelled' && o.member_id) {
    const earned = must(await db.from('point_ledger').select('delta').eq('order_id', id).eq('reason', 'order').maybeSingle());
    if (earned) {
      const { error } = await db.from('point_ledger').insert({ member_id: o.member_id, delta: -earned.delta, reason: 'adjust', title: `Huỷ đơn ${o.code}`, meta: 'Trừ lại điểm đã cộng', order_id: id, created_by: a.id });
      if (error && error.code !== '23505') throw new HttpError(500, error.message);
      if (!error) {
        delta = -earned.delta;
        note = ` · −${earned.delta} điểm`;
      }
    }
  }
  await audit(a, 'Đổi trạng thái đơn', o.code, `→ ${STATUS_VI[status]}${note}`);
  return { points: delta };
}

async function rematch(a: Actor) {
  requireRole(a, 'editor');
  const rules = await loadRules();
  const orders = must(await db.from('orders').select('id, code, member_id, status, subtotal, discount, ordered_at, channel, phone').is('member_id', null).limit(5000)) ?? [];
  let matched = 0;
  let points = 0;
  for (const o of orders) {
    const m = await memberByPhone(o.phone);
    if (!m) continue;
    must(await db.from('orders').update({ member_id: m.id }).eq('id', o.id).is('member_id', null));
    matched++;
    points += await award(rules, a, { ...o, member_id: m.id });
  }
  if (matched) await audit(a, 'Ghép đơn theo SĐT', `${matched} đơn`, `+${points} điểm`);
  return { matched, points };
}

async function adjustPoints(a: Actor, memberId: string, delta: number, note: string) {
  requireRole(a, 'admin');
  if (!Number.isInteger(delta) || delta === 0) throw bad('Số điểm phải là số nguyên khác 0');
  const why = String(note ?? '').trim();
  if (why.length < 5) throw bad('Ghi rõ lý do điều chỉnh (tối thiểu 5 ký tự)');
  const m = await lifetimeOf(memberId);
  if (m.points + delta < 0) throw bad(`Khách chỉ còn ${m.points} điểm, không thể trừ ${-delta}`);
  must(await db.from('point_ledger').insert({ member_id: memberId, delta, reason: 'adjust', title: delta > 0 ? 'Cộng điểm thủ công' : 'Trừ điểm thủ công', meta: why, created_by: a.id }));
  await audit(a, 'Điều chỉnh điểm', `${m.full_name ?? ''} (${m.phone})`, `${delta > 0 ? '+' : ''}${delta} — ${why}`);
  return { ok: true };
}

async function saveRule(a: Actor, draft: Omit<LoyaltyRuleVersion, 'version'>) {
  requireRole(a, 'admin');
  if (!(draft?.earn?.amountPerPoint >= 1000)) throw bad('Số tiền cho 1 điểm tối thiểu 1.000đ');
  if (!(draft.redeemValue > 0)) throw bad('Giá trị quy đổi 1 điểm phải lớn hơn 0');
  const tiers: Tier[] = [...(draft.tiers ?? [])].sort((x, y) => x.minPoints - y.minPoints);
  if (tiers[0]?.minPoints !== 0) throw bad('Hạng thấp nhất phải bắt đầu từ 0 điểm');
  if (tiers.some((t) => !t.name?.trim())) throw bad('Hạng nào cũng cần có tên');
  if (new Set(tiers.map((t) => t.minPoints)).size !== tiers.length) throw bad('Mốc điểm các hạng không được trùng nhau');
  if (Number.isNaN(new Date(draft.effectiveFrom).getTime())) throw bad('Ngày hiệu lực không hợp lệ');
  const rules = await loadRules();
  const prev = rules.sort((x, y) => y.version - x.version)[0];
  if (prev && new Date(draft.effectiveFrom) < new Date(prev.effectiveFrom)) throw bad('Ngày hiệu lực phải sau phiên bản trước');
  const version = (prev?.version ?? 0) + 1;
  const { effectiveFrom, ...config } = draft;
  must(await db.from('loyalty_rule_versions').insert({ version, effective_from: effectiveFrom, config: { ...config, tiers }, created_by: a.id }));
  // Bảng tiers giữ danh sách hạng (khoá ngoại members.tier_id): thêm / cập nhật theo phiên bản mới nhất.
  must(await db.from('tiers').upsert(tiers.map((t, i) => ({ id: t.id, name: t.name, min_points: t.minPoints, color_key: t.colorKey, sort: i + 1 }))));
  await audit(a, 'Lưu cấu hình điểm', `Phiên bản ${version}`, `Hiệu lực từ ${new Date(effectiveFrom).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  return { ...draft, tiers, version };
}

interface OfferInput {
  kind: 'voucher' | 'redeem' | 'event';
  value: string;
  unit: string;
  tone: 'sun' | 'sky' | 'leaf' | 'lemon';
  title: string;
  body: string;
  startsAt: string | null;
  endsAt: string | null;
  pointsCost: number | null;
  public: boolean;
}

async function createOffer(a: Actor, input: OfferInput) {
  requireRole(a, 'editor');
  if (!input?.title?.trim()) throw bad('Thiếu tiêu đề ưu đãi');
  if (!input.value?.trim()) throw bad('Thiếu giá trị hiển thị (ví dụ −50K, 500)');
  if (input.kind === 'redeem' && !(input.pointsCost && input.pointsCost > 0)) throw bad('Ưu đãi đổi điểm cần số điểm');
  const row = must(
    await db
      .from('offers')
      .insert({ kind: input.kind, value: input.value.trim(), unit: input.unit ?? '', tone: input.tone, title: input.title.trim(), body: input.body ?? '', starts_at: input.startsAt, ends_at: input.endsAt, points_cost: input.pointsCost, public: input.public })
      .select('id')
      .single(),
  );
  await audit(a, 'Tạo ưu đãi', input.title.trim());
  return { id: row.id };
}

async function deleteOffer(a: Actor, id: string) {
  requireRole(a, 'editor');
  const busy = must(await db.from('programs').select('id').eq('gift_offer_id', id).neq('status', 'ended').limit(1));
  if (busy?.length) throw bad('Ưu đãi đang là quà của một chương trình đang chạy');
  const o = must(await db.from('offers').select('title').eq('id', id).maybeSingle());
  must(await db.from('offers').delete().eq('id', id));
  if (o) await audit(a, 'Xoá ưu đãi', o.title);
  return { ok: true };
}

interface ProgramInput {
  name: string;
  place: string;
  startsAt: string;
  endsAt: string;
  giftOfferId: string | null;
  maxClaims: number | null;
  code: string;
}

const CODE_RE = /^[A-Z0-9-]{8,32}$/;

async function createProgram(a: Actor, input: ProgramInput) {
  requireRole(a, 'editor');
  if (!input?.name?.trim()) throw bad('Thiếu tên chương trình');
  if (!input.startsAt || !input.endsAt || new Date(input.endsAt) <= new Date(input.startsAt)) throw bad('Thời gian kết thúc phải sau thời gian bắt đầu');
  const code = String(input.code ?? '').trim().toUpperCase();
  if (!CODE_RE.test(code)) throw bad('Mã gồm 8–32 ký tự: chữ in hoa, số, dấu gạch ngang');
  if (must(await db.from('program_codes').select('code').eq('code', code).maybeSingle())) throw bad(`Mã ${code} đã được dùng`);
  const p = must(
    await db
      .from('programs')
      .insert({ name: input.name.trim(), place: input.place?.trim() ?? '', starts_at: input.startsAt, ends_at: input.endsAt, gift_offer_id: input.giftOfferId, max_claims: input.maxClaims, status: 'active' })
      .select('id')
      .single(),
  );
  must(await db.from('program_codes').insert({ code, program_id: p.id }));
  await audit(a, 'Tạo chương trình', input.name.trim(), `Mã ${code}${input.maxClaims ? `, tối đa ${input.maxClaims} lượt` : ''}`);
  return { id: p.id };
}

async function addProgramCode(a: Actor, programId: string, codeIn: string) {
  requireRole(a, 'editor');
  const code = String(codeIn ?? '').trim().toUpperCase();
  if (!CODE_RE.test(code)) throw bad('Mã gồm 8–32 ký tự: chữ in hoa, số, dấu gạch ngang');
  const p = must(await db.from('programs').select('name').eq('id', programId).maybeSingle());
  if (!p) throw bad('Không tìm thấy chương trình');
  const { error } = await db.from('program_codes').insert({ code, program_id: programId });
  if (error) throw error.code === '23505' ? bad('Mã đã tồn tại, thử lại') : new HttpError(500, error.message);
  await audit(a, 'Thêm mã chương trình', p.name, code);
  return { code, singleUse: false, usedCount: 0 };
}

async function endProgram(a: Actor, id: string) {
  requireRole(a, 'editor');
  const p = must(await db.from('programs').select('name').eq('id', id).maybeSingle());
  if (!p) throw bad('Không tìm thấy chương trình');
  must(await db.from('programs').update({ status: 'ended' }).eq('id', id));
  await audit(a, 'Kết thúc chương trình', p.name);
  return { ok: true };
}

// ---------- Điểm vào ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Chỉ nhận POST' }, 405);
  try {
    const a = await actorFrom(req);
    const body = await req.json().catch(() => ({}));
    const p = body?.payload ?? {};
    switch (body?.action) {
      case 'preview':
        return json(await preview(Array.isArray(p.rows) ? p.rows : []));
      case 'createOrder':
        return json(await createOrder(a, p.input));
      case 'importOrders':
        return json(await importOrders(a, p.rows));
      case 'setOrderStatus':
        return json(await setOrderStatus(a, p.id, p.status));
      case 'rematchOrders':
        return json(await rematch(a));
      case 'adjustPoints':
        return json(await adjustPoints(a, p.memberId, p.delta, p.note));
      case 'saveRuleVersion':
        return json(await saveRule(a, p.draft));
      case 'createOffer':
        return json(await createOffer(a, p.input));
      case 'deleteOffer':
        return json(await deleteOffer(a, p.id));
      case 'createProgram':
        return json(await createProgram(a, p.input));
      case 'addProgramCode':
        return json(await addProgramCode(a, p.programId, p.code));
      case 'endProgram':
        return json(await endProgram(a, p.id));
      default:
        return json({ error: 'Thao tác không hợp lệ' }, 400);
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error(e);
    return json({ error: status >= 500 ? 'Lỗi máy chủ, thử lại sau' : (e as Error).message }, status);
  }
});
