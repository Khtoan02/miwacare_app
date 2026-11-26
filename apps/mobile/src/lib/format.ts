const nf = new Intl.NumberFormat('vi-VN');

/** 1250 → "1.250" */
export function formatNumber(n: number) {
  return nf.format(n);
}

/** 1240000 → "1.240.000đ" */
export function formatVnd(n: number) {
  return `${nf.format(n)}đ`;
}

/** +38 / −500 (dấu trừ chuẩn) */
export function formatDelta(n: number) {
  return n >= 0 ? `+${nf.format(n)}` : `−${nf.format(Math.abs(n))}`;
}

/** "0912345678" → "0912 ••• 678" */
export function maskPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length < 7) return phone;
  return `${d.slice(0, 4)} ••• ${d.slice(-3)}`;
}

/** "0912345678" → "0912 345 678" */
export function prettyPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  return d.replace(/^(\d{4})(\d{3})(\d+)$/, '$1 $2 $3');
}

/** Chuẩn hoá SĐT Việt Nam về dạng 0xxxxxxxxx; trả về null nếu không hợp lệ. */
export function normalizeVnPhone(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('84')) d = `0${d.slice(2)}`;
  if (!d.startsWith('0')) d = `0${d}`;
  return /^0(3|5|7|8|9)\d{8}$/.test(d) ? d : null;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function formatDayMonth(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(iso: string) {
  const d = new Date(iso);
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}
