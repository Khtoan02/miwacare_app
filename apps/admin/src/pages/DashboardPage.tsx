import { useQuery } from '@tanstack/react-query';
import { formatDelta, formatNumber, formatVnd } from '@shared/format';
import { Link } from 'react-router';

import { getDashboard } from '@/data/api';
import { dateTime, reasonLabel } from '@/lib/labels';
import { Card, ErrorBox, Loading, PageHead, Stat, TierBadge } from '@/ui/kit';

export default function DashboardPage() {
  const q = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading rows={6} />;
  const d = q.data;
  const max = Math.max(1, ...d.tierCounts.map((t) => t.count));

  return (
    <>
      <PageHead title="Tổng quan" desc="Số liệu tháng này và hoạt động điểm gần nhất." />
      <div className="stack">
        <div className="grid-4">
          <Stat label="Thành viên" value={formatNumber(d.members)} hint={`+${d.newMembers30d} trong 30 ngày`} />
          <Stat label="Đơn tháng này" value={formatNumber(d.ordersMonth)} hint={`Doanh thu ${formatVnd(d.revenueMonth)}`} />
          <Stat label="Điểm đã cộng tháng này" value={formatNumber(d.pointsIssuedMonth)} hint={`Đã đổi ${formatNumber(d.pointsRedeemedMonth)} điểm`} />
          <Stat label="Đồng ý nhận khuyến mãi" value={`${Math.round(d.marketingRate * 100)}%`} hint="Chỉ gửi tin khuyến mãi cho nhóm này" />
        </div>

        {d.unmatchedOrders > 0 && (
          <div className="alert warning">
            Có {d.unmatchedOrders} đơn chưa khớp với thành viên nào (khách chưa cài app).{' '}
            <Link to="/orders?unmatched=1">Xem đơn chưa khớp</Link>
          </div>
        )}

        <div className="grid-2">
          <Card title="Thành viên theo hạng">
            <div className="stack" style={{ gap: 12 }}>
              {d.tierCounts.map(({ tier, count }) => (
                <div key={tier.id} className="row">
                  <div style={{ width: 130 }}>
                    <TierBadge tier={tier} />
                  </div>
                  <div className="bar grow">
                    <i style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="num" style={{ width: 40, textAlign: 'right' }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Hoạt động điểm gần đây" flush>
            <div className="table-wrap">
              <table>
                <tbody>
                  {d.recentLedger.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link to={`/members/${l.memberId}`}>{l.memberName}</Link>
                        <div className="muted small">
                          {reasonLabel[l.reason]} · {dateTime(l.createdAt)}
                        </div>
                      </td>
                      <td className={`right num ${l.delta > 0 ? 'pos' : 'neg'}`}>{formatDelta(l.delta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
