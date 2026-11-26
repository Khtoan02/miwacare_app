// Lớp truy cập dữ liệu. Màn hình chỉ gọi các hàm ở đây, không biết dữ liệu đến từ đâu.
// EXPO_PUBLIC_DATA_SOURCE = 'mock' (mặc định) | 'supabase' (làm ở bước sau).
import type { ClaimResult, LedgerEntry, LoyaltyRuleVersion, Member, Offer, Order } from '@/domain/types';
import { mockLedger, mockMember, mockOffers, mockOrders, mockProgramCodes, mockRules, MOCK_OTP } from './mock';

const source = process.env.EXPO_PUBLIC_DATA_SOURCE ?? 'mock';

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function notYet(): never {
  throw new Error('Nguồn dữ liệu Supabase chưa được nối. Đặt EXPO_PUBLIC_DATA_SOURCE=mock.');
}

const claimed = new Set<string>();
let wrongAttempts: number[] = [];

export const api = {
  async sendOtp(phone: string): Promise<void> {
    if (source !== 'mock') notYet();
    void phone;
    await delay(undefined, 500);
  },

  async verifyOtp(phone: string, code: string): Promise<{ token: string }> {
    if (source !== 'mock') notYet();
    await delay(undefined, 500);
    if (code !== MOCK_OTP) throw new Error('otp_invalid');
    return { token: `mock-token-${phone}` };
  },

  async getMe(): Promise<Member> {
    if (source !== 'mock') notYet();
    return delay({ ...mockMember });
  },

  async getRules(): Promise<LoyaltyRuleVersion[]> {
    if (source !== 'mock') notYet();
    return delay(mockRules, 100);
  },

  async getLedger(): Promise<LedgerEntry[]> {
    if (source !== 'mock') notYet();
    return delay(mockLedger);
  },

  async getOrders(): Promise<Order[]> {
    if (source !== 'mock') notYet();
    return delay(mockOrders);
  },

  async getOffers(): Promise<Offer[]> {
    if (source !== 'mock') notYet();
    return delay(mockOffers);
  },

  /** Kiểm tra mã chương trình (sau này là Edge Function `program-claim`). */
  async claimProgramCode(raw: string): Promise<ClaimResult> {
    if (source !== 'mock') notYet();
    await delay(undefined, 600);
    const now = Date.now();
    wrongAttempts = wrongAttempts.filter((t) => now - t < 10 * 60_000);
    if (wrongAttempts.length >= 5) return { ok: false, reason: 'rate_limited' };

    const code = raw.trim().toUpperCase().replace(/^MIWACARE:\/\/P\//, '');
    const status = mockProgramCodes[code];
    if (!status) {
      wrongAttempts.push(now);
      return { ok: false, reason: 'invalid' };
    }
    if (status !== 'ok') return { ok: false, reason: status };
    if (claimed.has(code)) return { ok: false, reason: 'claimed' };
    claimed.add(code);
    return {
      ok: true,
      program: { name: 'Workshop Dinh dưỡng cho bé 1–3 tuổi', when: '07/12/2026', where: 'Cửa hàng Quận 7' },
      gift: { value: '−50K', title: 'Quà tham gia: voucher giảm 50K', note: 'Đã lưu vào Ưu đãi của bạn · HSD 31/12' },
    };
  },
};
