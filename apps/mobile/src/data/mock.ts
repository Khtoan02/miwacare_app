// DỮ LIỆU MẪU cho giai đoạn phát triển (chưa có Pancake, chưa có Supabase).
// Tên hạng, quy tắc điểm, đơn hàng, ưu đãi đều là giá trị tạm — thay bằng cấu hình thật trên trang quản trị.
import type { InboxItem, LedgerEntry, LoyaltyRuleVersion, Member, Offer, Order } from '@/domain/types';

export const mockRules: LoyaltyRuleVersion[] = [
  {
    version: 1,
    effectiveFrom: '2026-01-01T00:00:00+07:00',
    earn: { amountPerPoint: 10_000, base: 'after_discount', rounding: 'floor' },
    tierMultipliers: { tier3: 1.2, tier4: 1.5 },
    weekdayMultipliers: { 0: 2, 6: 2 },
    birthdayBonus: 200,
    signupBonus: 50,
    redeemValue: 100,
    expiryMonths: null,
    tiers: [
      { id: 'tier1', name: 'Thành viên', minPoints: 0, colorKey: 'tier1' },
      { id: 'tier2', name: 'Hạng Bạc', minPoints: 500, colorKey: 'tier2' },
      { id: 'tier3', name: 'Hạng Vàng', minPoints: 1000, colorKey: 'tier3' },
      { id: 'tier4', name: 'Hạng Kim Cương', minPoints: 2000, colorKey: 'tier4' },
    ],
  },
];

export const mockMember: Member = {
  id: 'm_0001',
  fullName: 'Nguyễn Thu Hà',
  phone: '0912345678',
  points: 1250,
  lifetimePoints: 1250,
  tierId: 'tier3',
  updatedAt: '2026-11-24T14:05:00+07:00',
};

export const mockLedger: LedgerEntry[] = [
  { id: 'l8', at: '2026-11-24T10:12:00+07:00', delta: 38, reason: 'order', title: 'Đơn hàng #24118', meta: 'Cửa hàng Quận 7', ruleVersion: 1 },
  { id: 'l7', at: '2026-11-20T16:40:00+07:00', delta: -500, reason: 'redeem', title: 'Đổi voucher giảm 50K', meta: 'Tại quầy' },
  { id: 'l6', at: '2026-11-12T09:30:00+07:00', delta: 124, reason: 'order', title: 'Đơn hàng #23907', meta: 'Cửa hàng Quận 7', ruleVersion: 1 },
  { id: 'l5', at: '2026-11-05T08:00:00+07:00', delta: 200, reason: 'birthday', title: 'Thưởng sinh nhật', meta: 'Tự động' },
  { id: 'l4', at: '2026-10-28T19:05:00+07:00', delta: 86, reason: 'order', title: 'Đơn hàng #23310', meta: 'Đặt online', ruleVersion: 1 },
  { id: 'l3', at: '2026-10-15T11:20:00+07:00', delta: -430, reason: 'redeem', title: 'Đổi quà bình nước', meta: 'Tại quầy' },
  { id: 'l2', at: '2026-10-03T10:00:00+07:00', delta: 152, reason: 'order', title: 'Đơn hàng #22874', meta: 'Cửa hàng Quận 7', ruleVersion: 1 },
];

export const mockOrders: Order[] = [
  { id: 'o4', code: '#24118', at: '2026-11-24T10:12:00+07:00', status: 'done', items: 'Sữa MIWAKO 700g × 2, Bánh ăn dặm × 1', channel: 'Cửa hàng Quận 7', total: 1_240_000, pointsEarned: 38 },
  { id: 'o3', code: '#24092', at: '2026-11-23T20:15:00+07:00', status: 'shipping', items: 'Sữa MIWAKO A+ 700g × 1', channel: 'Đặt online', total: 685_000, pointsEarned: null },
  { id: 'o2', code: '#23907', at: '2026-11-12T09:30:00+07:00', status: 'done', items: 'Sữa MIWAKO 700g × 4', channel: 'Cửa hàng Quận 7', total: 2_480_000, pointsEarned: 124 },
  { id: 'o1', code: '#23650', at: '2026-11-02T18:45:00+07:00', status: 'cancelled', items: 'Sữa MIWAKO 400g × 1', channel: 'Đặt online', total: 365_000, pointsEarned: null },
];

