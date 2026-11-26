import { useQuery } from '@tanstack/react-query';
import { formatDate, formatNumber, maskPhone, prettyPhone } from '@shared/format';
import { Search } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { useNavigate } from 'react-router';

import { getRules, listMembers } from '@/data/api';
import { useAuth } from '@/lib/auth';
import { Badge, Card, Chips, Empty, ErrorBox, Loading, PageHead, TierBadge } from '@/ui/kit';

export default function MembersPage() {
  const { allow } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [tierId, setTierId] = useState('');
  const dq = useDeferredValue(q);
  const rules = useQuery({ queryKey: ['rules'], queryFn: getRules });
  const list = useQuery({ queryKey: ['members', dq, tierId], queryFn: () => listMembers({ q: dq, tierId }) });
  const showPhone = allow('editor');

  return (
    <>
      <PageHead title="Thành viên" desc={`Khách đã đăng ký app.${showPhone ? '' : ' Vai “Chỉ xem” không thấy đầy đủ số điện thoại.'}`} />
      <Card flush>
        <div className="row wrap" style={{ padding: 16, gap: 12 }}>
          <div className="row grow" style={{ minWidth: 220, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12 }} className="muted" aria-hidden />
            <input className="input" style={{ paddingLeft: 36 }} placeholder="Tìm theo tên hoặc số điện thoại" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm thành viên" />
          </div>
          <Chips value={tierId} onChange={setTierId} options={[{ value: '', label: 'Tất cả hạng' }, ...(rules.data?.current.tiers ?? []).map((t) => ({ value: t.id, label: t.name }))]} />
        </div>
        <ErrorBox error={list.error} />
        {!list.data ? (
          <div style={{ padding: 16 }}>
            <Loading />
          </div>
        ) : list.data.length === 0 ? (
          <Empty>Không có thành viên phù hợp.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Hạng</th>
                  <th className="right">Điểm hiện có</th>
                  <th className="right">Số đơn</th>
                  <th>Mua gần nhất</th>
                  <th>Ngày tham gia</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((m) => (
                  <tr key={m.id} className="click" onClick={() => nav(`/members/${m.id}`)}>
                    <td>
                      <a href={`/members/${m.id}`} onClick={(e) => e.preventDefault()} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
                        {m.fullName}
                      </a>
                      <div className="muted small num">
                        {showPhone ? prettyPhone(m.phone) : maskPhone(m.phone)} {!m.marketing && <Badge>Không nhận KM</Badge>}
                      </div>
                    </td>
                    <td>
                      <TierBadge tier={m.tier} />
                    </td>
                    <td className="right num">{formatNumber(m.points)}</td>
                    <td className="right num">{m.orderCount}</td>
                    <td className="num">{m.lastOrderAt ? formatDate(m.lastOrderAt) : <span className="muted">—</span>}</td>
                    <td className="num">{formatDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && list.data.length > 0 && <div className="muted small" style={{ padding: '10px 16px' }}>{list.data.length} thành viên</div>}
      </Card>
    </>
  );
}
