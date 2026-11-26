import { useQuery } from '@tanstack/react-query';

import { listAudit } from '@/data/api';
import { dateTime } from '@/lib/labels';
import { Card, Empty, ErrorBox, Loading, PageHead } from '@/ui/kit';

export default function AuditPage() {
  const q = useQuery({ queryKey: ['audit'], queryFn: listAudit });
  return (
    <>
      <PageHead title="Nhật ký thao tác" desc="Ai đã làm gì, lúc nào. Chỉ đọc — không ai sửa hay xoá được nhật ký." />
      <ErrorBox error={q.error} />
      <Card flush>
        {!q.data ? (
          <div style={{ padding: 16 }}>
            <Loading />
          </div>
        ) : q.data.length === 0 ? (
          <Empty>Chưa có thao tác nào.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người thực hiện</th>
                  <th>Thao tác</th>
                  <th>Đối tượng</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((a) => (
                  <tr key={a.id}>
                    <td className="num">{dateTime(a.at)}</td>
                    <td>{a.actor}</td>
                    <td style={{ fontWeight: 600 }}>{a.action}</td>
                    <td>{a.target}</td>
                    <td className="muted small">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
