import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';

import type { Role } from '@/data/types';
import { useAuth } from '@/lib/auth';
import { roleLabel } from '@/lib/labels';
import { Button, Chips, ErrorBox, Field } from '@/ui/kit';

export default function LoginPage() {
  const { session, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@miwacare.vn');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('admin');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

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
    <div className="login">
      <form className="card stack" onSubmit={submit}>
        <div className="row" style={{ gap: 12 }}>
          <div className="brand-logo">
            <img src={`${import.meta.env.BASE_URL}miwako-logo.png`} alt="" />
          </div>
          <div>
            <div className="brand-name">MiwaCare</div>
            <div className="muted small">Đăng nhập trang quản trị</div>
          </div>
        </div>
        <Field label="Email">
          <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Mật khẩu" hint="Bản dữ liệu mẫu: nhập mật khẩu bất kỳ từ 6 ký tự.">
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Field label="Đăng nhập với vai (chỉ để thử)" hint="Bản thật: vai lấy từ bảng admin_users, đăng nhập có thêm mã 2 lớp (2FA).">
          <Chips value={role} onChange={setRole} options={(['admin', 'editor', 'viewer'] as Role[]).map((r) => ({ value: r, label: roleLabel[r] }))} />
        </Field>
        <ErrorBox error={error} />
        <Button type="submit" disabled={busy}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>
    </div>
  );
}
