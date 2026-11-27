// Edge Function `member`: thao tác GHI của khách trong app di động.
// - onboard: chạy sau mỗi lần đăng nhập OTP (an toàn khi gọi lại): ghi đồng ý điều khoản / nhận tin,
//   ghép các đơn đã nhập trước đó theo SĐT, cộng điểm các đơn đã hoàn thành, thưởng đăng ký.
// - claimCode: nhận quà bằng mã chương trình (F-81), giới hạn 5 lần sai / 10 phút.
// Đọc dữ liệu thì app truy vấn thẳng (RLS chỉ cho khách thấy dòng của mình).
// Điểm tính bằng đúng hàm của app (bản sao trong _shared, sinh bởi scripts/sync-shared.mjs).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { earnedPoints, ruleAt, tierProgress } from '../_shared/domain/points.ts';
import type { ClaimResult, LoyaltyRuleVersion } from '../_shared/domain/types.ts';

const POLICY_VERSION = '2026-11-26';

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const db: SupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new HttpError(500, r.error.message);
  return r.data;
}

interface Me {
  id: string;
  phone: string;
}

/** Người gọi phải là khách đã đăng nhập bằng SĐT; tạo dòng members nếu trigger chưa tạo. */
async function meFrom(req: Request): Promise<Me> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Chưa đăng nhập');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Phiên đăng nhập hết hạn, hãy đăng nhập lại');
  const e164 = data.user.phone ?? '';
  if (!/^84[35789]\d{8}$/.test(e164)) throw new HttpError(403, 'Tài khoản này không đăng nhập bằng số điện thoại');
  const phone = `0${e164.slice(2)}`;
  const row = must(await db.from('members').select('id, phone, deleted_at').eq('id', data.user.id).maybeSingle());
  if (!row) {
    const ins = await db.from('members').insert({ id: data.user.id, phone });
    if (ins.error) throw new HttpError(409, 'Số điện thoại này đã gắn với một tài khoản khác. Liên hệ hỗ trợ.');
  } else if (row.deleted_at) {
    throw new HttpError(403, 'Tài khoản đã bị xoá');
  }
  return { id: data.user.id, phone };
}

async function loadRules(): Promise<LoyaltyRuleVersion[]> {
  const rows = must(await db.from('loyalty_rule_versions').select('version, effective_from, config'));
  return (rows ?? []).map((r) => ({ ...(r.config as Omit<LoyaltyRuleVersion, 'version' | 'effectiveFrom'>), version: r.version, effectiveFrom: r.effective_from }));
}

async function lifetimePoints(memberId: string): Promise<number> {
  const row = must(await db.from('v_admin_members').select('lifetime_points').eq('id', memberId).maybeSingle());
  return (row?.lifetime_points as number | undefined) ?? 0;
}

/** Cộng điểm một đơn đã hoàn thành — mỗi đơn một lần (unique(order_id, reason)). */
async function awardOrder(rules: LoyaltyRuleVersion[], memberId: string, o: { id: string; code: string; status: string; subtotal: number; discount: number; ordered_at: string; channel: string }) {
  if (o.status !== 'done' || rules.length === 0) return 0;
  let points = 0;
  let version: number | null = null;
  try {
    const rule = ruleAt(rules, o.ordered_at);
    const tier = tierProgress(await lifetimePoints(memberId), ruleAt(rules, new Date().toISOString()).tiers).current;
    points = earnedPoints({ subtotal: o.subtotal, discount: o.discount, at: o.ordered_at }, tier.id, rule);
    version = rule.version;
  } catch {
    return 0; // đơn trước ngày có quy tắc điểm
  }
  if (points <= 0) return 0;
  const { error } = await db.from('point_ledger').insert({ member_id: memberId, delta: points, reason: 'order', title: `Đơn hàng ${o.code}`, meta: o.channel, order_id: o.id, rule_version: version });
  if (error) {
    if (error.code === '23505') return 0;
    throw new HttpError(500, error.message);
  }
  return points;
}

