import { Star } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useMe, useOffers } from '@/data/hooks';
import type { OfferKind } from '@/domain/types';
import { t } from '@/i18n/vi';
import { formatNumber } from '@/lib/format';
import { palette, radius, space, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Chips, Empty, ErrorState, Loading, Screen } from '@/ui/kit';
import { OfferCard } from '@/ui/OfferCard';

export default function Offers() {
  const { color, scheme } = useTheme();
  const [tab, setTab] = useState<OfferKind>('mine');
  const offers = useOffers();
  const me = useMe();
  const list = offers.data?.filter((o) => o.kind === tab) ?? [];

  return (
    <Screen style={{ gap: space.lg, paddingTop: space.lg }}>
      <View style={styles.head}>
        <AppText variant="titleBrand" accessibilityRole="header">
          {t.offers.title}
        </AppText>
        {me.data && (
          <View style={[styles.points, { backgroundColor: scheme === 'dark' ? color.surfaceRaised : palette.brand.sun['50'] }]}>
            <Star size={16} color={palette.brand.navy['900']} fill={palette.brand.sun['400']} />
            <AppText variant="label">
              {formatNumber(me.data.points)} {t.common.points}
            </AppText>
          </View>
        )}
      </View>

      <Chips
        value={tab}
        onChange={setTab}
        options={[
          { key: 'mine', label: t.offers.tabs.mine },
          { key: 'redeem', label: t.offers.tabs.redeem },
          { key: 'event', label: t.offers.tabs.event },
        ]}
      />

      {offers.isLoading && <Loading />}
      {offers.error && <ErrorState onRetry={() => offers.refetch()} />}
      {offers.data && list.length === 0 && <Empty text={t.offers.empty} />}
      <View style={{ gap: space.md }}>
        {list.map((o) => (
          <OfferCard key={o.id} offer={o} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  points: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
});
