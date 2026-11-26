// Nhãn tiếng Việt cho các giá trị trong cơ sở dữ liệu.
import type { LedgerReason, OfferKind, OrderSource, OrderStatus, ProgramStatus, Role } from '@/data/types';

export const roleLabel: Record<Role, string> = { viewer: 'Chỉ xem', editor: 'Biên tập', admin: 'Quản trị' };

export const orderStatusLabel: Record<OrderStatus, string> = { done: 'Hoàn thành', shipping: 'Đang giao', cancelled: 'Đã huỷ' };
export const orderStatusTone = { done: 'success', shipping: 'warning', cancelled: 'danger' } as const;

export const orderSourceLabel: Record<OrderSource, string> = { admin: 'Nhập tay', import: 'Nhập CSV', pancake: 'Pancake' };

export const reasonLabel: Record<LedgerReason, string> = {
  order: 'Mua hàng',
  redeem: 'Đổi điểm',
  birthday: 'Sinh nhật',
  signup: 'Đăng ký',
  program: 'Chương trình',
  adjust: 'Điều chỉnh',
  expire: 'Hết hạn',
};

export const offerKindLabel: Record<OfferKind, string> = { voucher: 'Voucher', redeem: 'Đổi điểm', event: 'Sự kiện' };

export const programStatusLabel: Record<ProgramStatus, string> = { draft: 'Nháp', active: 'Đang chạy', ended: 'Đã kết thúc' };

export const weekdayLabel = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** ISO → giá trị cho <input type="datetime-local"> theo giờ máy. */
export function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromLocalInput(v: string) {
  return v ? new Date(v).toISOString() : '';
}
