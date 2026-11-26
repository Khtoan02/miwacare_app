// Chép code tính điểm dùng chung (apps/mobile/src/domain + format.ts) sang Edge Functions.
// Edge Functions chạy Deno: import phải có đuôi .ts và chỉ đóng gói file nằm trong supabase/functions,
// nên cần một bản sao. KHÔNG sửa bản sao — sửa ở apps/mobile rồi chạy lại: node scripts/sync-shared.mjs
// Chạy với --check để báo lỗi nếu bản sao đã cũ (dùng trước khi deploy / trong CI).
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'supabase/functions/_shared');
const files = [
  ['apps/mobile/src/domain/types.ts', 'domain/types.ts'],
  ['apps/mobile/src/domain/points.ts', 'domain/points.ts'],
  ['apps/mobile/src/lib/format.ts', 'format.ts'],
];
const header = (src) => `// TỰ SINH từ ${src} bằng scripts/sync-shared.mjs — đừng sửa tay.\n`;
const check = process.argv.includes('--check');
let stale = 0;

for (const [src, dst] of files) {
  const body = readFileSync(join(root, src), 'utf8').replace(/from '(\.\/[^']+?)'/g, "from '$1.ts'");
  const next = header(src) + body;
  const target = join(out, dst);
  const cur = existsSync(target) ? readFileSync(target, 'utf8') : null;
  if (cur === next) continue;
  stale++;
  if (check) {
    console.error(`Bản sao đã cũ: ${dst}`);
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, next);
  console.log(`Đã cập nhật ${dst}`);
}
if (check && stale) process.exit(1);
if (!stale) console.log('Bản sao đã khớp.');
