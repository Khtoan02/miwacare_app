import { BellRing, ExternalLink, FileText, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router';

import { AuthProvider, roleLabel, useAuth } from './lib/auth';
import { BLOG_URL } from './lib/supabase';
import CampaignsPage from './pages/CampaignsPage';
import EditorPage from './pages/EditorPage';
import LoginPage from './pages/LoginPage';
import PostsPage from './pages/PostsPage';
import { Badge, Button, Loading, ToastProvider } from './ui';

function Layout() {
  const { session, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!ready) return <div style={{ padding: 32 }}><Loading /></div>;
  if (!session) return <Navigate to="/login" replace />;
  return (
    <div className="shell">
      <aside className={`side${open ? ' open' : ''}`} aria-label="Menu chính">
        <div className="brand">
          <div className="brand-logo">
            <img src="/miwako-logo.png" alt="" />
          </div>
          <div>
            <div className="brand-name">MiwaCare</div>
            <div className="muted small">Bài viết &amp; thông báo</div>
          </div>
        </div>
        <nav className="nav" onClick={() => setOpen(false)}>
          <NavLink to="/" end>
            <FileText size={18} aria-hidden /> Bài viết
          </NavLink>
          <NavLink to="/thong-bao">
            <BellRing size={18} aria-hidden /> Thông báo đã gửi
          </NavLink>
          <a href={BLOG_URL} target="_blank" rel="noopener">
            <ExternalLink size={18} aria-hidden /> Xem trang blog
          </a>
        </nav>
      </aside>
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 15, background: 'rgba(0,0,0,.3)' }} />}
      <div className="main">
        <header className="topbar">
          <Button variant="ghost" className="btn-icon menu-btn" aria-label="Mở menu" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </Button>
          <div className="grow" />
          <span className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {session.email}
          </span>
          <Badge>{roleLabel[session.role]}</Badge>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut size={14} /> Đăng xuất
          </Button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<Layout />}>
              <Route index element={<PostsPage />} />
              <Route path="/bai-viet/moi" element={<EditorPage />} />
              <Route path="/bai-viet/:id" element={<EditorPage />} />
              <Route path="/thong-bao" element={<CampaignsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
