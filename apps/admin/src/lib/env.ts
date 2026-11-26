// Bản DEMO (build với --mode demo): dùng để xem từ xa qua một link riêng tư.
// Không có màn đăng nhập, chỉ dữ liệu mẫu, đổi vai ngay trên thanh trên cùng.
export const IS_DEMO = import.meta.env.MODE === 'demo';

/** Hộp xác nhận. Trong bản demo (trang nhúng có thể chặn hộp thoại) thì coi như đồng ý. */
export function ask(message: string) {
  if (IS_DEMO) return true;
  return window.confirm(message);
}
