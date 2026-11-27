// Edge Function `cms`: gửi thông báo từ trang quản lý blog (F-56, F-76).
// - Người gọi phải có vai writer / editor / admin (bảng admin_users).
// - Người nhận: khách đã đồng ý nhận tin (BR-10, hàm marketing_member_ids).
// - Mỗi khách nhận một dòng trong hộp thư; thiết bị bật "Tin ưu đãi và bài viết" nhận push qua Expo.
// - Token báo DeviceNotRegistered thì xoá khỏi bảng devices.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

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

const db: SupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new HttpError(500, r.error.message);
  return r.data;
}

async function writerFrom(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Chưa đăng nhập');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Phiên đăng nhập hết hạn, hãy đăng nhập lại');
  const row = must(await db.from('admin_users').select('role').eq('id', data.user.id).maybeSingle());
  if (!row || !['writer', 'editor', 'admin'].includes(row.role)) throw new HttpError(403, 'Tài khoản này không có quyền quản lý bài viết');
  return { id: data.user.id, email: data.user.email ?? data.user.id };
}

async function recipients() {
  const ids = (must(await db.rpc('marketing_member_ids')) as { member_id: string }[] | null ?? []).map((r) => r.member_id);
  const tokens: string[] = [];
  for (let i = 0; i < ids.length; i += 500) {
    const rows = must(await db.from('devices').select('push_token').in('member_id', ids.slice(i, i + 500)).eq('push_promo', true)) ?? [];
    tokens.push(...rows.map((r: { push_token: string }) => r.push_token));
  }
  return { ids, tokens };
}

interface SendInput {
  postId?: string | null;
  title: string;
  body: string;
}

async function send(actor: { id: string; email: string }, input: SendInput) {
  const title = String(input?.title ?? '').trim();
  const body = String(input?.body ?? '').trim();
  if (title.length < 3 || title.length > 80) throw bad('Tiêu đề thông báo cần 3–80 ký tự');
  if (body.length < 3 || body.length > 200) throw bad('Nội dung thông báo cần 3–200 ký tự');

  let post: { id: string; slug: string; kind: 'article' | 'promo'; status: string; published_at: string | null } | null = null;
  if (input.postId) {
    post = must(await db.from('posts').select('id, slug, kind, status, published_at').eq('id', input.postId).maybeSingle());
    if (!post) throw bad('Không tìm thấy bài viết');
    if (post.status !== 'published' || !post.published_at || new Date(post.published_at) > new Date()) throw bad('Hãy đăng bài trước khi gửi thông báo');
  }
  const kind = post?.kind ?? 'promo';
  const { ids, tokens } = await recipients();

  const campaign = must(await db.from('campaigns').insert({ post_id: post?.id ?? null, kind, title, body, sent_by: actor.id }).select('id').single());

  for (let i = 0; i < ids.length; i += 500) {
    must(await db.from('inbox').insert(ids.slice(i, i + 500).map((member_id) => ({ member_id, kind, title, body, post_id: post?.id ?? null, campaign_id: campaign.id }))));
  }

  // Expo Push: tối đa 100 tin mỗi lần gọi.
  let ok = 0;
  let failed = 0;
  const dead: string[] = [];
  const url = post ? `miwacare://bai-viet/${post.slug}` : 'miwacare://hop-thu';
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch.map((to) => ({ to, title, body, sound: 'default', channelId: 'news', data: { url, campaignId: campaign.id } }))),
    });
    const out = await res.json().catch(() => null);
    const tickets: { status: string; details?: { error?: string } }[] = out?.data ?? [];
    if (!res.ok || tickets.length !== batch.length) {
      failed += batch.length;
      console.error('expo push', res.status, JSON.stringify(out).slice(0, 500));
      continue;
    }
    tickets.forEach((t, j) => {
      if (t.status === 'ok') ok++;
      else {
        failed++;
        if (t.details?.error === 'DeviceNotRegistered') dead.push(batch[j]);
      }
    });
  }
  if (dead.length) must(await db.from('devices').delete().in('push_token', dead));

  must(await db.from('campaigns').update({ recipients: ids.length, push_sent: ok, push_failed: failed }).eq('id', campaign.id));
  must(await db.from('audit_logs').insert({ actor: actor.id, action: 'Gửi thông báo', target: title, detail: { text: `${ids.length} khách · ${ok} thiết bị nhận push${failed ? ` · ${failed} lỗi` : ''}`, email: actor.email } }));
  return { campaignId: campaign.id, recipients: ids.length, pushSent: ok, pushFailed: failed };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Chỉ nhận POST' }, 405);
  try {
    const actor = await writerFrom(req);
    const { action, payload } = (await req.json()) as { action: string; payload?: Record<string, unknown> };
    switch (action) {
      case 'audience': {
        const { ids, tokens } = await recipients();
        return json({ recipients: ids.length, devices: tokens.length });
      }
      case 'send':
        return json(await send(actor, payload as unknown as SendInput));
      default:
        return json({ error: 'Thao tác không hợp lệ' }, 400);
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error(e);
    return json({ error: status >= 500 ? 'Máy chủ gặp lỗi, thử lại sau' : (e as Error).message }, status);
  }
});
