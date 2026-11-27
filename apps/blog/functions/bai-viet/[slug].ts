// Trang một bài viết: /bai-viet/<slug>. Thêm ?app=1 khi mở trong app (ẩn đầu/chân trang).
import { renderMarkdown } from '../_lib/markdown';
import { esc, html, isApp, kindLabel, layout, notFound, query, vnDate, type Env, type PostRow } from '../_lib/page';

export const onRequestGet = async ({ request, env, params }: { request: Request; env: Env; params: { slug: string } }) => {
  const url = new URL(request.url);
  const slug = String(params.slug ?? '');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return notFound(url);
  let rows: PostRow[];
  try {
    rows = await query<PostRow[]>(env, `posts?select=slug,kind,title,excerpt,cover_url,body,published_at,updated_at&slug=eq.${slug}&status=eq.published&limit=1`);
  } catch {
    return html(layout({ title: 'Lỗi tải bài', description: '', url, app: isApp(url), body: '<div class="empty">Chưa tải được bài viết. Vui lòng thử lại sau.</div>' }), 503, 0);
  }
  const p = rows[0];
  if (!p || new Date(p.published_at) > new Date()) return notFound(url);
  const app = isApp(url);
  const body = `<article class="post">
  ${app ? '' : '<a class="back" href="/">← Tất cả bài viết</a>'}
  <span class="kind ${p.kind}">${kindLabel[p.kind]}</span>
  <h1>${esc(p.title)}</h1>
  <time datetime="${esc(p.published_at)}">${vnDate(p.published_at)}</time>
  ${p.cover_url ? `<img class="cover" src="${esc(p.cover_url)}" alt="" />` : ''}
  <div class="content">${renderMarkdown(p.body)}</div>
  ${app ? '' : '<div class="cta">Tích điểm và nhận ưu đãi thành viên với app <strong>MiwaCare</strong>.</div>'}
</article>`;
  return html(
    layout({ title: p.title, description: p.excerpt ?? p.title, url, image: p.cover_url, app, body, type: 'article' }),
    200,
    300,
  );
};
