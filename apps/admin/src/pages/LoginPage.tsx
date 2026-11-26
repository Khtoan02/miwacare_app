import { useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router';

import type { Role } from '@/data/types';
import { useAuth } from '@/lib/auth';
import { roleLabel } from '@/lib/labels';
import { USE_MOCK } from '@/lib/supabase';
import { Button, Chips, ErrorBox, Field, Loading } from '@/ui/kit';

function Shell({ children, onSubmit }: { children: ReactNode; onSubmit: (e: FormEvent) => void }) {
  return (
    <div className="login">
      <form className="card stack" onSubmit={onSubmit}>
        <div className="row" style={{ gap: 12 }}>
          <div className="brand-logo">
            <img src={`${import.meta.env.BASE_URL}miwako-logo.png`} alt="" />
          </div>
          <div>
            <div className="brand-name">MiwaCare</div>
            <div className="muted small">Đăng nhập trang quản trị</div>
          </div>
        </div>
        {children}
      </form>
    </div>
  );
}

export default function LoginPage() {
  const { session, ready } = useAuth();
  if (!ready) return <Loading />;
  if (session) return <Navigate to="/" replace />;
  return USE_MOCK ? <MockLogin /> : <EmailLinkLogin />;
}

/** Bản thật: nhập email đã được cấp quyền → nhận link đăng nhập qua email. Không có mật khẩu. */
function EmailLinkLogin() {
  const { sendLink, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendLink(email);
      setSentTo(email.trim().toLowerCase());
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <Shell onSubmit={(e) => e.preventDefault()}>
        <div className="alert success">
          Đã gửi link đăng nhập tới <b>{sentTo}</b>. Mở email và bấm link — trang quản trị sẽ tự đăng nhập. Không thấy thư thì xem mục Spam.
        </div>
        <Button variant="outline" type="button" onClick={() => setSentTo(null)}>
          Gửi lại / đổi email
        </Button>
      </Shell>
    );
  }

  return (
    <Shell onSubmit={submit}>
      <Field label="Email quản trị" hint="Chỉ email đã được cấp quyền mới nhận được link.">
        <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <ErrorBox error={error ?? authError} />
      <Button type="submit" disabled={busy}>
        {busy ? 'Đang gửi…' : 'Gửi link đăng nhập'}
      </Button>
    </Shell>
  );
}

/** Bản dữ liệu mẫu: đăng nhập giả, chọn vai để thử quyền. */
function MockLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@miwacare.vn');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('admin');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password, role);
      nav('/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell onSubmit={submit}>
      <Field label="Email">
        <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Mật khẩu" hint="Bản dữ liệu mẫu: nhập mật khẩu bất kỳ từ 6 ký tự.">
        <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      <Field label="Đăng nhập với vai (chỉ để thử)" hint="Bản thật: vai lấy từ bảng admin_users.">
        <Chips value={role} onChange={setRole} options={(['admin', 'editor', 'viewer'] as Role[]).map((r) => ({ value: r, label: roleLabel[r] }))} />
      </Field>
      <ErrorBox error={error} />
      <Button type="submit" disabled={busy}>
        {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </Button>
    </Shell>
  );
}
