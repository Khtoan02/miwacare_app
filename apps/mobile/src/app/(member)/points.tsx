import { Star } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLedger, useMe } from '@/data/hooks';
import { t } from '@/i18n/vi';
import { formatDayMonth, formatDelta, formatNumber, monthLabel } from '@/lib/format';
import { palette, radius, space, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Chips, Empty, ErrorState, Header, Loading, Screen } from '@/ui/kit';

type Filter = 'all' | 'plus' | 'minus';

export default function Points() {
  const { color } = useTheme();
  const me = useMe();
  const ledger = useLedger();
  const [filter, setFilter] = useState<Filter>('all');
  const year = new Date().getFullYear();

  const { earned, used, groups } = useMemo(() => {
    const rows = ledger.data ?? [];
    const thisYear = rows.filter((r) => new Date(r.at).getFullYear() === year);
    const shown = rows.filter((r) => filter === 'all' || (filter === 'plus' ? r.delta > 0 : r.delta < 0));
    const g = new Map<string, typeof rows>();
    shown.forEach((r) => {
      const k = monthLabel(r.at);
      g.set(k, [...(g.get(k) ?? []), r]);
    });
    return {
      earned: thisYear.filter((r) => r.delta > 0).reduce((s, r) => s + r.delta, 0),
      used: thisYear.filter((r) => r.delta < 0).reduce((s, r) => s + r.delta, 0),
      groups: [...g.entries()],
    };
  }, [ledger.data, filter, year]);

  return (
    <Screen style={{ gap: space.xl }}>
      <Header title={t.points.title} />

      <View style={[styles.summary, { backgroundColor: color.bgTint }]}>
        <View style={styles.big}>
          <Star size={28} color={palette.brand.navy['900']} fill={palette.brand.sun['400']} />
          <AppText variant="display">{me.data ? formatNumber(me.data.points) : '—'}</AppText>
          <AppText variant="bodyStrong">{t.points.available}</AppText>
        </View>
        <View style={styles.stats}>
          <View style={[styles.stat, { backgroundColor: color.surface }]}>
            <AppText variant="caption" color="textMuted">
              {t.points.earnedYear(year)}
            </AppText>
            <AppText variant="h3" color="successText" style={{ fontFamily: 'OpenSans_700Bold' }}>
              {formatDelta(earned)}
            </AppText>
          </View>
          <View style={[styles.stat, { backgroundColor: color.surface }]}>
            <AppText variant="caption" color="textMuted">
              {t.points.usedYear(year)}
            </AppText>
            <AppText variant="h3" color="dangerText" style={{ fontFamily: 'OpenSans_700Bold' }}>
              {formatDelta(used)}
            </AppText>
          </View>
        </View>
      </View>

      <Chips
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'all', label: t.points.filters.all },
          { key: 'plus', label: t.points.filters.plus },
          { key: 'minus', label: t.points.filters.minus },
        ]}
      />

      {ledger.isLoading && <Loading />}
      {ledger.error && <ErrorState onRetry={() => ledger.refetch()} />}
      {ledger.data && groups.length === 0 && <Empty text={t.points.empty} />}

      {groups.map(([month, rows]) => (
        <View key={month}>
          <AppText variant="label" color="textMuted" style={{ paddingBottom: 4 }}>
            {month}
          </AppText>
          {rows.map((r) => {
            const plus = r.delta > 0;
            return (
              <View key={r.id} style={[styles.item, { borderBottomColor: color.border }]}>
                <View style={[styles.sign, { backgroundColor: plus ? color.successBg : color.dangerBg }]}>
                  <AppText variant="h2" color={plus ? 'successText' : 'dangerText'}>
                    {plus ? '+' : '−'}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong" style={{ fontSize: 15 }}>
                    {r.title}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    {formatDayMonth(r.at)} · {r.meta}
                  </AppText>
                </View>
                <AppText variant="bodyStrong" color={plus ? 'successText' : 'dangerText'} style={{ fontFamily: 'OpenSans_700Bold' }}>
                  {formatDelta(r.delta)}
                </AppText>
              </View>
            );
          })}
        </View>
      ))}

      <AppText variant="caption" color="textMuted" align="center">
        {t.points.syncNote}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: radius.lg, padding: space.xl, gap: space.lg },
  big: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stats: { flexDirection: 'row', gap: space.md },
  stat: { flex: 1, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, borderBottomWidth: 1 },
  sign: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
