// Trang blog công khai (apps/blog, Cloudflare Pages). App mở bài bằng WebView với ?app=1 (ẩn đầu/chân trang).
export const BLOG_URL = (process.env.EXPO_PUBLIC_BLOG_URL ?? 'https://miwacare-blog.pages.dev').replace(/\/$/, '');

export const blogPostUrl = (slug: string) => `${BLOG_URL}/bai-viet/${encodeURIComponent(slug)}?app=1`;
export const blogHomeUrl = () => `${BLOG_URL}/?app=1`;
