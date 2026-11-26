// Điểm vào lớp dữ liệu của trang quản trị.
// - Đã cấu hình Supabase (.env ở gốc repo): dùng api.remote.ts (dữ liệu thật).
// - Bản demo hoặc chưa cấu hình: dùng api.mock.ts (dữ liệu mẫu trong trình duyệt).
// Hai bản phải cùng chữ ký hàm: khai báo `Impl` bên dưới bắt lỗi lúc biên dịch nếu lệch.
import { USE_MOCK } from '@/lib/supabase';

import * as mock from './api.mock';
import * as remote from './api.remote';

type Impl = Pick<
  typeof mock,
  | 'getDashboard'
  | 'listMembers'
  | 'getMember'
  | 'adjustPoints'
  | 'listOrders'
  | 'previewOrder'
  | 'createOrder'
  | 'setOrderStatus'
  | 'rematchOrders'
  | 'checkImport'
  | 'importOrders'
  | 'getRules'
  | 'saveRuleVersion'
  | 'listOffers'
  | 'createOffer'
  | 'deleteOffer'
  | 'randomCode'
  | 'listPrograms'
  | 'getProgram'
  | 'createProgram'
  | 'addProgramCode'
  | 'endProgram'
  | 'listAudit'
>;

const impl: Impl = USE_MOCK ? mock : remote;

export const {
  getDashboard,
  listMembers,
  getMember,
  adjustPoints,
  listOrders,
  previewOrder,
  createOrder,
  setOrderStatus,
  rematchOrders,
  checkImport,
  importOrders,
  getRules,
  saveRuleVersion,
  listOffers,
  createOffer,
  deleteOffer,
  randomCode,
  listPrograms,
  getProgram,
  createProgram,
  addProgramCode,
  endProgram,
  listAudit,
} = impl;

export { can, ApiError } from './api.mock';
export type { ImportRowResult, OrderInput, ProgramInput } from './api.mock';
export type { LedgerRow } from './types';
