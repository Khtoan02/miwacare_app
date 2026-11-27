// Biến CSS sinh từ design/tokens.json — dùng chung nguồn màu với app di động.
// Component chỉ dùng biến vai trò (var(--c-text)…), không viết HEX trực tiếp.
import tokens from '@design/tokens.json';

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

function vars(scheme: 'light' | 'dark') {
  return Object.entries(tokens.color[scheme])
    .map(([k, v]) => `--c-${kebab(k)}:${v};`)
    .join('');
}

function tierVars() {
  return Object.entries(tokens.tier)
    .map(([k, v]) => `--${k}-from:${v.from};--${k}-to:${v.to};--${k}-text:${v.text};`)
    .join('');
}

export function installTheme() {
  const css = `
:root{${vars('light')}${tierVars()}--r-sm:${tokens.radius.sm}px;--r-md:${tokens.radius.md}px;--r-lg:${tokens.radius.lg}px;color-scheme:light}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${vars('dark')}color-scheme:dark}}
:root[data-theme="dark"]{${vars('dark')}color-scheme:dark}`;
  const el = document.createElement('style');
  el.id = 'miwacare-tokens';
  el.textContent = css;
  document.head.prepend(el);
}
