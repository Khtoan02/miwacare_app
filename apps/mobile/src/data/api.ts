// Lớp truy cập dữ liệu. Màn hình chỉ gọi các hàm ở đây, không biết dữ liệu đến từ đâu.
// EXPO_PUBLIC_DATA_SOURCE = 'mock' (mặc định, dữ liệu mẫu bên dưới) | 'supabase' (api.remote.ts).
import type { ClaimResult, LedgerEntry, LoyaltyRuleVersion, Member, Offer, Order } from '@/domain/types';
import { DATA_SOURCE } from '@/lib/supabase';
import { remoteApi } from './api.remote';
import { mockLedger, mockMember, mockOffers, mockOrders, mockProgramCodes, mockRules, MOCK_OTP } from './mock';

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const claimed = new Set<string>();
let wrongAttempts: number[] = [];

const mockApi = {
  async sendOtp(phone: string): Promise<void> {
    void phone;
    await delay(undefined, 500);
  },

  async verifyOtp(phone: string, code: string, marketing?: boolean): Promise<{ token: string }> {
    void marketing;
    await delay(undefined, 500);
    if (code !== MOCK_OTP) throw new Error('otp_invalid');
    return { token: `mock-token-${phone}` };
  },

  async getMe(): Promise<Member> {
    return delay({ ...mockMember });
  },

  async getRules(): Promise<LoyaltyRuleVersion[]> {
    return delay(mockRules, 100);
  },

  async getLedger(): Promise<LedgerEntry[]> {
    return delay(mockLedger);
  },

  async getOrders(): Promise<Order[]> {
    return delay(mockOrders);
  },

  async getOffers(): Promise<Offer[]> {
    return delay(mockOffers);
  },

  /** Kiểm tra mã chương trình (sau này là Edge Function `program-claim`). */
  async claimProgramCode(raw: string): Promise<ClaimResult> {
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

// Hai bản phải cùng chữ ký: sai lệch sẽ báo lỗi khi typecheck.
export const api: typeof mockApi = DATA_SOURCE === 'supabase' ? remoteApi : mockApi;
export const IS_MOCK = DATA_SOURCE === 'mock';