async function latestConsent(memberId: string, purpose: 'terms' | 'marketing') {
  const row = must(await db.from('consents').select('granted').eq('member_id', memberId).eq('purpose', purpose).order('created_at', { ascending: false }).limit(1).maybeSingle());
  return row ? (row.granted as boolean) : null;
}

async function onboard(me: Me, payload: { marketing?: boolean; device?: string }) {
  // Đồng ý điều khoản là bắt buộc ở màn đăng nhập; nhận tin là tuỳ chọn.
  const device = String(payload?.device ?? '').slice(0, 40) || null;
  if ((await latestConsent(me.id, 'terms')) !== true) {
    must(await db.from('consents').insert({ member_id: me.id, purpose: 'terms', granted: true, policy_version: POLICY_VERSION, device }));
  }
  if (typeof payload?.marketing === 'boolean' && (await latestConsent(me.id, 'marketing')) !== payload.marketing) {
    must(await db.from('consents').insert({ member_id: me.id, purpose: 'marketing', granted: payload.marketing, policy_version: POLICY_VERSION, device }));
  }

  const rules = await loadRules();
  let points = 0;

  // Thưởng tải app (một lần).
  let current: LoyaltyRuleVersion | null = null;
  try {
    current = ruleAt(rules, new Date().toISOString());
  } catch {
    current = null; // chưa có quy tắc điểm
  }
  if (current && current.signupBonus > 0) {
    const had = must(await db.from('point_ledger').select('id').eq('member_id', me.id).eq('reason', 'signup').limit(1));
    if (!had?.length) {
      must(await db.from('point_ledger').insert({ member_id: me.id, delta: current.signupBonus, reason: 'signup', title: 'Thưởng tham gia MiwaCare', meta: 'Tự động', rule_version: current.version }));
      points += current.signupBonus;
    }
  }

  // Ghép đơn đã nhập trước khi khách có tài khoản (cùng SĐT), cộng điểm đơn hoàn thành.
  const orders = must(await db.from('orders').select('id, code, status, subtotal, discount, ordered_at, channel').eq('phone', me.phone).is('member_id', null).order('ordered_at').limit(1000)) ?? [];
  let linked = 0;
  for (const o of orders) {
    const upd = must(await db.from('orders').update({ member_id: me.id }).eq('id', o.id).is('member_id', null).select('id'));
    if (!upd?.length) continue;
    linked++;
    points += await awardOrder(rules, me.id, o);
  }
  if (linked || points) {
    must(await db.from('audit_logs').insert({ actor: me.id, action: 'Khách đăng nhập lần đầu', target: me.phone, detail: { text: `Ghép ${linked} đơn · +${points} điểm` } }));
  }
  return { linked, points };
}

const vnDate = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
};

