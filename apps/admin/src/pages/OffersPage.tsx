import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate, formatNumber } from '@shared/format';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { palette } from '@design/tokens';

import { createOffer, deleteOffer, listOffers } from '@/data/api';
import type { AdminOffer, OfferKind, OfferTone } from '@/data/types';
import { useAuth } from '@/lib/auth';
import { fromLocalInput, offerKindLabel, toLocalInput } from '@/lib/labels';
import { Badge, Button, Card, Chips, Empty, ErrorBox, Field, Loading, Modal, PageHead, useToast } from '@/ui/kit';
import { ask } from '@/lib/env';

// Màu nền thẻ ưu đãi — giống hệt app (apps/mobile/src/ui/OfferCard.tsx).
const TONE_BG: Record<OfferTone, string> = { sun: palette.brand.sun['400'], sky: palette.brand.sky['100'], leaf: palette.brand.leaf['200'], lemon: palette.brand.sun['50'] };
const INK = palette.brand.navy['900'];
const toneLabel: Record<OfferTone, string> = { sun: 'Cam', sky: 'Xanh trời', leaf: 'Xanh lá', lemon: 'Vàng' };

export default function OffersPage() {
  const { allow } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [kind, setKind] = useState<OfferKind | ''>('');
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['offers'], queryFn: listOffers });
  const del = useMutation({
    mutationFn: deleteOffer,
    onSuccess: () => {
      qc.invalidateQueries();
      toast('Đã xoá ưu đãi');
    },
    onError: (e) => toast((e as Error).message),
  });
  const list = (q.data ?? []).filter((o) => !kind || o.kind === kind);

  return (
    <>
      <PageHead
        title="Ưu đãi"
        desc="Voucher, quà đổi điểm và sự kiện hiển thị ở tab Ưu đãi trong app. Ưu đãi “riêng” chỉ khách được cấp (ví dụ qua chương trình QR) mới thấy."
        actions={
          allow('editor') && (
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> Tạo ưu đãi
            </Button>
          )
        }
      />
      <div style={{ marginBottom: 16 }}>
        <Chips value={kind} onChange={setKind} options={[{ value: '', label: 'Tất cả' }, ...(['voucher', 'redeem', 'event'] as OfferKind[]).map((k) => ({ value: k, label: offerKindLabel[k] }))]} />
      </div>
      <ErrorBox error={q.error} />
      {!q.data ? (
        <Loading />
      ) : list.length === 0 ? (
        <Card>
          <Empty>Chưa có ưu đãi.</Empty>
        </Card>
      ) : (
        <div className="grid-2">
          {list.map((o) => (
            <OfferRow key={o.id} o={o} onDelete={allow('editor') ? () => ask(`Xoá ưu đãi “${o.title}”?`) && del.mutate(o.id) : undefined} />
          ))}
        </div>
      )}
      <OfferDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function OfferRow({ o, onDelete }: { o: AdminOffer; onDelete?: () => void }) {
  return (
    <div className="card row" style={{ alignItems: 'stretch', padding: 0, overflow: 'hidden' }}>
      <div style={{ width: 96, background: TONE_BG[o.tone], color: INK, display: 'grid', placeContent: 'center', textAlign: 'center', padding: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>{o.value}</div>
        <div style={{ fontSize: 10, fontWeight: 700 }}>{o.unit}</div>
      </div>
      <div className="grow" style={{ padding: '12px 14px' }}>
        <div className="row wrap" style={{ gap: 6 }}>
          <Badge>{offerKindLabel[o.kind]}</Badge>
          {!o.public && <Badge tone="warning">Riêng</Badge>}
          {o.endsAt && new Date(o.endsAt) < new Date() && <Badge tone="danger">Hết hạn</Badge>}
        </div>
        <div style={{ fontWeight: 700, marginTop: 6 }}>{o.title}</div>
        <div className="muted small">{o.body}</div>
        <div className="muted small" style={{ marginTop: 4 }}>
          {o.pointsCost ? `${formatNumber(o.pointsCost)} điểm · ` : ''}
          {o.startsAt || o.endsAt ? `${o.startsAt ? formatDate(o.startsAt) : '…'} → ${o.endsAt ? formatDate(o.endsAt) : '…'}` : 'Không giới hạn thời gian'}
        </div>
      </div>
      {onDelete && (
        <div style={{ padding: 8 }}>
          <Button variant="ghost" className="btn-icon" aria-label={`Xoá ${o.title}`} onClick={onDelete}>
            <Trash2 size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}

const emptyOffer = (): Omit<AdminOffer, 'id'> => ({ kind: 'voucher', value: '', unit: '', tone: 'sun', title: '', body: '', startsAt: null, endsAt: null, pointsCost: null, public: true });

function OfferDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState(emptyOffer);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const mut = useMutation({
    mutationFn: () => createOffer(f.kind === 'redeem' ? { ...f, value: f.value || String(f.pointsCost ?? ''), unit: f.unit || 'ĐIỂM' } : f),
    onSuccess: () => {
      qc.invalidateQueries();
      toast('Đã tạo ưu đãi');
      setF(emptyOffer());
      onClose();
    },
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo ưu đãi"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            Tạo
          </Button>
        </>
      }>
      <Chips value={f.kind} onChange={(kind) => set({ kind })} options={(['voucher', 'redeem', 'event'] as OfferKind[]).map((k) => ({ value: k, label: offerKindLabel[k] }))} />
      <Field label="Tiêu đề">
        <input className="input" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Voucher giảm 50K" />
      </Field>
      <div className="grid-2">
        {f.kind === 'redeem' ? (
          <Field label="Số điểm cần đổi">
            <input className="input" inputMode="numeric" value={f.pointsCost ?? ''} onChange={(e) => set({ pointsCost: Number(e.target.value.replace(/\D/g, '')) || null })} />
          </Field>
        ) : (
          <Field label="Giá trị hiển thị" hint="Ví dụ −50K, −10%, 7/12">
            <input className="input" value={f.value} onChange={(e) => set({ value: e.target.value })} />
          </Field>
        )}
        <Field label="Dòng phụ" hint="Ví dụ ĐƠN TỪ 500K, WORKSHOP">
          <input className="input" value={f.unit} onChange={(e) => set({ unit: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Bắt đầu">
          <input className="input" type="datetime-local" value={f.startsAt ? toLocalInput(f.startsAt) : ''} onChange={(e) => set({ startsAt: fromLocalInput(e.target.value) || null })} />
        </Field>
        <Field label="Kết thúc">
          <input className="input" type="datetime-local" value={f.endsAt ? toLocalInput(f.endsAt) : ''} onChange={(e) => set({ endsAt: fromLocalInput(e.target.value) || null })} />
        </Field>
      </div>
      <Field label="Mô tả / cách dùng">
        <textarea className="textarea" value={f.body} onChange={(e) => set({ body: e.target.value })} />
      </Field>
      <Field label="Màu thẻ">
        <Chips value={f.tone} onChange={(tone) => set({ tone })} options={(Object.keys(toneLabel) as OfferTone[]).map((t) => ({ value: t, label: toneLabel[t] }))} />
      </Field>
      <label className="row" style={{ fontWeight: 600 }}>
        <input type="checkbox" checked={!f.public} onChange={(e) => set({ public: !e.target.checked })} /> Ưu đãi riêng — chỉ khách được cấp mới thấy
      </label>
      <ErrorBox error={mut.error} />
    </Modal>
  );
}
