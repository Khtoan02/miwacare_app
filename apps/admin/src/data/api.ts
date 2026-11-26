// Lớp dữ liệu của trang quản trị.
// Hiện chạy trên DỮ LIỆU MẪU trong trình duyệt (lưu localStorage để tải lại trang không mất).
// Khi có Supabase: thay phần thân từng hàm bằng truy vấn Supabase / Edge Function, giữ nguyên chữ ký hàm.
// Mọi quy tắc nghiệp vụ quan trọng (cộng điểm, chống cộng trùng) sau này chạy trên server, không tin trình duyệt.
import { earnedPoints, ruleAt, tierProgress } from '@domain/points';
import { normalizeVnPhone } from '@shared/format';

import { buildSeed, type Seed } from './mock';
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
  Role,
  Session,
  Tier,
} from './types';

const STORE_KEY = 'miwacare-admin-mock-v1';
const SESSION_KEY = 'miwacare-admin-session';

function load(): Seed {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Seed;
  } catch {
    /* bỏ qua: trình duyệt chặn bộ nhớ */
  }
  return buildSeed();
}

let db: Seed = load();

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  } catch {
    /* bỏ qua */
  }
}

/** Xoá dữ liệu đã sửa, về lại dữ liệu mẫu ban đầu. */
export function resetMockData() {
  db = buildSeed();
  save();
}

const wait = (ms = 180) => new Promise((r) => setTimeout(r, ms));
let seq = Date.now();
const uid = (p: string) => `${p}_${(seq++).toString(36)}`;
const nowIso = () => new Date().toISOString();

export class ApiError extends Error {}

// ---------- Phiên đăng nhập & phân quyền (F-70) ----------
const ROLE_ORDER: Role[] = ['viewer', 'editor', 'admin'];
export const can = (role: Role | undefined, min: Role) => !!role && ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(min);

let memSession: Session | null = null; // dự phòng khi trình duyệt chặn sessionStorage

export function getSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : memSession;
  } catch {
    return memSession;
  }
}

/** Chỉ dùng cho bản demo: vào thẳng với vai đã chọn, không cần mật khẩu. */
export function setDemoRole(role: Role): Session {
  memSession = { email: 'demo@miwacare.vn', role };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(memSession));
  } catch {
    /* bỏ qua */
  }
  return memSession;
}

export async function login(email: string, password: string, role: Role): Promise<Session> {
  await wait(300);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError('Email chưa đúng định dạng');
  if (password.length < 6) throw new ApiError('Mật khẩu tối thiểu 6 ký tự');
  const s: Session = { email: email.trim().toLowerCase(), role };
  memSession = s;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* bỏ qua */
  }
  return s;
}

export function logout() {
  memSession = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* bỏ qua */
  }
}

function requireRole(min: Role): Session {
  const s = getSession();
  if (!can(s?.role, min)) throw new ApiError('Tài khoản của bạn không có quyền thực hiện thao tác này');
  return s!;
}

function audit(actor: string, action: string, target: string, detail = '') {
  db.audit.unshift({ id: uid('a'), actor, action, target, detail, at: nowIso() });
}

// ---------- Tính toán từ sổ điểm ----------
function currentRule() {
  return ruleAt(db.rules, nowIso());
}

function memberRow(id: string): MemberRow {
  const m = db.members.find((x) => x.id === id);
  if (!m) throw new ApiError('Không tìm thấy thành viên');
  let points = 0;
  let lifetime = 0;
  for (const l of db.ledger) {
    if (l.memberId !== id) continue;
    points += l.delta;
    // Điểm xét hạng = điểm được cộng (không tính điều chỉnh tay); đơn bị huỷ thì trừ lại.
    if (l.delta > 0 && l.reason !== 'adjust') lifetime += l.delta;
    else if (l.reason === 'adjust' && l.orderId) lifetime += l.delta;
  }
  const mine = db.orders.filter((o) => o.memberId === id && o.status !== 'cancelled');
  const last = mine.reduce<string | null>((acc, o) => (!acc || o.orderedAt > acc ? o.orderedAt : acc), null);
  return {
    ...m,
    points,
    lifetimePoints: lifetime,
    tier: tierProgress(lifetime, currentRule().tiers).current,
    orderCount: mine.length,
    lastOrderAt: last,
  };
}

const findByPhone = (phone: string) => db.members.find((m) => m.phone === phone) ?? null;

