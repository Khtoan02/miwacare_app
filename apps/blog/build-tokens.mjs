// Sinh public/tokens.css từ design/tokens.json (cùng nguồn màu với app và trang quản trị).
// Cloudflare Pages chạy file này làm "build command" của trang blog.
import { readFileSync, writeFileSync } from 'node:fs';

const tokens = JSON.parse(readFileSync(new URL('../../design/tokens.json', import.meta.url), 'utf8'));
const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const vars = (scheme) => Object.entries(tokens.color[scheme]).map(([k, v]) => `--c-${kebab(k)}:${v};`).join('');
const css = `/* Tự sinh bởi build-tokens.mjs — không sửa tay. */
:root{${vars('light')}--r-sm:${tokens.radius.sm}px;--r-md:${tokens.radius.md}px;--r-lg:${tokens.radius.lg}px;color-scheme:light}
@media (prefers-color-scheme: dark){:root{${vars('dark')}color-scheme:dark}}
`;
writeFileSync(new URL('./public/tokens.css', import.meta.url), css);
console.log('Đã sinh public/tokens.css');
