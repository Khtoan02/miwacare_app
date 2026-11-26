import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate, formatDelta, formatNumber, formatVnd, maskPhone, prettyPhone } from '@shared/format';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { adjustPoints, getMember } from '@/data/api';
import { useAuth } from '@/lib/auth';
import { dateTime, orderStatusLabel, orderStatusTone, reasonLabel } from '@/lib/labels';
import { Badge, Button, Card, Chips, Empty, ErrorBox, Field, Loading, Modal, PageHead, Stat, TierBadge, useToast } from '@/ui/kit';

export default function MemberDetailPage() {
  const { id = '' } = useParams();
  const { allow } = useAuth();
  const q = useQuery({ queryKey: ['member', id], queryFn: () => getMember(id) });
  const [adjustOpen, setAdjustOpen] = useState(false);

  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading rows={6} />;
  const { member: m, progress, ledger, orders } = q.data;

  return (
    <>
      <Link to="/members" className="btn btn-ghost btn-sm" style={{ marginBottom: 8, paddingLeft: 0 }}>
        <ArrowLeft size={16} /> Thành viên
      </Link>
      <PageHead
        title={m.fullName}
        desc={
          <span className="row wrap">
            <span className="num">{allow('editor') ? prettyPhone(m.phone) : maskPhone(m.phone)}</span>
            <TierBadge tier={m.tier} />
            {m.marketing ? <Badge tone="success">Đồng ý nhận khuyến mãi</Badge> : <Badge>Không nhận khuyến mãi</Badge>}
          </span>
        }
        actions={
          allow('admin') && (
            <Button variant="outline" onClick={() => setAdjustOpen(true)}>
              <SlidersHorizontal size={16} /> Điều chỉnh điểm
            </Button>
          )
        }
      />

      <div className="stack">
        <div className="grid-4">
          <Stat label="Điểm hiện có" value={formatNumber(m.points)} />
          <Stat label="Điểm xét hạng" value={formatNumber(m.lifetimePoints)} hint={progress.next ? `Còn ${formatNumber(progress.remaining)} điểm lên ${progress.next.name}` : 'Đã ở hạng cao nhất'} />
          <Stat label="Số đơn" value={m.orderCount} hint={m.lastOrderAt ? `Gần nhất ${formatDate(m.lastOrderAt)}` : 'Chưa mua'} />
          <Stat label="Tham gia" value={formatDate(m.createdAt)} hint={m.birthday ? `Sinh nhật ${formatDate(m.birthday)}` : 'Chưa có ngày sinh'} />
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>
          <Card title="Lịch sử điểm" flush>
            {ledger.length === 0 ? (
              <Empty>Chưa có giao dịch điểm.</Empty>
            ) : (
              <div className="table-wrap">
                <table>
                  <tbody>
                    {ledger.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{l.title}</div>
                          <div className="muted small">
                            {reasonLabel[l.reason]} · {dateTime(l.createdAt)}
                            {l.meta ? ` · ${l.meta}` : ''}
                            {l.ruleVersion ? ` · luật v${l.ruleVersion}` : ''}
                            {l.createdBy ? ` · ${l.createdBy}` : ''}
                          </div>
                        </td>
                        <td className={`right num ${l.delta > 0 ? 'pos' : 'neg'}`}>{formatDelta(l.delta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Đơn hàng" flush>
            {orders.length === 0 ? (
              <Empty>Chưa có đơn hàng.</Empty>
            ) : (
              <div className="table-wrap">
                <table>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {o.code} <Badge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</Badge>
                          </div>
                          <div className="muted small">
                            {dateTime(o.orderedAt)} · {o.channel}
                          </div>
                          <div className="small">{o.items}</div>
                        </td>
                        <td className="right num">{formatVnd(o.subtotal - o.discount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <AdjustDialog open={adjustOpen} onClose={() => setAdjustOpen(false)} memberId={m.id} name={m.fullName} balance={m.points} />
    </>
  );
}

function AdjustDialog({ open, onClose, memberId, name, balance }: { open: boolean; onClose: () => void; memberId: string; name: string; balance: number }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [sign, setSign] = useState<'+' | '-'>('+');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const delta = (sign === '+' ? 1 : -1) * Number(amount || 0);
  const mut = useMutation({
    mutationFn: () => adjustPoints(memberId, delta, note),
    onSuccess: () => {
      qc.invalidateQueries();
      toast(`Đã ${delta > 0 ? 'cộng' : 'trừ'} ${formatNumber(Math.abs(delta))} điểm cho ${name}`);
      setAmount('');
      setNote('');
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Điều chỉnh điểm thủ công"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !amount}>
            Lưu điều chỉnh
          </Button>
        </>
      }>
      <div className="alert info">
        {name} đang có <b>{formatNumber(balance)}</b> điểm. Điều chỉnh tay được ghi vào nhật ký thao tác và không tính vào điểm xét hạng.
      </div>
      <Chips value={sign} onChange={setSign} options={[{ value: '+', label: 'Cộng điểm' }, { value: '-', label: 'Trừ điểm' }]} />
      <Field label="Số điểm">
        <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="Ví dụ 100" />
      </Field>
      <Field label="Lý do (bắt buộc)" hint="Ví dụ: Bù điểm đơn #24118 bị nhập thiếu.">
        <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {amount && <div className="small">Sau điều chỉnh: <b className="num">{formatNumber(balance + delta)}</b> điểm</div>}
      <ErrorBox error={mut.error} />
    </Modal>
  );
}