// ---------- Tổng quan (F-71) ----------
export async function getDashboard() {
  await wait();
  const rows = db.members.map((m) => memberRow(m.id));
  const now = Date.now();
  const d30 = now - 30 * 86_400_000;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const inMonth = (iso: string) => new Date(iso) >= monthStart;
  const tiers = currentRule().tiers;
  return {
    members: rows.length,
    newMembers30d: rows.filter((r) => new Date(r.createdAt).getTime() >= d30).length,
    marketingRate: rows.length ? rows.filter((r) => r.marketing).length / rows.length : 0,
    pointsIssuedMonth: db.ledger.filter((l) => l.delta > 0 && inMonth(l.createdAt)).reduce((s, l) => s + l.delta, 0),
    pointsRedeemedMonth: -db.ledger.filter((l) => l.reason === 'redeem' && inMonth(l.createdAt)).reduce((s, l) => s + l.delta, 0),
    ordersMonth: db.orders.filter((o) => o.status !== 'cancelled' && inMonth(o.orderedAt)).length,
    revenueMonth: db.orders.filter((o) => o.status === 'done' && inMonth(o.orderedAt)).reduce((s, o) => s + o.subtotal - o.discount, 0),
    tierCounts: tiers.map((t) => ({ tier: t, count: rows.filter((r) => r.tier.id === t.id).length })),
    unmatchedOrders: db.orders.filter((o) => !o.memberId).length,
    recentLedger: [...db.ledger].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map((l) => ({ ...l, memberName: db.members.find((m) => m.id === l.memberId)?.fullName ?? '' })),
  };
}

// ---------- Thành viên (F-72) ----------
export async function listMembers(filter: { q?: string; tierId?: string } = {}): Promise<MemberRow[]> {
  await wait();
  const q = filter.q?.trim().toLowerCase() ?? '';
  const digits = q.replace(/\D/g, '');
  return db.members
    .map((m) => memberRow(m.id))
    .filter((r) => (!filter.tierId || r.tier.id === filter.tierId) && (!q || r.fullName.toLowerCase().includes(q) || (digits.length >= 3 && r.phone.includes(digits))))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getMember(id: string) {
  await wait();
  const member = memberRow(id);
  return {
    member,
    progress: tierProgress(member.lifetimePoints, currentRule().tiers),
    ledger: db.ledger.filter((l) => l.memberId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    orders: db.orders.filter((o) => o.memberId === id).sort((a, b) => b.orderedAt.localeCompare(a.orderedAt)),
  };
}

/** Điều chỉnh điểm thủ công — bắt buộc ghi lý do, lưu nhật ký thao tác. */
export async function adjustPoints(memberId: string, delta: number, note: string) {
  const s = requireRole('admin');
  await wait();
  if (!Number.isInteger(delta) || delta === 0) throw new ApiError('Số điểm phải là số nguyên khác 0');
  if (note.trim().length < 5) throw new ApiError('Ghi rõ lý do điều chỉnh (tối thiểu 5 ký tự)');
  const row = memberRow(memberId);
  if (row.points + delta < 0) throw new ApiError(`Khách chỉ còn ${row.points} điểm, không thể trừ ${-delta}`);
  db.ledger.push({ id: uid('l'), memberId, delta, reason: 'adjust', title: delta > 0 ? 'Cộng điểm thủ công' : 'Trừ điểm thủ công', meta: note.trim(), createdBy: s.email, createdAt: nowIso() });
  audit(s.email, 'Điều chỉnh điểm', `${row.fullName} (${row.phone})`, `${delta > 0 ? '+' : ''}${delta} — ${note.trim()}`);
  save();
}

// ---------- Đơn hàng (nhập tay / CSV — trước khi có Pancake) ----------
export interface OrderInput {
  code: string;
  phone: string;
  orderedAt: string; // ISO
  subtotal: number;
  discount: number;
  channel: string;
  items: string;
  status: OrderStatus;
}

export async function listOrders(filter: { q?: string; status?: OrderStatus | ''; unmatched?: boolean } = {}) {
  await wait();
  const q = filter.q?.trim().toLowerCase() ?? '';
  return db.orders
    .filter((o) => (!filter.status || o.status === filter.status) && (!filter.unmatched || !o.memberId) && (!q || o.code.toLowerCase().includes(q) || o.phone.includes(q.replace(/\D/g, '') || '§')))
    .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt))
    .map((o) => ({ ...o, memberName: db.members.find((m) => m.id === o.memberId)?.fullName ?? null, points: db.ledger.find((l) => l.orderId === o.id && l.reason === 'order')?.delta ?? null }));
}

