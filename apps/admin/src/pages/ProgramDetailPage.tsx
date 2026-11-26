import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatNumber } from '@shared/format';
import { ArrowLeft, Copy, Download, Plus, Printer, Square } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { addProgramCode, endProgram, getProgram } from '@/data/api';
import { useAuth } from '@/lib/auth';
import { dateTime, programStatusLabel } from '@/lib/labels';
import { Badge, Button, Card, ErrorBox, Loading, PageHead, Stat, useToast } from '@/ui/kit';
import { QrImage, qrPayload, useQrDataUrl } from '@/ui/QrImage';
import { ask, IS_DEMO } from '@/lib/env';

export default function ProgramDetailPage() {
  const { id = '' } = useParams();
  const { allow } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['program', id], queryFn: () => getProgram(id) });
  const add = useMutation({
    mutationFn: () => addProgramCode(id),
    onSuccess: (c) => {
      qc.invalidateQueries();
      toast(`Đã thêm mã ${c.code}`);
    },
    onError: (e) => toast((e as Error).message),
  });
  const end = useMutation({
    mutationFn: () => endProgram(id),
    onSuccess: () => {
      qc.invalidateQueries();
      toast('Đã kết thúc chương trình');
    },
  });

  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading rows={5} />;
  const p = q.data;
  const edit = allow('editor') && p.status !== 'ended';

  return (
    <>
      <Link to="/programs" className="btn btn-ghost btn-sm" style={{ marginBottom: 8, paddingLeft: 0 }}>
        <ArrowLeft size={16} /> Chương trình
      </Link>
      <PageHead
        title={p.name}
        desc={
          <span className="row wrap">
            <Badge tone={p.status === 'active' ? 'success' : undefined}>{programStatusLabel[p.status]}</Badge>
            {p.place} · {dateTime(p.startsAt)} → {dateTime(p.endsAt)}
          </span>
        }
        actions={
          edit && (
            <>
              <Button variant="outline" onClick={() => add.mutate()} disabled={add.isPending}>
                <Plus size={16} /> Thêm mã
              </Button>
              <Button variant="danger" onClick={() => ask('Kết thúc chương trình? Khách sẽ không quét được mã nữa.') && end.mutate()}>
                <Square size={14} /> Kết thúc
              </Button>
            </>
          )
        }
      />
      <div className="stack">
        <div className="grid-3">
          <Stat label="Khách đã nhận" value={formatNumber(p.claims)} hint={p.maxClaims ? `Tối đa ${formatNumber(p.maxClaims)}` : 'Không giới hạn'} />
          <Stat label="Quà" value={p.gift?.value ?? '—'} hint={p.gift?.title ?? 'Chỉ ghi nhận tham gia'} />
          <Stat label="Số mã" value={p.codes.length} hint="Mỗi khách chỉ nhận một lần dù quét mã nào" />
        </div>
        <div className="grid-2">
          {p.codes.map((c) => (
            <CodeCard key={c.code} code={c.code} used={c.usedCount} programName={p.name} />
          ))}
        </div>
        <div className="alert info">
          QR chứa <span className="code">{qrPayload('MÃ')}</span> — app MiwaCare đọc được; camera thường sẽ không mở trang web nào. Server kiểm tra: mã đúng, còn hạn, còn lượt, khách chưa nhận, chặn sau 5 lần nhập sai trong 10 phút.
        </div>
      </div>
    </>
  );
}

function CodeCard({ code, used, programName }: { code: string; used: number; programName: string }) {
  const toast = useToast();
  const png = useQrDataUrl(code, 1024);

  function download() {
    if (!png) return;
    const a = document.createElement('a');
    a.href = png;
    a.download = `qr-${code}.png`;
    a.click();
  }

  function print() {
    if (!png) return;
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) return;
    const doc = w.document;
    doc.title = `QR ${code}`;
    const wrap = doc.createElement('div');
    wrap.style.cssText = 'font-family:system-ui,sans-serif;text-align:center;padding:40px';
    const h = doc.createElement('h2');
    h.textContent = programName;
    const img = doc.createElement('img');
    img.src = png;
    img.style.width = '70%';
    const p1 = doc.createElement('p');
    p1.textContent = 'Mở app MiwaCare → bấm nút Quét ở giữa → quét mã này';
    const p2 = doc.createElement('p');
    p2.style.cssText = 'font:700 22px ui-monospace,monospace;letter-spacing:.08em';
    p2.textContent = code;
    wrap.append(h, img, p1, p2);
    doc.body.append(wrap);
    img.onload = () => w.print();
  }

  return (
    <Card>
      <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
        <QrImage code={code} size={150} />
        <div className="grow stack" style={{ gap: 8 }}>
          <div className="code" style={{ fontSize: 18 }}>
            {code}
          </div>
          <div className="muted small">Đã dùng {formatNumber(used)} lần</div>
          <div className="row wrap">
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(code).then(() => toast('Đã sao chép mã'))}>
              <Copy size={14} /> Sao chép
            </Button>
            {!IS_DEMO && (
              <>
                <Button variant="outline" size="sm" onClick={download} disabled={!png}>
                  <Download size={14} /> Tải PNG
                </Button>
                <Button variant="outline" size="sm" onClick={print} disabled={!png}>
                  <Printer size={14} /> In
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
