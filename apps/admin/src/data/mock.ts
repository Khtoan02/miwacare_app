// DỮ LIỆU MẪU cho giai đoạn phát triển (chưa có Supabase).
// Tên hạng, quy tắc điểm, khách hàng, đơn hàng đều là giá trị tạm — không phải dữ liệu thật.
// Sổ điểm được sinh từ đơn hàng bằng đúng hàm tính điểm của app, nên số dư luôn khớp.
import { earnedPoints, ruleAt } from '@domain/points';

import type { AdminMember, AdminOffer, AdminOrder, AuditLog, LedgerRow, LoyaltyRuleVersion, Program } from './types';

export const seedRules: LoyaltyRuleVersion[] = [
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

// Bộ sinh số giả ngẫu nhiên có hạt giống → lần nào chạy cũng ra cùng dữ liệu.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô'];
const DEM = ['Thu', 'Minh', 'Ngọc', 'Thanh', 'Hồng', 'Bảo', 'Phương', 'Thị', 'Văn', 'Gia'];
const TEN = ['Hà', 'Anh', 'Linh', 'Trang', 'Hương', 'Nam', 'Lan', 'Mai', 'Tú', 'Quỳnh', 'Hải', 'Vy'];
const PREFIX = ['091', '098', '097', '090', '093', '086', '088', '070', '035', '039'];
const CHANNELS = ['Cửa hàng Quận 7', 'Cửa hàng Thủ Đức', 'Đặt online', 'Zalo'];
const PRODUCTS = [
  ['Sữa MIWAKO 700g', 620_000],
  ['Sữa MIWAKO A+ 700g', 685_000],
  ['Sữa MIWAKO 400g', 365_000],
  ['Bánh ăn dặm', 120_000],
] as const;

export interface Seed {
  members: AdminMember[];
  orders: AdminOrder[];
  ledger: LedgerRow[];
  rules: LoyaltyRuleVersion[];
  offers: AdminOffer[];
  programs: Program[];
  audit: AuditLog[];
}

const iso = (d: Date) => d.toISOString();

export function buildSeed(now = new Date('2026-11-26T09:00:00+07:00')): Seed {
  const rand = rng(20261126);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const members: AdminMember[] = [];
  const orders: AdminOrder[] = [];
  const ledger: LedgerRow[] = [];
  let orderNo = 22000;
  let ledgerNo = 1;

  for (let i = 0; i < 48; i++) {
    const joined = new Date(now.getTime() - Math.floor(rand() * 320 + 2) * 86_400_000);
    const phone = pick(PREFIX) + String(Math.floor(rand() * 1e7)).padStart(7, '0');
    const m: AdminMember = {
      id: `m_${String(i + 1).padStart(4, '0')}`,
      fullName: i === 0 ? 'Nguyễn Thu Hà' : `${pick(HO)} ${pick(DEM)} ${pick(TEN)}`,
      phone: i === 0 ? '0912345678' : phone,
      birthday: rand() < 0.7 ? `19${80 + Math.floor(rand() * 20)}-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}` : null,
      createdAt: iso(joined),
      marketing: rand() < 0.62,
    };
    members.push(m);
    ledger.push({ id: `l${ledgerNo++}`, memberId: m.id, delta: seedRules[0].signupBonus, reason: 'signup', title: 'Thưởng đăng ký', meta: 'Tự động', createdAt: m.createdAt });

    // Đơn hàng: khách cũ mua nhiều hơn
    const n = Math.floor(rand() * 9);
    for (let k = 0; k < n; k++) {
      const at = new Date(joined.getTime() + rand() * (now.getTime() - joined.getTime()));
      const lines = 1 + Math.floor(rand() * 2);
      let subtotal = 0;
      const names: string[] = [];
      for (let l = 0; l < lines; l++) {
        const [name, price] = pick(PRODUCTS);
        const qty = 1 + Math.floor(rand() * 3);
        subtotal += price * qty;
        names.push(`${name} × ${qty}`);
      }
      const discount = rand() < 0.25 ? 50_000 : 0;
      const r = rand();
      const status = r < 0.85 ? 'done' : r < 0.93 ? 'shipping' : 'cancelled';
      const o: AdminOrder = {
        id: `o_${orderNo}`,
        code: `#${orderNo++}`,
        memberId: m.id,
        phone: m.phone,
        status,
        channel: pick(CHANNELS),
        items: names.join(', '),
        subtotal,
        discount,
        orderedAt: iso(at),
        source: 'import',
        createdAt: iso(at),
      };
      orders.push(o);
    }
  }

  // Cộng điểm cho đơn đã hoàn thành theo thứ tự thời gian (hạng tại thời điểm mua ảnh hưởng hệ số).
  const done = orders.filter((o) => o.status === 'done').sort((a, b) => a.orderedAt.localeCompare(b.orderedAt));
  const lifetime = new Map<string, number>(members.map((m) => [m.id, seedRules[0].signupBonus]));
  for (const o of done) {
    const rule = ruleAt(seedRules, o.orderedAt);
    const lt = lifetime.get(o.memberId!) ?? 0;
    const tierId = [...rule.tiers].sort((a, b) => b.minPoints - a.minPoints).find((t) => lt >= t.minPoints)?.id ?? 'tier1';
    const pts = earnedPoints({ subtotal: o.subtotal, discount: o.discount, at: o.orderedAt }, tierId, rule);
    if (pts > 0) {
      ledger.push({ id: `l${ledgerNo++}`, memberId: o.memberId!, delta: pts, reason: 'order', title: `Đơn hàng ${o.code}`, meta: o.channel, orderId: o.id, ruleVersion: rule.version, createdAt: o.orderedAt });
      lifetime.set(o.memberId!, lt + pts);
    }
  }

  // Vài lượt đổi điểm cho khách nhiều điểm
  for (const m of members) {
    const lt = lifetime.get(m.id) ?? 0;
    if (lt > 900 && rand() < 0.5) {
      ledger.push({ id: `l${ledgerNo++}`, memberId: m.id, delta: -500, reason: 'redeem', title: 'Đổi voucher giảm 50K', meta: 'Tại quầy', createdAt: iso(new Date(now.getTime() - Math.floor(rand() * 40) * 86_400_000)) });
    }
  }

  const offers: AdminOffer[] = [
    { id: 'of_1', kind: 'voucher', value: '−50K', unit: 'ĐƠN TỪ 500K', tone: 'sun', title: 'Voucher sinh nhật', body: 'Tặng khách trong tháng sinh nhật. Dùng tại cửa hàng và đặt online.', startsAt: null, endsAt: null, pointsCost: null, public: false },
    { id: 'of_2', kind: 'redeem', value: '500', unit: 'ĐIỂM', tone: 'lemon', title: 'Đổi voucher giảm 50K', body: 'Đổi tại quầy, đọc số điện thoại.', startsAt: null, endsAt: null, pointsCost: 500, public: true },
    { id: 'of_3', kind: 'redeem', value: '800', unit: 'ĐIỂM', tone: 'lemon', title: 'Đổi bình nước MIWAKO', body: 'Số lượng có hạn.', startsAt: null, endsAt: '2026-12-31T23:59:00+07:00', pointsCost: 800, public: true },
    { id: 'of_4', kind: 'event', value: '7/12', unit: 'WORKSHOP', tone: 'sky', title: 'Dinh dưỡng cho bé 1–3 tuổi', body: 'Cửa hàng Quận 7 · 9:00 sáng.', startsAt: '2026-12-07T09:00:00+07:00', endsAt: '2026-12-07T11:00:00+07:00', pointsCost: null, public: true },
    { id: 'of_5', kind: 'voucher', value: '−30K', unit: 'ĐƠN TỪ 300K', tone: 'leaf', title: 'Quà tham dự workshop', body: 'Dành cho khách đã quét mã tại workshop.', startsAt: null, endsAt: '2026-12-31T23:59:00+07:00', pointsCost: null, public: false },
  ];

  const programs: Program[] = [
    { id: 'pg_1', name: 'Workshop dinh dưỡng tháng 12', place: 'Cửa hàng Quận 7', startsAt: '2026-12-07T08:00:00+07:00', endsAt: '2026-12-07T12:00:00+07:00', giftOfferId: 'of_5', maxClaims: 60, status: 'active', codes: [{ code: 'MIWA-WS0712', singleUse: false, usedCount: 0 }], claims: 0, createdAt: '2026-11-20T10:00:00+07:00' },
    { id: 'pg_2', name: 'Tết 2026', place: 'Tất cả cửa hàng', startsAt: '2026-01-20T00:00:00+07:00', endsAt: '2026-02-10T23:59:00+07:00', giftOfferId: 'of_1', maxClaims: 200, status: 'ended', codes: [{ code: 'MIWA-TET2026', singleUse: false, usedCount: 143 }], claims: 143, createdAt: '2026-01-10T10:00:00+07:00' },
  ];

  const audit: AuditLog[] = [
    { id: 'a_2', actor: 'admin@miwacare.vn', action: 'Tạo chương trình', target: 'Workshop dinh dưỡng tháng 12', detail: 'Mã MIWA-WS0712, tối đa 60 lượt', at: '2026-11-20T10:00:00+07:00' },
    { id: 'a_1', actor: 'admin@miwacare.vn', action: 'Nhập đơn từ CSV', target: `${orders.length} đơn`, detail: 'Dữ liệu mẫu ban đầu', at: '2026-11-19T15:30:00+07:00' },
  ];

  return { members, orders, ledger, rules: seedRules, offers, programs, audit };
}
