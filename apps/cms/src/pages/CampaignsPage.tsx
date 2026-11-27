import { Send } from 'lucide-react';
import { useState } from 'react';

import { formatDateTime, listCampaigns } from '@/lib/api';
import { SendDialog } from '@/pages/SendDialog';
import { Button, ErrorBox, Loading, PageHead, useLoad } from '@/ui';

export default function CampaignsPage() {
  const { data, error, loading, reload } = useLoad(listCampaigns);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead
        title="Thông báo đã gửi"
        desc="Chỉ khách đã đồng ý nhận tin ưu đãi và bài viết mới nhận được. Mỗi lần gửi cũng lưu vào hộp thư trong app."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Send size={16} /> Gửi thông báo không kèm bài
          </Button>
        }
      />
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : !data?.length ? (
        <div className="card empty">Chưa gửi thông báo nào.</div>
      ) : (
        <div className="card flush table-wrap">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Nội dung</th>
                <th>Khách nhận</th>
                <th>Push thành công</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td className="num small">{formatDateTime(c.sentAt)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div className="muted small">{c.body}</div>
                    {c.postTitle && <div className="small">Bài: {c.postTitle}</div>}
                  </td>
                  <td className="num">{c.recipients}</td>
                  <td className="num">
                    {c.pushSent}
                    {c.pushFailed ? <span className="neg"> · {c.pushFailed} lỗi</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <SendDialog open={open} onClose={() => setOpen(false)} onSent={reload} post={null} />
    </>
  );
}
