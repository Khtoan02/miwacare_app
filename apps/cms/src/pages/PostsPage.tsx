import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { formatDateTime, listPosts, type PostKind } from '@/lib/api';
import { Badge, Button, ErrorBox, Loading, PageHead, useLoad } from '@/ui';

const kindLabel: Record<PostKind, string> = { article: 'Bài viết', promo: 'Khuyến mãi' };

export default function PostsPage() {
  const nav = useNavigate();
  const { data, error, loading } = useLoad(listPosts);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const rows = (data ?? []).filter((p) => filter === 'all' || p.status === filter);

  return (
    <>
      <PageHead
        title="Bài viết"
        desc="Bài đã đăng hiện trên trang blog công khai và trong app. Sau khi đăng có thể gửi thông báo cho khách."
        actions={
          <Button onClick={() => nav('/bai-viet/moi')}>
            <Plus size={16} /> Viết bài mới
          </Button>
        }
      />
      <div className="chips" style={{ marginBottom: 12 }}>
        {(
          [
            ['all', 'Tất cả'],
            ['published', 'Đã đăng'],
            ['draft', 'Bản nháp'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <div className="card empty">Chưa có bài nào. Bấm “Viết bài mới” để bắt đầu.</div>
      ) : (
        <div className="card flush table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/bai-viet/${p.id}`} style={{ fontWeight: 600 }}>
                      {p.title}
                    </Link>
                    <div className="muted small">/{p.slug}</div>
                  </td>
                  <td>{kindLabel[p.kind]}</td>
                  <td>{p.status === 'published' ? <Badge tone="success">Đã đăng</Badge> : <Badge>Bản nháp</Badge>}</td>
                  <td className="num small">{formatDateTime(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