export const mockOffers: Offer[] = [
  { id: 'v1', kind: 'mine', value: '−50K', unit: 'ĐƠN TỪ 500K', tone: 'sun', title: 'Voucher sinh nhật tháng 11', meta: 'Dùng tại cửa hàng và đặt online', tag: 'Còn 6 ngày', tagWarn: true, cta: 'Cách dùng', primary: true },
  { id: 'v2', kind: 'mine', value: '−10%', unit: 'TỐI ĐA 80K', tone: 'sky', title: 'Ưu đãi Hạng Vàng', meta: 'Áp dụng mọi sản phẩm sữa', tag: 'Đến 31/12', tagWarn: false, cta: 'Cách dùng', primary: true },
  { id: 'v3', kind: 'mine', value: 'x2', unit: 'ĐIỂM', tone: 'leaf', title: 'Nhân đôi điểm cuối tuần', meta: 'Tự động áp dụng thứ 7, CN', tag: 'Đang diễn ra', tagWarn: false, cta: 'Chi tiết', primary: false },
  { id: 'r1', kind: 'redeem', value: '500', unit: 'ĐIỂM', tone: 'lemon', title: 'Đổi voucher giảm 50K', meta: 'Đổi tại quầy, đọc số điện thoại', tag: 'Đủ điểm', tagWarn: false, cta: 'Cách đổi', primary: false },
  { id: 'r2', kind: 'redeem', value: '800', unit: 'ĐIỂM', tone: 'lemon', title: 'Đổi bình nước MIWAKO', meta: 'Số lượng có hạn', tag: 'Đủ điểm', tagWarn: false, cta: 'Cách đổi', primary: false },
  { id: 'r3', kind: 'redeem', value: '2.000', unit: 'ĐIỂM', tone: 'lemon', title: 'Đổi hộp sữa 700g', meta: 'Còn thiếu 750 điểm', tag: 'Chưa đủ', tagWarn: true, cta: 'Chi tiết', primary: false },
  { id: 'e1', kind: 'event', value: '7/12', unit: 'WORKSHOP', tone: 'sky', title: 'Dinh dưỡng cho bé 1–3 tuổi', meta: 'Cửa hàng Quận 7 · 9:00 sáng', tag: 'Còn chỗ', tagWarn: false, cta: 'Chi tiết', primary: true },
];

/** Mã chương trình mẫu để thử màn quét. */
export const mockProgramCodes: Record<string, 'ok' | 'expired' | 'exhausted'> = {
  'MIWA-WS0712': 'ok',
  'MIWA-TET2026': 'expired',
  'MIWA-FULL': 'exhausted',
};

/** OTP cố định khi chạy dữ liệu mẫu (giống số test của Supabase). */
export const MOCK_OTP = '123456';

/** Hộp thư mẫu. */
export const mockInbox: InboxItem[] = [
  { id: 'i3', kind: 'transaction', title: '+38 điểm từ đơn #24118', body: 'Cảm ơn bạn đã mua hàng tại Cửa hàng Quận 7.', at: '2026-11-24T10:13:00+07:00', read: false, slug: null },
  { id: 'i2', kind: 'promo', title: 'Nhân đôi điểm cuối tuần', body: 'Thứ 7 và Chủ nhật này, mọi đơn hàng được x2 điểm.', at: '2026-11-21T08:00:00+07:00', read: false, slug: null },
  { id: 'i1', kind: 'article', title: 'Bé 1 tuổi nên uống bao nhiêu sữa mỗi ngày?', body: 'Gợi ý lượng sữa và cách chia bữa cho bé 12–24 tháng.', at: '2026-11-15T09:00:00+07:00', read: true, slug: null },
];
