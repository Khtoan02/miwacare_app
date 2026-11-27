import { useEffect, useState } from 'react';

import { audience, sendNotification, type Post } from '@/lib/api';
import { Button, ErrorBox, Field, Modal, useToast } from '@/ui';

/** Gửi thông báo đẩy + hộp thư. Có `post` thì chạm vào thông báo sẽ mở bài đó. */
export function SendDialog({ open, onClose, onSent, post }: { open: boolean; onClose: () => void; onSent?: () => void; post: Post | null }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [count, setCount] = useState<{ recipients: number; devices: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(post ? post.title.slice(0, 80) : '');
    setBody(post ? (post.excerpt || 'Bấm để đọc bài mới trên MiwaCare').slice(0, 200) : '');
    setError(null);
    setCount(null);
    audience().then(setCount, setError);
  }, [open, post]);

  async function send() {
    if (!window.confirm(`Gửi thông báo này tới ${count?.recipients ?? 0} khách? Không thu hồi được sau khi gửi.`)) return;
    setBusy(true);
    setError(null);
    try {
      const r = await sendNotification({ postId: post?.id ?? null, title, body });
      toast(`Đã gửi: ${r.recipients} khách nhận vào hộp thư, ${r.pushSent} thiết bị nhận thông báo đẩy`);
      onSent?.();
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const valid = title.trim().length >= 3 && title.trim().length <= 80 && body.trim().length >= 3 && body.trim().length <= 200;

  return (
    <Modal
      open={open}
      title="Gửi thông báo cho khách"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={send} disabled={!valid || busy || !count || count.recipients === 0}>
            {busy ? 'Đang gửi…' : 'Gửi ngay'}
          </Button>
        </>
      }
    >
      <div className="alert info">
        {count
          ? `Sẽ gửi tới ${count.recipients} khách đã đồng ý nhận tin (${count.devices} thiết bị đang bật thông báo). Khách chưa đồng ý không nhận được.`
          : 'Đang đếm số khách nhận…'}
      </div>
      {post && <div className="small muted">Chạm vào thông báo sẽ mở bài: {post.title}</div>}
      <Field label="Tiêu đề thông báo" hint={`${title.trim().length}/80 ký tự`}>
        <input className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Nội dung" hint={`${body.trim().length}/200 ký tự`}>
        <textarea className="textarea" rows={3} maxLength={200} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <ErrorBox error={error} />
    </Modal>
  );
}
