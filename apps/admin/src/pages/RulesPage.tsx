import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { earnedPoints } from '@domain/points';
import { formatNumber, formatVnd } from '@shared/format';
import { History, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { getRules, saveRuleVersion } from '@/data/api';
import type { LoyaltyRuleVersion, Tier } from '@/data/types';
import { useAuth } from '@/lib/auth';
import { dateTime, fromLocalInput, toLocalInput, weekdayLabel } from '@/lib/labels';
import { Badge, Button, Card, ErrorBox, Field, Loading, PageHead, TierBadge, useToast } from '@/ui/kit';

type Draft = Omit<LoyaltyRuleVersion, 'version'>;
const TIER_KEYS = ['tier1', 'tier2', 'tier3', 'tier4'] as const;
const roundingLabel = { floor: 'Làm tròn xuống', round: 'Làm tròn gần nhất', ceil: 'Làm tròn lên' };

export default function RulesPage() {
  const { allow } = useAuth();
  const q = useQuery({ queryKey: ['rules'], queryFn: getRules });
  const [draft, setDraft] = useState<Draft | null>(null);

  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading rows={6} />;
  const { current, versions } = q.data;

  function startEdit() {
    const { version: _v, ...rest } = structuredClone(current);
    void _v;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    setDraft({ ...rest, effectiveFrom: tomorrow.toISOString() });
  }

  return (
    <>
      <PageHead
        title="Điểm & hạng"
        desc="Cấu hình cách tích điểm, quy đổi và xét hạng. Mỗi lần lưu tạo một phiên bản mới; đơn cũ vẫn tính theo phiên bản có hiệu lực lúc mua."
        actions={
          allow('admin') && !draft && (
            <Button onClick={startEdit}>
              <Pencil size={16} /> Tạo phiên bản mới
            </Button>
          )
        }
      />
      <div className="alert warning" style={{ marginBottom: 16 }}>
        Tên hạng và các con số dưới đây là <b>giá trị mẫu</b>, chưa phải chính sách thật. Bạn điền khi đã chốt.
      </div>

      {draft ? (
        <RuleEditor draft={draft} setDraft={setDraft} />
      ) : (
        <div className="stack">
          <RuleSummary rule={current} />
          <Card title="Lịch sử phiên bản" flush>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Phiên bản</th>
                    <th>Hiệu lực từ</th>
                    <th className="right">Tiền / 1 điểm</th>
                    <th className="right">1 điểm =</th>
                    <th>Hạng</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.version}>
                      <td>
                        <History size={14} aria-hidden /> v{v.version} {v.version === current.version && <Badge tone="success">Đang áp dụng</Badge>}
                        {new Date(v.effectiveFrom) > new Date() && <Badge tone="warning">Sắp áp dụng</Badge>}
                      </td>
                      <td className="num">{dateTime(v.effectiveFrom)}</td>
                      <td className="right num">{formatVnd(v.earn.amountPerPoint)}</td>
                      <td className="right num">{formatVnd(v.redeemValue)}</td>
                      <td className="small">{v.tiers.map((t) => `${t.name} (${formatNumber(t.minPoints)})`).join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function RuleSummary({ rule }: { rule: LoyaltyRuleVersion }) {
  const wd = Object.entries(rule.weekdayMultipliers).filter(([, f]) => f && f !== 1);
  const tm = Object.entries(rule.tierMultipliers).filter(([, f]) => f && f !== 1);
  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <Card title={`Đang áp dụng: phiên bản ${rule.version}`}>
        <dl className="stack" style={{ gap: 10, margin: 0 }}>
          <Row k="Tích điểm" v={`${formatVnd(rule.earn.amountPerPoint)} = 1 điểm (${rule.earn.base === 'after_discount' ? 'tính sau giảm giá' : 'tính trước giảm giá'}, ${roundingLabel[rule.earn.rounding].toLowerCase()})`} />
          <Row k="Nhân điểm theo ngày" v={wd.length ? wd.map(([d, f]) => `${weekdayLabel[+d]} ×${f}`).join(', ') : 'Không'} />
          <Row k="Nhân điểm theo hạng" v={tm.length ? tm.map(([t, f]) => `${rule.tiers.find((x) => x.id === t)?.name ?? t} ×${f}`).join(', ') : 'Không'} />
          <Row k="Thưởng đăng ký" v={`${formatNumber(rule.signupBonus)} điểm`} />
          <Row k="Thưởng sinh nhật" v={`${formatNumber(rule.birthdayBonus)} điểm`} />
          <Row k="Dùng điểm" v={`1 điểm = ${formatVnd(rule.redeemValue)}`} />
          <Row k="Hạn dùng điểm" v={rule.expiryMonths ? `${rule.expiryMonths} tháng` : 'Không hết hạn'} />
        </dl>
      </Card>
      <div className="stack">
        <Card title="Hạng thành viên">
          <div className="stack" style={{ gap: 10 }}>
            {[...rule.tiers]
              .sort((a, b) => a.minPoints - b.minPoints)
              .map((t) => (
                <div key={t.id} className="row">
                  <TierBadge tier={t} />
                  <span className="grow" />
                  <span className="num">từ {formatNumber(t.minPoints)} điểm</span>
                </div>
              ))}
          </div>
        </Card>
        <Calculator rule={rule} />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <dt className="muted" style={{ width: 170, flexShrink: 0 }}>
        {k}
      </dt>
      <dd style={{ margin: 0, fontWeight: 600 }}>{v}</dd>
    </div>
  );
}

function Calculator({ rule }: { rule: Draft }) {
  const [amount, setAmount] = useState(1_240_000);
  const [discount, setDiscount] = useState(0);
  const [day, setDay] = useState(() => new Date().getDay());
  const [tierId, setTierId] = useState(rule.tiers[0]?.id ?? 'tier1');
  // Ngày bất kỳ có đúng thứ đã chọn
  const base = new Date(2026, 10, 22, 12);
  base.setDate(base.getDate() + ((day - base.getDay() + 7) % 7));
  const at = base.toISOString();
  const pts = earnedPoints({ subtotal: amount, discount, at }, tierId, { ...rule, version: 0 });
  return (
    <Card title="Thử tính điểm">
      <div className="grid-2">
        <Field label="Tiền hàng (đ)">
          <input className="input" inputMode="numeric" value={formatNumber(amount)} onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, '')))} />
        </Field>
        <Field label="Giảm giá (đ)">
          <input className="input" inputMode="numeric" value={formatNumber(discount)} onChange={(e) => setDiscount(Number(e.target.value.replace(/\D/g, '')))} />
        </Field>
        <Field label="Ngày mua">
          <select className="select" value={day} onChange={(e) => setDay(+e.target.value)}>
            {weekdayLabel.map((w, i) => (
              <option key={w} value={i}>
                {w}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hạng của khách">
          <select className="select" value={tierId} onChange={(e) => setTierId(e.target.value)}>
            {rule.tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="alert info" style={{ marginTop: 12 }}>
        Khách nhận <b className="num">{formatNumber(pts)}</b> điểm (≈ {formatVnd(pts * rule.redeemValue)} khi dùng).
      </div>
    </Card>
  );
}

function RuleEditor({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft | null) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const num = (v: string) => Number(v.replace(/[^\d.]/g, '') || 0);
  const mut = useMutation({
    mutationFn: () => saveRuleVersion(draft),
    onSuccess: (v) => {
      qc.invalidateQueries();
      toast(`Đã lưu phiên bản ${v.version}`);
      setDraft(null);
    },
  });

  function setTier(i: number, patch: Partial<Tier>) {
    set({ tiers: draft.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  }

  return (
    <div className="stack">
      <Card title="Phiên bản mới">
        <div className="stack">
          <div className="grid-3">
            <Field label="Hiệu lực từ" hint="Đơn mua từ thời điểm này tính theo phiên bản mới.">
              <input className="input" type="datetime-local" value={toLocalInput(draft.effectiveFrom)} onChange={(e) => set({ effectiveFrom: fromLocalInput(e.target.value) })} />
            </Field>
            <Field label="Số tiền cho 1 điểm (đ)">
              <input className="input" inputMode="numeric" value={formatNumber(draft.earn.amountPerPoint)} onChange={(e) => set({ earn: { ...draft.earn, amountPerPoint: num(e.target.value) } })} />
            </Field>
            <Field label="1 điểm khi dùng = (đ)">
              <input className="input" inputMode="numeric" value={formatNumber(draft.redeemValue)} onChange={(e) => set({ redeemValue: num(e.target.value) })} />
            </Field>
            <Field label="Tính điểm trên">
              <select className="select" value={draft.earn.base} onChange={(e) => set({ earn: { ...draft.earn, base: e.target.value as Draft['earn']['base'] } })}>
                <option value="after_discount">Số tiền sau giảm giá</option>
                <option value="before_discount">Số tiền trước giảm giá</option>
              </select>
            </Field>
            <Field label="Làm tròn">
              <select className="select" value={draft.earn.rounding} onChange={(e) => set({ earn: { ...draft.earn, rounding: e.target.value as Draft['earn']['rounding'] } })}>
                {Object.entries(roundingLabel).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hạn dùng điểm (tháng)" hint="Để trống = không hết hạn.">
              <input className="input" inputMode="numeric" value={draft.expiryMonths ?? ''} onChange={(e) => set({ expiryMonths: e.target.value ? num(e.target.value) : null })} />
            </Field>
            <Field label="Thưởng đăng ký (điểm)">
              <input className="input" inputMode="numeric" value={draft.signupBonus} onChange={(e) => set({ signupBonus: num(e.target.value) })} />
            </Field>
            <Field label="Thưởng sinh nhật (điểm)">
              <input className="input" inputMode="numeric" value={draft.birthdayBonus} onChange={(e) => set({ birthdayBonus: num(e.target.value) })} />
            </Field>
          </div>

          <div>
            <h3 style={{ marginBottom: 8 }}>Nhân điểm theo ngày trong tuần</h3>
            <div className="grid-4">
              {weekdayLabel.map((w, i) => (
                <Field key={w} label={w}>
                  <input
                    className="input"
                    type="number"
                    step="0.1"
                    min="0"
                    value={draft.weekdayMultipliers[i as 0] ?? 1}
                    onChange={(e) => set({ weekdayMultipliers: { ...draft.weekdayMultipliers, [i]: Number(e.target.value) || 1 } })}
                  />
                </Field>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Hạng thành viên"
        actions={
          draft.tiers.length < 4 && (
            <Button variant="outline" size="sm" onClick={() => set({ tiers: [...draft.tiers, { id: `tier${draft.tiers.length + 1}`, name: '', minPoints: 0, colorKey: TIER_KEYS[draft.tiers.length] }] })}>
              <Plus size={14} /> Thêm hạng
            </Button>
          )
        }>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Màu</th>
                <th>Tên hạng</th>
                <th>Từ (điểm)</th>
                <th>Nhân điểm</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {draft.tiers.map((t, i) => (
                <tr key={t.id}>
                  <td>
                    <TierBadge tier={{ ...t, name: '●' }} />
                  </td>
                  <td>
                    <input className="input" value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} aria-label={`Tên hạng ${i + 1}`} />
                  </td>
                  <td>
                    <input className="input" inputMode="numeric" value={t.minPoints} disabled={i === 0} onChange={(e) => setTier(i, { minPoints: num(e.target.value) })} aria-label={`Mốc điểm hạng ${i + 1}`} />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                    step="0.1"
                    min="0"
                      value={draft.tierMultipliers[t.id] ?? 1}
                      onChange={(e) => set({ tierMultipliers: { ...draft.tierMultipliers, [t.id]: Number(e.target.value) || 1 } })}
                      aria-label={`Nhân điểm hạng ${i + 1}`}
                    />
                  </td>
                  <td>
                    {i > 0 && i === draft.tiers.length - 1 && (
                      <Button variant="ghost" className="btn-icon" aria-label="Xoá hạng" onClick={() => set({ tiers: draft.tiers.slice(0, -1) })}>
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Calculator rule={draft} />
      <ErrorBox error={mut.error} />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="outline" onClick={() => setDraft(null)}>
          Huỷ
        </Button>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          Lưu phiên bản mới
        </Button>
      </div>
    </div>
  );
}