async function claimCode(me: Me, raw: string): Promise<ClaimResult> {
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await db.from('code_attempts').select('id', { count: 'exact', head: true }).eq('member_id', me.id).eq('ok', false).gte('created_at', since);
  if ((count ?? 0) >= 5) return { ok: false, reason: 'rate_limited' };

  const code = String(raw ?? '').trim().toUpperCase().replace(/^MIWACARE:\/\/P\//, '');
  const fail = async (reason: 'invalid' | 'expired' | 'exhausted' | 'claimed', countsAsWrong: boolean): Promise<ClaimResult> => {
    if (countsAsWrong) must(await db.from('code_attempts').insert({ member_id: me.id, ok: false }));
    return { ok: false, reason };
  };
  if (code.length < 4 || code.length > 64) return fail('invalid', true);

  const row = must(await db.from('program_codes').select('code, single_use, used_count, program:programs(*, gift:offers(*))').eq('code', code).maybeSingle());
  const p = row?.program as Record<string, unknown> | undefined;
  if (!row || !p) return fail('invalid', true);

  const nowMs = Date.now();
  if (p.status === 'draft' || nowMs < new Date(p.starts_at as string).getTime()) return fail('invalid', true);
  if (p.status === 'ended' || nowMs > new Date(p.ends_at as string).getTime()) return fail('expired', false);

  const mine = must(await db.from('program_claims').select('program_id').eq('program_id', p.id).eq('member_id', me.id).maybeSingle());
  if (mine) return fail('claimed', false);
  if (row.single_use && row.used_count > 0) return fail('exhausted', false);
  if (p.max_claims != null) {
    const { count: claims } = await db.from('program_claims').select('member_id', { count: 'exact', head: true }).eq('program_id', p.id);
    if ((claims ?? 0) >= (p.max_claims as number)) return fail('exhausted', false);
  }

  const ins = await db.from('program_claims').insert({ program_id: p.id, member_id: me.id, code });
  if (ins.error) {
    if (ins.error.code === '23505') return fail('claimed', false);
    throw new HttpError(500, ins.error.message);
  }
  must(await db.from('program_codes').update({ used_count: (row.used_count as number) + 1 }).eq('code', code));
  must(await db.from('code_attempts').insert({ member_id: me.id, ok: true }));

  const gift = p.gift as Record<string, unknown> | null;
  if (gift) {
    const g = await db.from('member_offers').insert({ member_id: me.id, offer_id: gift.id });
    if (g.error && g.error.code !== '23505') throw new HttpError(500, g.error.message);
  }
  return {
    ok: true,
    program: { name: String(p.name), when: vnDate(p.starts_at as string), where: String(p.place ?? '') },
    gift: gift
      ? { value: String(gift.value), title: String(gift.title), note: `Đã lưu vào Ưu đãi của bạn${gift.ends_at ? ` · HSD ${vnDate(gift.ends_at as string).slice(0, 5)}` : ''}` }
      : { value: '✓', title: 'Đã ghi nhận tham gia', note: 'Cảm ơn bạn đã tham gia chương trình' },
  };
}

/** Lưu token push của máy (F-33). Một máy chỉ thuộc một khách: đăng nhập khách khác thì chuyển token sang khách đó. */
async function registerDevice(me: Me, p: { token?: string; platform?: string; pushPoints?: boolean; pushPromo?: boolean }) {
  const token = String(p?.token ?? '');
  if (!/^ExponentPushToken\[[A-Za-z0-9_-]+\]$/.test(token)) throw new HttpError(400, 'Token thông báo không hợp lệ');
  const platform = p?.platform === 'ios' || p?.platform === 'android' ? p.platform : 'android';
  const row: Record<string, unknown> = { member_id: me.id, push_token: token, platform, updated_at: new Date().toISOString() };
  if (typeof p?.pushPoints === 'boolean') row.push_points = p.pushPoints;
  if (typeof p?.pushPromo === 'boolean') row.push_promo = p.pushPromo;
  const saved = must(await db.from('devices').upsert(row, { onConflict: 'push_token' }).select('push_points, push_promo').single());
  return { pushPoints: saved.push_points as boolean, pushPromo: saved.push_promo as boolean };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Chỉ nhận POST' }, 405);
  try {
    const me = await meFrom(req);
    const { action, payload } = (await req.json()) as { action: string; payload?: Record<string, unknown> };
    switch (action) {
      case 'onboard':
        return json(await onboard(me, payload as { marketing?: boolean; device?: string }));
      case 'claimCode':
        return json(await claimCode(me, String(payload?.code ?? '')));
      case 'registerDevice':
        return json(await registerDevice(me, payload as { token?: string; platform?: string; pushPoints?: boolean; pushPromo?: boolean }));
      case 'unregisterDevice':
        must(await db.from('devices').delete().eq('member_id', me.id).eq('push_token', String(payload?.token ?? '')));
        return json({ ok: true });
      default:
        return json({ error: 'Thao tác không hợp lệ' }, 400);
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error(e);
    return json({ error: status >= 500 ? 'Máy chủ gặp lỗi, thử lại sau' : (e as Error).message }, status);
  }
});
