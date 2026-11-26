import {
  Gift,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Newspaper,
  QrCode,
  ScrollText,
  Settings2,
  ShoppingBag,
  Users,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router';

import { resetMockData } from '@/data/api.mock';
import { useAuth } from '@/lib/auth';
import { roleLabel } from '@/lib/labels';
import { Badge, Button, Loading } from '@/ui/kit';
import type { Role } from '@/data/types';
import { ask, IS_DEMO } from '@/lib/env';
import { USE_MOCK } from '@/lib/supabase';

const NAV = [
  { group: 'Khách hàng', items: [
    { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
    { to: '/members', label: 'Thành viên', icon: Users },
    { to: '/orders', label: 'Đơn hàng', icon: ShoppingBag },
  ] },
  { group: 'Chương trình', items: [
    { to: '/rules', label: 'Điểm & hạng', icon: Settings2 },
    { to: '/offers', label: 'Ưu đãi', icon: Gift },
    { to: '/programs', label: 'Chương trình & mã QR', icon: QrCode },
  ] },
  { group: 'Hệ thống', items: [{ to: '/audit', label: 'Nhật ký thao tác', icon: ScrollText }] },
];

// Có trong tài liệu nhưng làm ở giai đoạn sau (cần push / nội dung).
const LATER = [
  { label: 'Phân khúc', icon: UsersRound },
  { label: 'Bài viết', icon: Newspaper },
  { label: 'Chiến dịch', icon: Megaphone },
];

export function Layout() {
  const { session, ready, logout, switchRole } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  if (!ready) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="shell">
      <aside className={`side${open ? ' open' : ''}`} aria-label="Menu chính">
        <div className="brand">
          <div className="brand-logo">
            <img src={`${import.meta.env.BASE_URL}miwako-logo.png`} alt="" />
          </div>
          <div>
            <div className="brand-name">MiwaCare</div>
            <div className="muted small">Trang quản trị</div>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="nav-group">{g.group}</div>
              {g.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}>
                  <Icon size={18} aria-hidden /> {label}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="nav-group">Giai đoạn sau</div>
          {LATER.map(({ label, icon: Icon }) => (
            <div key={label} className="soon" aria-disabled="true">
              <Icon size={18} aria-hidden /> {label} <small>Sắp có</small>
            </div>
          ))}
        </nav>
      </aside>
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 15, background: 'rgba(0,0,0,.3)' }} />}

      <div className="main">
        <header className="topbar">
          <Button variant="ghost" className="btn-icon menu-btn" aria-label="Mở menu" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </Button>
          <div className="grow" />
          {!IS_DEMO && (
            <span className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {session.email}
            </span>
          )}
          {IS_DEMO ? (
            <label className="row small" style={{ fontWeight: 600 }}>
              Xem với vai
              <select className="select" style={{ minHeight: 30, padding: '2px 8px', width: 'auto' }} value={session.role} onChange={(e) => switchRole(e.target.value as Role)}>
                {(['admin', 'editor', 'viewer'] as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {roleLabel[r]}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <Badge>{roleLabel[session.role]}</Badge>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut size={14} /> Đăng xuất
              </Button>
            </>
          )}
        </header>
        {USE_MOCK && (
        <div className="mock-banner">
          {IS_DEMO ? 'BẢN DEMO — dữ liệu mẫu, không có dữ liệu thật. Thay đổi chỉ lưu trên trình duyệt của bạn.' : 'Đang dùng DỮ LIỆU MẪU — chưa nối Supabase. Mọi thay đổi chỉ lưu trên trình duyệt này.'}{' '}
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              if (!ask('Xoá mọi thay đổi đã thử và về lại dữ liệu mẫu ban đầu?')) return;
              resetMockData();
              location.reload();
            }}>
            Khôi phục dữ liệu mẫu
          </button>
        </div>
        )}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
