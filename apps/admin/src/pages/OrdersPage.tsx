import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatNumber, formatVnd } from '@shared/format';
import { Download, Link2, Plus, Upload } from 'lucide-react';
import { useDeferredValue, useState, type ChangeEvent } from 'react';
import { Link, useSearchParams } from 'react-router';

import { checkImport, createOrder, importOrders, listOrders, previewOrder, rematchOrders, setOrderStatus, type ImportRowResult, type OrderInput } from '@/data/api';
import type { OrderStatus } from '@/data/types';
import { useAuth } from '@/lib/auth';
import { CSV_TEMPLATE, parseOrdersCsv } from '@/lib/csv';
import { dateTime, fromLocalInput, orderSourceLabel, orderStatusLabel, orderStatusTone, toLocalInput } from '@/lib/labels';
import { Badge, Button, Card, Chips, Empty, ErrorBox, Field, Loading, Modal, PageHead, useToast } from '@/ui/kit';
import { ask, IS_DEMO } from '@/lib/env';

export default function OrdersPage() {
  const { allow } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const unmatched = params.get('unmatched') === '1';
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q);
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const list = useQuery({ queryKey: ['orders', dq, status, unmatched], queryFn: () => listOrders({ q: dq, status, unmatched }) });
  const edit = allow('editor');

  const statusMut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: OrderStatus }) => setOrderStatus(id, s),
    onSuccess: () => {
      qc.invalidateQueries();
      toast('Đã cập nhật trạng thái đơn');
    },
    onError: (e) => toast((e as Error).message),
  });
  const rematch = useMutation({
    mutationFn: rematchOrders,
    onSuccess: (r) => {
      qc.invalidateQueries();
      toast(r.matched ? `Đã ghép ${r.matched} đơn, cộng ${formatNumber(r.points)} điểm` : 'Không có đơn nào khớp thêm');
    },
  });

  return (
    <>
      <PageHead
        title="Đơn hàng"
        desc="Khi chưa nối Pancake: nhập đơn bằng tay hoặc từ file CSV. Đơn hoàn thành của khách có tài khoản app được cộng điểm tự động theo cấu hình hiện hành."
        actions={
          edit && (
            <>
              <Button variant="outline" onClick={() => rematch.mutate()} disabled={rematch.isPending} title="Gắn các đơn chưa khớp vào khách vừa đăng ký app">
                <Link2 size={16} /> Ghép đơn theo SĐT
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload size={16} /> Nhập từ CSV
              </Button>
              <Button onClick={() => setNewOpen(true)}>
                <Plus size={16} /> Nhập đơn
              </Button>
            </>
          )
        }
      />
      <div className="alert warning" style={{ marginBottom: 16 }}>
        Nguồn đơn hàng trước khi có Pancake <b>chưa được chốt</b> (docs/12). Màn này là đề xuất: nhập tay + nhập CSV.
      </div>

      <Card flush>
        <div className="row wrap" style={{ padding: 16, gap: 12 }}>
          <input className="input grow" style={{ minWidth: 200 }} placeholder="Tìm mã đơn hoặc số điện thoại" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm đơn" />
          <Chips
            value={status}
            onChange={setStatus}
            options={[{ value: '', label: 'Tất cả' }, ...(['done', 'shipping', 'cancelled'] as OrderStatus[]).map((s) => ({ value: s, label: orderStatusLabel[s] }))]}
          />
          <label className="row small" style={{ fontWeight: 600 }}>
            <input type="checkbox" checked={unmatched} onChange={(e) => setParams(e.target.checked ? { unmatched: '1' } : {})} /> Chỉ đơn chưa khớp
          </label>
        </div>
        <ErrorBox error={list.error} />
        {!list.data ? (
          <div style={{ padding: 16 }}>
            <Loading />
          </div>
        ) : list.data.length === 0 ? (
          <Empty>Không có đơn hàng phù hợp.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách</th>
                  <th>Ngày mua</th>
                  <th className="right">Thanh toán</th>
                  <th className="right">Điểm</th>
                  <th>Trạng thái</th>
                  <th>Nguồn</th>
                </tr>
              </thead>
              <tbody>
                {list.data.slice(0, 200).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.code}</div>
                      <div className="muted small" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.items}>
                        {o.channel} · {o.items}
                      </div>
                    </td>
                    <td>
                      {o.memberName ? <Link to={`/members/${o.memberId}`}>{o.memberName}</Link> : <Badge tone="warning">Chưa khớp</Badge>}
                      <div className="muted small num">{o.phone}</div>
                    </td>
                    <td className="num">{dateTime(o.orderedAt)}</td>
                    <td className="right num">{formatVnd(o.subtotal - o.discount)}</td>
                    <td className="right num">{o.points ? `+${formatNumber(o.points)}` : <span className="muted">—</span>}</td>
                    <td>
                      {edit && o.status !== 'cancelled' ? (
                        <select
                          className="select"
                          style={{ minHeight: 30, padding: '2px 8px', width: 'auto' }}
                          value={o.status}
                          aria-label={`Trạng thái đơn ${o.code}`}
                          onChange={(e) => {
                            const s = e.target.value as OrderStatus;
                            if (s !== 'cancelled' || ask(`Huỷ đơn ${o.code}? Điểm đã cộng sẽ bị trừ lại và không đổi lại được.`)) statusMut.mutate({ id: o.id, s });
                          }}>
                          {(['done', 'shipping', 'cancelled'] as OrderStatus[]).map((s) => (
                            <option key={s} value={s}>
                              {orderStatusLabel[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</Badge>
                      )}
                    </td>
                    <td className="small">{orderSourceLabel[o.source]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && list.data.length > 0 && (
          <div className="muted small" style={{ padding: '10px 16px' }}>
            {list.data.length} đơn{list.data.length > 200 ? ' (hiện 200 đơn mới nhất)' : ''}
          </div>
        )}
      </Card>

      <NewOrderDialog open={newOpen} onClose={() => setNewOpen(false)} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}

const emptyOrder = (): OrderInput => ({ code: '', phone: '', orderedAt: new Date().toISOString(), subtotal: 0, discount: 0, channel: 'Cửa hàng Quận 7', items: '', status: 'done' });

function NewOrderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState<OrderInput>(emptyOrder);
  const set = <K extends keyof OrderInput>(k: K, v: OrderInput[K]) => setF((x) => ({ ...x, [k]: v }));
  // Xem trước tính trên server (bản thật) → chờ người dùng gõ xong rồi mới hỏi.
  const pq = useDeferredValue({ phone: f.phone, orderedAt: f.orderedAt, subtotal: f.subtotal, discount: f.discount });
  const preview = useQuery({ queryKey: ['preview-order', pq], queryFn: () => previewOrder(pq), enabled: open && pq.phone.length >= 9, staleTime: 15_000 });
  const p = preview.data ?? { phone: null, member: null, points: 0, ruleVersion: null };
  const mut = useMutation({
    mutationFn: () => createOrder(f),
    onSuccess: (r) => {
      qc.invalidateQueries();
      toast(`Đã lưu đơn ${r.order.code}${r.points ? `, cộng ${formatNumber(r.points)} điểm` : ''}`);
      setF(emptyOrder());
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nhập đơn hàng"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            Lưu đơn
          </Button>
        </>
      }>
      <div className="grid-2">
        <Field label="Mã đơn">
          <input className="input" value={f.code} onChange={(e) => set('code', e.target.value)} placeholder="24201" />
        </Field>
        <Field label="SĐT khách">
          <input className="input" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0912 345 678" />
        </Field>
        <Field label="Ngày giờ mua">
          <input className="input" type="datetime-local" value={toLocalInput(f.orderedAt)} onChange={(e) => set('orderedAt', fromLocalInput(e.target.value))} />
        </Field>
        <Field label="Trạng thái">
          <select className="select" value={f.status} onChange={(e) => set('status', e.target.value as OrderStatus)}>
            {(['done', 'shipping', 'cancelled'] as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {orderStatusLabel[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tổng tiền hàng (đ)">
          <input className="input" inputMode="numeric" value={f.subtotal ? formatNumber(f.subtotal) : ''} onChange={(e) => set('subtotal', Number(e.target.value.replace(/\D/g, '')))} />
        </Field>
        <Field label="Giảm giá (đ)">
          <input className="input" inputMode="numeric" value={f.discount ? formatNumber(f.discount) : ''} onChange={(e) => set('discount', Number(e.target.value.replace(/\D/g, '')))} />
        </Field>
      </div>
      <Field label="Kênh bán">
        <input className="input" value={f.channel} onChange={(e) => set('channel', e.target.value)} />
      </Field>
      <Field label="Sản phẩm">
        <input className="input" value={f.items} onChange={(e) => set('items', e.target.value)} placeholder="Sữa MIWAKO 700g × 2" />
      </Field>
      {f.phone.length >= 9 && preview.isFetched && (
        <div className={`alert ${p.member ? 'success' : 'warning'}`}>
          {p.member ? (
            <>
              Khớp thành viên <b>{p.member.fullName}</b> ({p.member.tier.name}).{' '}
              {f.status === 'done' ? (
                <>
                  Sẽ cộng <b>{formatNumber(p.points)}</b> điểm theo luật v{p.ruleVersion}.
                </>
              ) : (
                'Điểm được cộng khi đơn chuyển sang Hoàn thành.'
              )}
            </>
          ) : p.phone ? (
            'Chưa có thành viên với SĐT này. Đơn vẫn được lưu; khi khách đăng ký app, bấm “Ghép đơn theo SĐT” để cộng điểm.'
          ) : (
            'Số điện thoại chưa hợp lệ.'
          )}
        </div>
      )}
      <ErrorBox error={mut.error} />
    </Modal>
  );
}

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [rows, setRows] = useState<OrderInput[]>([]);
  const [checked, setChecked] = useState<ImportRowResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  function reset() {
    setRows([]);
    setChecked([]);
    setError(null);
    setFileName('');
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    const r = parseOrdersCsv(await file.text());
    setError(r.error);
    setRows(r.rows);
    try {
      setChecked(r.error ? [] : await checkImport(r.rows));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setChecked([]);
    }
  }

  function downloadTemplate() {
    const blob = new Blob(['﻿' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mau-nhap-don-miwacare.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const ok = checked.filter((r) => !r.error);
  const bad = checked.length - ok.length;
  const mut = useMutation({
    mutationFn: () => importOrders(rows),
    onSuccess: (r) => {
      qc.invalidateQueries();
      toast(`Đã nhập ${r.imported} đơn, cộng ${formatNumber(r.points)} điểm${r.skipped ? `, bỏ qua ${r.skipped} dòng lỗi` : ''}`);
      reset();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      wide
      onClose={() => {
        reset();
        onClose();
      }}
      title="Nhập đơn từ file CSV"
      footer={
        <>
          {!IS_DEMO && (
            <Button variant="outline" onClick={downloadTemplate}>
              <Download size={16} /> Tải file mẫu
            </Button>
          )}
          <div className="grow" />
          <Button onClick={() => mut.mutate()} disabled={!ok.length || mut.isPending}>
            Nhập {ok.length || ''} đơn hợp lệ
          </Button>
        </>
      }>
      <p className="muted" style={{ margin: 0 }}>
        Cột bắt buộc: <span className="code">ma_don, sdt, ngay_mua, tong_tien</span>. Tuỳ chọn: <span className="code">giam_gia, kenh, san_pham, trang_thai</span> (hoan_thanh / dang_giao / da_huy). Ngày dạng 26/11/2026 10:15. Xuất từ Excel: “Lưu thành CSV UTF-8”.
      </p>
      <label className="btn btn-brand" style={{ justifySelf: 'start' }}>
        <Upload size={16} /> Chọn file CSV
        <input type="file" accept=".csv,text/csv" onChange={onFile} hidden />
      </label>
      {fileName && <div className="small muted">File: {fileName}</div>}
      {error && <div className="alert danger">{error}</div>}
      {checked.length > 0 && (
        <>
          <div className="row wrap">
            <Badge tone="success">{ok.length} dòng hợp lệ</Badge>
            {bad > 0 && <Badge tone="danger">{bad} dòng lỗi — sẽ bỏ qua</Badge>}
            <Badge>Sẽ cộng {formatNumber(ok.reduce((s, r) => s + r.points, 0))} điểm</Badge>
          </div>
          <div className="table-wrap" style={{ maxHeight: 320, border: '1px solid var(--c-border)', borderRadius: 'var(--r-sm)' }}>
            <table>
              <thead>
                <tr>
                  <th>Dòng</th>
                  <th>Mã đơn</th>
                  <th>SĐT</th>
                  <th className="right">Thanh toán</th>
                  <th>Kết quả kiểm tra</th>
                </tr>
              </thead>
              <tbody>
                {checked.map((r) => (
                  <tr key={r.line}>
                    <td className="num">{r.line}</td>
                    <td>{r.input?.code}</td>
                    <td className="num">{r.input?.phone}</td>
                    <td className="right num">{r.input ? formatVnd(r.input.subtotal - r.input.discount) : ''}</td>
                    <td className="small">
                      {r.error ? <span className="neg">{r.error}</span> : r.memberName ? `${r.memberName}${r.points ? ` · +${r.points} điểm` : ''}` : <span className="muted">Chưa có tài khoản app</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <ErrorBox error={mut.error} />
    </Modal>
  );
}
