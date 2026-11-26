import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate, formatNumber } from '@shared/format';
import { Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { createProgram, listOffers, listPrograms, randomCode, type ProgramInput } from '@/data/api';
import { useAuth } from '@/lib/auth';
import { fromLocalInput, programStatusLabel, toLocalInput } from '@/lib/labels';
import { Badge, Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHead, useToast } from '@/ui/kit';

export default function ProgramsPage() {
  const { allow } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['programs'], queryFn: listPrograms });

  return (
    <>
      <PageHead
        title="Chương trình & mã QR"
        desc="Tạo chương trình riêng (workshop, sự kiện, tờ rơi…) kèm mã QR. Khách bấm nút Quét giữa thanh tab trong app để nhận quà."
        actions={
          allow('editor') && (
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> Tạo chương trình
            </Button>
          )
        }
      />
      <ErrorBox error={q.error} />
      <Card flush>
        {!q.data ? (
          <div style={{ padding: 16 }}>
            <Loading />
          </div>
        ) : q.data.length === 0 ? (
          <Empty>Chưa có chương trình nào.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Chương trình</th>
                  <th>Thời gian</th>
                  <th>Quà</th>
                  <th>Mã</th>
                  <th className="right">Đã nhận</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((p) => (
                  <tr key={p.id} className="click" onClick={() => nav(`/programs/${p.id}`)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="muted small">{p.place}</div>
                    </td>
                    <td className="num small">
                      {formatDate(p.startsAt)} → {formatDate(p.endsAt)}
                    </td>
                    <td className="small">{p.gift?.title ?? <span className="muted">Không có</span>}</td>
                    <td className="code small">{p.codes.map((c) => c.code).join(', ')}</td>
                    <td className="right num">
                      {formatNumber(p.claims)}
                      {p.maxClaims ? ` / ${formatNumber(p.maxClaims)}` : ''}
                    </td>
                    <td>
                      <Badge tone={p.status === 'active' ? 'success' : undefined}>{programStatusLabel[p.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <ProgramDialog open={open} onClose={() => setOpen(false)} onCreated={(id) => nav(`/programs/${id}`)} />
    </>
  );
}

function emptyProgram(): ProgramInput {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return { name: '', place: '', startsAt: start.toISOString(), endsAt: end.toISOString(), giftOfferId: null, maxClaims: null, code: randomCode() };
}

function ProgramDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const offers = useQuery({ queryKey: ['offers'], queryFn: listOffers });
  const [f, setF] = useState<ProgramInput>(emptyProgram);
  const set = (p: Partial<ProgramInput>) => setF((x) => ({ ...x, ...p }));
  const mut = useMutation({
    mutationFn: () => createProgram(f),
    onSuccess: (p) => {
      qc.invalidateQueries();
      toast('Đã tạo chương trình');
      setF(emptyProgram());
      onClose();
      onCreated(p.id);
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo chương trình"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            Tạo và xem mã QR
          </Button>
        </>
      }>
      <Field label="Tên chương trình">
        <input className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Workshop dinh dưỡng tháng 12" />
      </Field>
      <Field label="Địa điểm / kênh">
        <input className="input" value={f.place} onChange={(e) => set({ place: e.target.value })} placeholder="Cửa hàng Quận 7" />
      </Field>
      <div className="grid-2">
        <Field label="Bắt đầu">
          <input className="input" type="datetime-local" value={toLocalInput(f.startsAt)} onChange={(e) => set({ startsAt: fromLocalInput(e.target.value) })} />
        </Field>
        <Field label="Kết thúc">
          <input className="input" type="datetime-local" value={toLocalInput(f.endsAt)} onChange={(e) => set({ endsAt: fromLocalInput(e.target.value) })} />
        </Field>
        <Field label="Quà khi quét">
          <select className="select" value={f.giftOfferId ?? ''} onChange={(e) => set({ giftOfferId: e.target.value || null })}>
            <option value="">Không có quà (chỉ ghi nhận tham gia)</option>
            {(offers.data ?? [])
              .filter((o) => o.kind !== 'redeem')
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Tối đa số khách" hint="Để trống = không giới hạn.">
          <input className="input" inputMode="numeric" value={f.maxClaims ?? ''} onChange={(e) => set({ maxClaims: Number(e.target.value.replace(/\D/g, '')) || null })} />
        </Field>
      </div>
      <Field label="Mã chương trình" hint="Khách nhập tay được nếu không quét QR. Mỗi khách chỉ nhận một lần.">
        <div className="row">
          <input className="input code" value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} />
          <Button variant="outline" className="btn-icon" aria-label="Tạo mã ngẫu nhiên" onClick={() => set({ code: randomCode() })}>
            <RefreshCw size={16} />
          </Button>
        </div>
      </Field>
      <ErrorBox error={mut.error} />
    </Modal>
  );
}