/** Xem trước: khớp khách theo SĐT và số điểm sẽ được cộng theo cấu hình hiện hành. */
export function previewOrder(input: Pick<OrderInput, 'phone' | 'orderedAt' | 'subtotal' | 'discount'>) {
  const phone = normalizeVnPhone(input.phone);
  const member = phone ? findByPhone(phone) : null;
  if (!member || !input.orderedAt || !(input.subtotal > 0)) return { phone, member: null as MemberRow | null, points: 0, ruleVersion: null as number | null };
  try {
    const rule = ruleAt(db.rules, input.orderedAt);
    const row = memberRow(member.id);
    const points = earnedPoints({ subtotal: input.subtotal, discount: input.discount, at: input.orderedAt }, row.tier.id, rule);
    return { phone, member: row, points, ruleVersion: rule.version };
  } catch {
    return { phone, member: memberRow(member.id), points: 0, ruleVersion: null };
  }
}

function awardOrder(o: AdminOrder, actor?: string) {
  if (!o.memberId || o.status !== 'done') return 0;
  if (db.ledger.some((l) => l.orderId === o.id && l.reason === 'order')) return 0; // một đơn chỉ cộng một lần
  const { points, ruleVersion } = previewOrder(o);
  if (points <= 0) return 0;
  db.ledger.push({ id: uid('l'), memberId: o.memberId, delta: points, reason: 'order', title: `Đơn hàng ${o.code}`, meta: o.channel, orderId: o.id, ruleVersion: ruleVersion ?? undefined, createdBy: actor, createdAt: nowIso() });
  return points;
}

function validateOrder(input: OrderInput) {
  const code = input.code.trim().startsWith('#') ? input.code.trim() : `#${input.code.trim()}`;
  if (code.length < 2) throw new ApiError('Thiếu mã đơn');
  if (db.orders.some((o) => o.code.toLowerCase() === code.toLowerCase())) throw new ApiError(`Mã đơn ${code} đã tồn tại`);
  const phone = normalizeVnPhone(input.phone);
  if (!phone) throw new ApiError('Số điện thoại không hợp lệ');
  if (!(input.subtotal > 0)) throw new ApiError('Tổng tiền phải lớn hơn 0');
  if (input.discount < 0 || input.discount > input.subtotal) throw new ApiError('Giảm giá không hợp lệ');
  if (Number.isNaN(new Date(input.orderedAt).getTime())) throw new ApiError('Ngày mua không hợp lệ');
  return { code, phone };
}

export async function createOrder(input: OrderInput) {
  const s = requireRole('editor');
  await wait();
  const { code, phone } = validateOrder(input);
  const member = findByPhone(phone);
  const o: AdminOrder = { id: uid('o'), code, memberId: member?.id ?? null, phone, status: input.status, channel: input.channel.trim() || 'Cửa hàng', items: input.items.trim(), subtotal: input.subtotal, discount: input.discount, orderedAt: input.orderedAt, source: 'admin', createdAt: nowIso() };
  db.orders.push(o);
  const pts = awardOrder(o, s.email);
  audit(s.email, 'Nhập đơn', code, `${phone}${member ? ` · ${member.fullName}` : ' · chưa có tài khoản app'}${pts ? ` · +${pts} điểm` : ''}`);
  save();
  return { order: o, points: pts };
}

/** Đổi trạng thái đơn: hoàn thành → cộng điểm; huỷ đơn đã cộng → trừ lại đúng số điểm. */
const STATUS_VI: Record<OrderStatus, string> = { done: 'Hoàn thành', shipping: 'Đang giao', cancelled: 'Đã huỷ' };

export async function setOrderStatus(id: string, status: OrderStatus) {
  const s = requireRole('editor');
  await wait();
  const o = db.orders.find((x) => x.id === id);
  if (!o) throw new ApiError('Không tìm thấy đơn');
  if (o.status === status) return;
  if (o.status === 'cancelled') throw new ApiError('Đơn đã huỷ không đổi lại được — hãy nhập đơn mới');
  const earned = db.ledger.find((l) => l.orderId === o.id && l.reason === 'order');
  o.status = status;
  let note = '';
  if (status === 'done') {
    const pts = awardOrder(o, s.email);
    if (pts) note = ` · +${pts} điểm`;
  } else if (status === 'cancelled' && earned && o.memberId && !db.ledger.some((l) => l.orderId === o.id && l.reason === 'adjust')) {
    db.ledger.push({ id: uid('l'), memberId: o.memberId, delta: -earned.delta, reason: 'adjust', title: `Huỷ đơn ${o.code}`, meta: 'Trừ lại điểm đã cộng', orderId: o.id, createdBy: s.email, createdAt: nowIso() });
    note = ` · −${earned.delta} điểm`;
  }
  audit(s.email, 'Đổi trạng thái đơn', o.code, `→ ${STATUS_VI[status]}${note}`);
  save();
}

