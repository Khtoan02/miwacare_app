// Markdown → HTML cho phần xem trước. GIỮ GIỐNG apps/blog/functions/_lib/markdown.ts (trang blog công khai).
// An toàn: HTML viết tay bị hiển thị dưới dạng chữ; link chỉ nhận http(s), mailto, tel; ảnh chỉ nhận https.
import { Marked } from 'marked';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const okLink = (href: string) => /^(https?:|mailto:|tel:|#|\/)/i.test(href);

const md = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html({ text }) {
      return esc(text);
    },
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens);
      if (!okLink(href)) return label;
      const ext = /^https?:/i.test(href);
      return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
    },
    image({ href, title, text }) {
      if (!/^https:/i.test(href)) return esc(text);
      return `<img src="${esc(href)}" alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ''} loading="lazy" />`;
    },
  },
});

export function renderMarkdown(src: string): string {
  return md.parse(src ?? '', { async: false }) as string;
}
