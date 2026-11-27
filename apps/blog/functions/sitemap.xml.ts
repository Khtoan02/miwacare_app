// Sơ đồ trang cho Google: liệt kê mọi bài đã đăng.
import { esc, query, type Env } from './_lib/page';

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const origin = new URL(request.url).origin;
  const rows = await query<{ slug: string; updated_at: string }[]>(env, `posts?select=slug,updated_at&status=eq.published&published_at=lte.${new Date().toISOString()}&order=published_at.desc&limit=1000`).catch(() => []);
  const urls = [`<url><loc>${origin}/</loc></url>`, ...rows.map((r) => `<url><loc>${origin}/bai-viet/${esc(r.slug)}</loc><lastmod>${esc(r.updated_at)}</lastmod></url>`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
};