/** Gắn đơn chưa khớp vào thành viên (khi khách đăng ký app sau khi mua). */
export async function rematchOrders() {
  const s = requireRole('editor');
  await wait();
  let matched = 0;
  let pts = 0;
  for (const o of db.orders) {
    if (o.memberId) continue;
    const m = findByPhone(o.phone);
    if (!m) continue;
    o.memberId = m.id;
    matched++;
    pts += awardOrder(o, s.email);
  }
  if (matched) audit(s.email, 'Ghép đơn theo SĐT', `${matched} đơn`, `+${pts} điểm`);
  save();
  return { matched, points: pts };
}

export interface ImportRowResult {
  line: number;
  input: OrderInput | null;
  error: string | null;
  memberName: string | null;
  points: number;
}

/** Kiểm tra từng dòng CSV trước khi nhập (không ghi gì). */
export function checkImport(rows: OrderInput[]): ImportRowResult[] {
  const seen = new Set<string>();
  return rows.map((input, i) => {
    try {
      const { code } = validateOrder(input);
      if (seen.has(code.toLowerCase())) throw new ApiError(`Trùng mã đơn ${code} trong file`);
      seen.add(code.toLowerCase());
      const p = previewOrder(input);
      return { line: i + 2, input, error: null, memberName: p.member?.fullName ?? null, points: input.status === 'done' ? p.points : 0 };
    } catch (e) {
      return { line: i + 2, input, error: (e as Error).message, memberName: null, points: 0 };
    }
  });
}

export async function importOrders(rows: OrderInput[]) {
  const s = requireRole('editor');
  await wait(400);
  const checked = checkImport(rows).filter((r) => !r.error && r.input);
  let pts = 0;
  for (const r of checked) {
    const input = r.input!;
    const { code, phone } = validateOrder(input);
    const member = findByPhone(phone);
    const o: AdminOrder = { id: uid('o'), code, memberId: member?.id ?? null, phone, status: input.status, channel: input.channel || 'Cửa hàng', items: input.items, subtotal: input.subtotal, discount: input.discount, orderedAt: input.orderedAt, source: 'import', createdAt: nowIso() };
    db.orders.push(o);
    pts += awardOrder(o, s.email);
  }
  audit(s.email, 'Nhập đơn từ CSV', `${checked.length} đơn`, `+${pts} điểm`);
  save();
  return { imported: checked.length, skipped: rows.length - checked.length, points: pts };
}

// ---------- Cấu hình điểm & hạng (Q-05) ----------
export async function getRules() {
  await wait();
  return { versions: [...db.rules].sort((a, b) => b.version - a.version), current: currentRule() };
}

/** Lưu cấu hình mới thành MỘT PHIÊN BẢN MỚI — không sửa phiên bản cũ, đơn cũ vẫn tính theo luật cũ. */
export async function saveRuleVersion(draft: Omit<LoyaltyRuleVersion, 'version'>) {
  const s = requireRole('admin');
  await wait();
  if (!(draft.earn.amountPerPoint >= 1000)) throw new ApiError('Số tiền cho 1 điểm tối thiểu 1.000đ');
  if (!(draft.redeemValue > 0)) throw new ApiError('Giá trị quy đổi 1 điểm phải lớn hơn 0');
  const tiers: Tier[] = [...draft.tiers].sort((a, b) => a.minPoints - b.minPoints);
  if (tiers[0]?.minPoints !== 0) throw new ApiError('Hạng thấp nhất phải bắt đầu từ 0 điểm');
  if (tiers.some((t) => !t.name.trim())) throw new ApiError('Hạng nào cũng cần có tên');
  if (new Set(tiers.map((t) => t.minPoints)).size !== tiers.length) throw new ApiError('Mốc điểm các hạng không được trùng nhau');
  const latest = Math.max(...db.rules.map((r) => r.version));
  const prev = db.rules.find((r) => r.version === latest)!;
  if (new Date(draft.effectiveFrom) < new Date(prev.effectiveFrom)) throw new ApiError('Ngày hiệu lực phải sau phiên bản trước');
  const v: LoyaltyRuleVersion = { ...draft, tiers, version: latest + 1 };
  db.rules.push(v);
  audit(s.email, 'Lưu cấu hình điểm', `Phiên bản ${v.version}`, `Hiệu lực từ ${new Date(v.effectiveFrom).toLocaleString('vi-VN')}`);
  save();
  return v;
}

