// Truy cập dữ liệu bài viết. Đọc/ghi bài trực tiếp (RLS: writer/editor/admin); gửi thông báo qua Edge Function `cms`.
import { IMAGE_BUCKET, supabase } from './supabase';

export type PostKind = 'article' | 'promo';
export interface Post {
  id: string;
  slug: string;
  kind: PostKind;
  title: string;
  excerpt: string;
  coverUrl: string;
  body: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
  offerId: string | null;
  updatedAt: string;
}
export type PostDraft = Omit<Post, 'id' | 'status' | 'publishedAt' | 'updatedAt'>;

export interface Campaign {
  id: string;
  kind: PostKind;
  title: string;
  body: string;
  sentAt: string;
  recipients: number;
  pushSent: number;
  pushFailed: number;
  postTitle: string | null;
}

export interface OfferOption {
  id: string;
  title: string;
}

type Row = Record<string, unknown>;

function must<T>(r: { data: T; error: { message: string; code?: string } | null }): T {
  if (r.error) {
    if (r.error.code === '23505') throw new Error('Đường dẫn (slug) này đã có bài khác dùng, hãy đổi đường dẫn');
    throw new Error(r.error.message);
  }
  return r.data;
}

const toPost = (r: Row): Post => ({
  id: String(r.id),
  slug: String(r.slug),
  kind: r.kind as PostKind,
  title: String(r.title),
  excerpt: String(r.excerpt ?? ''),
  coverUrl: String(r.cover_url ?? ''),
  body: String(r.body ?? ''),
  status: r.status as Post['status'],
  publishedAt: (r.published_at as string | null) ?? null,
  offerId: (r.offer_id as string | null) ?? null,
  updatedAt: String(r.updated_at),
});

const toRow = (p: PostDraft) => ({
  slug: p.slug,
  kind: p.kind,
  title: p.title.trim(),
  excerpt: p.excerpt.trim() || null,
  cover_url: p.coverUrl.trim() || null,
  body: p.body,
  offer_id: p.offerId || null,
});

export async function listPosts(): Promise<Post[]> {
  return (must(await supabase.from('posts').select('*').order('updated_at', { ascending: false }).limit(500)) ?? []).map(toPost);
}

export async function getPost(id: string): Promise<Post> {
  const r = must(await supabase.from('posts').select('*').eq('id', id).maybeSingle());
  if (!r) throw new Error('Không tìm thấy bài viết');
  return toPost(r);
}

export async function createPost(p: PostDraft, author: string): Promise<Post> {
  return toPost(must(await supabase.from('posts').insert({ ...toRow(p), author }).select('*').single())!);
}

export async function updatePost(id: string, p: PostDraft): Promise<Post> {
  return toPost(must(await supabase.from('posts').update(toRow(p)).eq('id', id).select('*').single())!);
}

export async function setPublished(id: string, publish: boolean, keepDate: string | null): Promise<Post> {
  const patch = publish ? { status: 'published', published_at: keepDate ?? new Date().toISOString() } : { status: 'draft' };
  return toPost(must(await supabase.from('posts').update(patch).eq('id', id).select('*').single())!);
}

export async function deletePost(id: string) {
  must(await supabase.from('posts').delete().eq('id', id));
}

export async function listOffers(): Promise<OfferOption[]> {
  return (must(await supabase.from('offers').select('id, title').order('created_at', { ascending: false })) ?? []).map((o: Row) => ({ id: String(o.id), title: String(o.title) }));
}

/** Tải ảnh lên kho công khai, trả về URL https. */
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Chỉ nhận file ảnh');
  if (file.size > 5 * 1024 * 1024) throw new Error('Ảnh tối đa 5 MB');
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const d = new Date();
  const path = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${ext}`;
  must(await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000' }));
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function call<T>(action: string, payload: Row = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('cms', { body: { action, payload } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const body = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null;
    throw new Error(body?.error ?? error.message);
  }
  return data as T;
}

export const audience = () => call<{ recipients: number; devices: number }>('audience');
export const sendNotification = (input: { postId: string | null; title: string; body: string }) =>
  call<{ recipients: number; pushSent: number; pushFailed: number }>('send', input);

export async function listCampaigns(): Promise<Campaign[]> {
  const rows = must(await supabase.from('campaigns').select('*, post:posts(title)').order('sent_at', { ascending: false }).limit(200)) ?? [];
  return rows.map((r: Row) => ({
    id: String(r.id),
    kind: r.kind as PostKind,
    title: String(r.title),
    body: String(r.body),
    sentAt: String(r.sent_at),
    recipients: Number(r.recipients),
    pushSent: Number(r.push_sent),
    pushFailed: Number(r.push_failed),
    postTitle: (r.post as { title?: string } | null)?.title ?? null,
  }));
}

/** "Mẹo chọn sữa cho bé 1 tuổi!" → "meo-chon-sua-cho-be-1-tuoi" */
export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
