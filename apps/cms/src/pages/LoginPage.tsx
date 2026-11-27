import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';

import { useAuth } from '@/lib/auth';
import { Button, ErrorBox, Field } from '@/ui';

export default function LoginPage() {
  const { session, ready, authError, sendLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (ready && session) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendLink(email);
      setSent(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="card stack" onSubmit={submit}>
        <div className="row">
          <div className="brand-logo">
            <img src="/miwako-logo.png" alt="" />
          </div>
          <div>
            <div className="brand-name">MiwaCare</div>
            <div className="muted small">Quản lý bài viết &amp; thông báo</div>
          </div>
        </div>
        {sent ? (
          <div className="alert success">Đã gửi link đăng nhập tới {email}. Mở email và bấm link để vào trang.</div>
        ) : (
          <>
            <Field label="Email" hint="Chỉ email đã được cấp quyền mới nhận được link.">
              <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <ErrorBox error={error ?? authError} />
            <Button type="submit" disabled={busy || !email}>
              {busy ? 'Đang gửi…' : 'Gửi link đăng nhập'}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