// ---------- Ưu đãi ----------
export async function listOffers() {
  await wait();
  return [...db.offers];
}

export async function createOffer(input: Omit<AdminOffer, 'id'>) {
  const s = requireRole('editor');
  await wait();
  if (!input.title.trim()) throw new ApiError('Thiếu tiêu đề ưu đãi');
  if (!input.value.trim()) throw new ApiError('Thiếu giá trị hiển thị (ví dụ −50K, 500)');
  if (input.kind === 'redeem' && !(input.pointsCost && input.pointsCost > 0)) throw new ApiError('Ưu đãi đổi điểm cần số điểm');
  const o: AdminOffer = { ...input, id: uid('of') };
  db.offers.unshift(o);
  audit(s.email, 'Tạo ưu đãi', o.title);
  save();
  return o;
}

export async function deleteOffer(id: string) {
  const s = requireRole('editor');
  await wait();
  if (db.programs.some((p) => p.giftOfferId === id && p.status !== 'ended')) throw new ApiError('Ưu đãi đang là quà của một chương trình đang chạy');
  const o = db.offers.find((x) => x.id === id);
  db.offers = db.offers.filter((x) => x.id !== id);
  if (o) audit(s.email, 'Xoá ưu đãi', o.title);
  save();
}

// ---------- Chương trình & mã QR (F-81) ----------
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ 0/O, 1/I cho dễ đọc
export function randomCode() {
  let s = 'MIWA-';
  const buf = new Uint32Array(6);
  crypto.getRandomValues(buf);
  buf.forEach((n) => (s += CODE_CHARS[n % CODE_CHARS.length]));
  return s;
}

export async function listPrograms() {
  await wait();
  return [...db.programs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((p) => ({ ...p, gift: db.offers.find((o) => o.id === p.giftOfferId) ?? null }));
}

export async function getProgram(id: string) {
  await wait();
  const p = db.programs.find((x) => x.id === id);
  if (!p) throw new ApiError('Không tìm thấy chương trình');
  return { ...p, gift: db.offers.find((o) => o.id === p.giftOfferId) ?? null };
}

export interface ProgramInput {
  name: string;
  place: string;
  startsAt: string;
  endsAt: string;
  giftOfferId: string | null;
  maxClaims: number | null;
  code: string;
}

export async function createProgram(input: ProgramInput) {
  const s = requireRole('editor');
  await wait();
  if (!input.name.trim()) throw new ApiError('Thiếu tên chương trình');
  if (!input.startsAt || !input.endsAt || new Date(input.endsAt) <= new Date(input.startsAt)) throw new ApiError('Thời gian kết thúc phải sau thời gian bắt đầu');
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{8,32}$/.test(code)) throw new ApiError('Mã gồm 8–32 ký tự: chữ in hoa, số, dấu gạch ngang');
  if (db.programs.some((p) => p.codes.some((c) => c.code === code))) throw new ApiError(`Mã ${code} đã được dùng`);
  const p: Program = { id: uid('pg'), name: input.name.trim(), place: input.place.trim(), startsAt: input.startsAt, endsAt: input.endsAt, giftOfferId: input.giftOfferId, maxClaims: input.maxClaims, status: 'active', codes: [{ code, singleUse: false, usedCount: 0 }], claims: 0, createdAt: nowIso() };
  db.programs.push(p);
  audit(s.email, 'Tạo chương trình', p.name, `Mã ${code}${p.maxClaims ? `, tối đa ${p.maxClaims} lượt` : ''}`);
  save();
  return p;
}

export async function addProgramCode(programId: string, code = randomCode()): Promise<ProgramCode> {
  const s = requireRole('editor');
  await wait();
  const p = db.programs.find((x) => x.id === programId);
  if (!p) throw new ApiError('Không tìm thấy chương trình');
  if (db.programs.some((x) => x.codes.some((c) => c.code === code))) throw new ApiError('Mã đã tồn tại, thử lại');
  const c = { code, singleUse: false, usedCount: 0 };
  p.codes.push(c);
  audit(s.email, 'Thêm mã chương trình', p.name, code);
  save();
  return c;
}

export async function endProgram(id: string) {
  const s = requireRole('editor');
  await wait();
  const p = db.programs.find((x) => x.id === id);
  if (!p) throw new ApiError('Không tìm thấy chương trình');
  p.status = 'ended';
  audit(s.email, 'Kết thúc chương trình', p.name);
  save();
}

// ---------- Nhật ký (F-79) ----------
export async function listAudit(): Promise<AuditLog[]> {
  await wait();
  return [...db.audit];
}

export type { LedgerRow };
