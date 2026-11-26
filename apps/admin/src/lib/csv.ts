// Đọc file CSV đơn hàng (xuất từ Excel / Google Sheets). Hỗ trợ dấu phẩy hoặc chấm phẩy, ô có ngoặc kép.
import type { OrderInput } from '@/data/api';
import type { OrderStatus } from '@/data/types';

export const CSV_HEADERS = ['ma_don', 'sdt', 'ngay_mua', 'tong_tien', 'giam_gia', 'kenh', 'san_pham', 'trang_thai'] as const;

export const CSV_TEMPLATE = [
  CSV_HEADERS.join(','),
  '24201,0912345678,26/11/2026 10:15,1240000,50000,Cửa hàng Quận 7,"Sữa MIWAKO 700g × 2",hoan_thanh',
  '24202,0987654321,26/11/2026 14:30,685000,0,Đặt online,"Sữa MIWAKO A+ 700g × 1",dang_giao',
].join('\n');

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const money = (s: string) => Number((s ?? '').replace(/[^\d]/g, '') || 0);

/** "26/11/2026 10:15" hoặc "2026-11-26 10:15" → ISO; trả về '' nếu không đọc được. */
function parseDate(s: string): string {
  const v = (s ?? '').trim();
  let m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 12), +(m[5] ?? 0)).toISOString();
  m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 12), +(m[5] ?? 0)).toISOString();
  return '';
}

const STATUS: Record<string, OrderStatus> = {
  hoan_thanh: 'done', 'hoàn thành': 'done', done: 'done', '': 'done',
  dang_giao: 'shipping', 'đang giao': 'shipping', shipping: 'shipping',
  da_huy: 'cancelled', 'đã huỷ': 'cancelled', 'đã hủy': 'cancelled', cancelled: 'cancelled',
};

export function parseOrdersCsv(text: string): { rows: OrderInput[]; error: string | null } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], error: 'File cần có dòng tiêu đề và ít nhất 1 dòng đơn hàng' };
  const sep = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const head = splitLine(lines[0], sep).map((h) => h.toLowerCase());
  const idx = Object.fromEntries(CSV_HEADERS.map((h) => [h, head.indexOf(h)]));
  const missing = (['ma_don', 'sdt', 'ngay_mua', 'tong_tien'] as const).filter((h) => idx[h] < 0);
  if (missing.length) return { rows: [], error: `Thiếu cột: ${missing.join(', ')}. Tải file mẫu để xem đúng định dạng.` };
  const get = (cells: string[], h: (typeof CSV_HEADERS)[number]) => (idx[h] >= 0 ? cells[idx[h]] ?? '' : '');
  const rows = lines.slice(1).map((line) => {
    const c = splitLine(line, sep);
    return {
      code: get(c, 'ma_don'),
      phone: get(c, 'sdt'),
      orderedAt: parseDate(get(c, 'ngay_mua')),
      subtotal: money(get(c, 'tong_tien')),
      discount: money(get(c, 'giam_gia')),
      channel: get(c, 'kenh'),
      items: get(c, 'san_pham'),
      status: STATUS[get(c, 'trang_thai').toLowerCase()] ?? 'done',
    };
  });
  return { rows, error: null };
}
