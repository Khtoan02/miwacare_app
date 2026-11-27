// Phần dùng chung của trang blog công khai (Cloudflare Pages Functions).
// Đọc bài đã đăng từ Supabase bằng khoá publishable (RLS chỉ cho xem bài đã đăng).
export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export interface PostRow {
  slug: string;
  kind: 'article' | 'promo';
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  body: string;
  published_at: string;
  updated_at: string;
}

// Giá trị công khai (giống apps/mobile/eas.json); có thể ghi đè bằng biến môi trường của Pages.
const DEFAULT_URL = 'https://rbvbytqpsfqbspfnditx.supabase.co';
const DEFAULT_KEY = 'sb_publishable_ICPFWe-UEUfvwwny6rJQ4Q_ZEE7p8PO';

export async function query<T>(env: Env, path: string): Promise<T> {
  const url = env.SUPABASE_URL ?? DEFAULT_URL;
  const key = env.SUPABASE_ANON_KEY ?? DEFAULT_KEY;
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return (await res.json()) as T;
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function vnDate(iso: string) {
  const d = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

export const kindLabel = { article: 'Cẩm nang', promo: 'Khuyến mãi' } as const;

/** ?app=1: trang mở trong app MiwaCare (WebView) → ẩn đầu trang / chân trang. */
export function isApp(url: URL) {
  return url.searchParams.get('app') === '1';
}

export function layout(opts: { title: string; description: string; url: URL; image?: string | null; body: string; app: boolean; type?: 'website' | 'article' }) {
  const canonical = `${opts.url.origin}${opts.url.pathname}`;
  const fullTitle = opts.title === 'MiwaCare' ? 'MiwaCare — Cẩm nang & ưu đãi' : `${opts.title} · MiwaCare`;
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(opts.description)}" />
<link rel="canonical" href="${esc(canonical)}" />
<meta property="og:type" content="${opts.type ?? 'website'}" />
<meta property="og:site_name" content="MiwaCare" />
<meta property="og:title" content="${esc(opts.title)}" />
<meta property="og:description" content="${esc(opts.description)}" />
<meta property="og:url" content="${esc(canonical)}" />
${opts.image ? `<meta property="og:image" content="${esc(opts.image)}" />\n<meta name="twitter:card" content="summary_large_image" />` : ''}
<link rel="icon" type="image/png" href="/miwako-logo.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/tokens.css" />
<link rel="stylesheet" href="/styles.css" />
</head>
<body${opts.app ? ' class="in-app"' : ''}>
${
  opts.app
    ? ''
    : `<header class="site-head"><a href="/" class="brand"><img src="/miwako-logo.png" alt="" width="36" height="36" /><span>MiwaCare</span></a></header>`
}
<main class="wrap">${opts.body}</main>
${opts.app ? '' : `<footer class="site-foot">© ${new Date().getFullYear()} MiwaCare · Cẩm nang chăm sóc bé và ưu đãi dành cho thành viên</footer>`}
</body>
</html>`;
}

export function html(body: string, status = 200, cacheSeconds = 120) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': `public, max-age=60, s-maxage=${cacheSeconds}` },
  });
}

export function notFound(url: URL) {
  return html(
    layout({ title: 'Không tìm thấy bài viết', description: 'Bài viết không tồn tại hoặc đã được gỡ.', url, app: isApp(url), body: `<div class="empty"><h1>Không tìm thấy bài viết</h1><p>Bài viết không tồn tại hoặc đã được gỡ.</p><p><a href="/">Về trang chủ</a></p></div>` }),
    404,
    30,
  );
}
