// Trang chủ blog: danh sách bài đã đăng, lọc theo loại (?loai=cam-nang | khuyen-mai).
import { esc, html, isApp, kindLabel, layout, query, vnDate, type Env, type PostRow } from './_lib/page';

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const url = new URL(request.url);
  const loai = url.searchParams.get('loai');
  const kind = loai === 'khuyen-mai' ? 'promo' : loai === 'cam-nang' ? 'article' : null;
  let posts: PostRow[] = [];
  let failed = false;
  try {
    posts = await query<PostRow[]>(
      env,
      `posts?select=slug,kind,title,excerpt,cover_url,published_at,updated_at&status=eq.published&published_at=lte.${new Date().toISOString()}${kind ? `&kind=eq.${kind}` : ''}&order=published_at.desc&limit=60`,
    );
  } catch {
    failed = true;
  }
  const app = isApp(url);
  const q = app ? '?app=1' : '';
  const tab = (k: string | null, label: string) =>
    `<a class="tab${loai === k ? ' on' : ''}" href="/${k ? `?loai=${k}${app ? '&app=1' : ''}` : q}">${label}</a>`;
  const cards = posts
    .map(
      (p) => `<a class="card" href="/bai-viet/${esc(p.slug)}${q}">
  ${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="" loading="lazy" />` : '<div class="cover-ph"></div>'}
  <div class="card-body">
    <span class="kind ${p.kind}">${kindLabel[p.kind]}</span>
    <h2>${esc(p.title)}</h2>
    ${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ''}
    <time datetime="${esc(p.published_at)}">${vnDate(p.published_at)}</time>
  </div>
</a>`,
    )
    .join('\n');
  const body = `<h1 class="page-title">Cẩm nang &amp; ưu đãi</h1>
<nav class="tabs">${tab(null, 'Tất cả')}${tab('cam-nang', 'Cẩm nang')}${tab('khuyen-mai', 'Khuyến mãi')}</nav>
${failed ? '<div class="empty">Chưa tải được bài viết. Vui lòng thử lại sau.</div>' : posts.length ? `<div class="grid">${cards}</div>` : '<div class="empty">Chưa có bài viết nào.</div>'}`;
  return html(layout({ title: 'MiwaCare', description: 'Cẩm nang chăm sóc bé, tin tức và chương trình ưu đãi dành cho thành viên MiwaCare.', url, app, body }), failed ? 503 : 200);
};
