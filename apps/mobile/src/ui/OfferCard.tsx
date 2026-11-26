import { StyleSheet, View } from 'react-native';

import type { Offer, OfferTone } from '@/domain/types';
import { palette, radius, space, useTheme } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Pill } from './kit';

export const toneBg: Record<OfferTone, string> = {
  sun: palette.brand.sun['400'],
  sky: palette.brand.sky['100'],
  leaf: palette.brand.leaf['200'],
  lemon: palette.brand.sun['50'],
};
const ink = palette.brand.navy['900'];

/** Thẻ ưu đãi dạng vé: cuống màu bên trái, nội dung bên phải. */
export function OfferCard({ offer, onPress }: { offer: Offer; onPress?: () => void }) {
  const { color } = useTheme();
  return (
    <View style={[styles.card, { borderColor: color.border, backgroundColor: color.surface }]}>
      <View style={[styles.stub, { backgroundColor: toneBg[offer.tone] }]}>
        <AppText variant="titleBrand" rawColor={ink} style={{ fontSize: 22, lineHeight: 28 }}>
          {offer.value}
        </AppText>
        <AppText variant="caption" rawColor={ink} align="center" style={{ fontFamily: 'OpenSans_700Bold', fontSize: 11 }}>
          {offer.unit}
        </AppText>
      </View>
      <View style={[styles.body, { borderLeftColor: color.border }]}>
        <AppText variant="bodyStrong" style={{ fontFamily: 'OpenSans_700Bold', fontSize: 15 }}>
          {offer.title}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {offer.meta}
        </AppText>
        <View style={styles.foot}>
          <Pill text={offer.tag} tone={offer.tagWarn ? 'warning' : 'success'} />
          <Button label={offer.cta} size="md" variant={offer.primary ? 'primary' : 'outline'} onPress={onPress} style={{ height: 36, paddingHorizontal: 14 }} />
        </View>
      </View>
    </View>
  );
}

/** Thẻ ưu đãi nhỏ, cuộn ngang ở trang chủ. */
export function OfferMini({ offer }: { offer: Offer }) {
  const { color } = useTheme();
  return (
    <View style={[styles.mini, { borderColor: color.border, backgroundColor: color.surface }]}>
      <View style={[styles.miniTop, { backgroundColor: toneBg[offer.tone] }]}>
        <AppText variant="titleBrand" rawColor={ink}>
          {offer.value}
        </AppText>
        <AppText variant="caption" rawColor={ink} style={{ fontFamily: 'OpenSans_600SemiBold', flexShrink: 1 }}>
          {offer.unit}
        </AppText>
      </View>
      <View style={{ padding: space.md, gap: 4 }}>
        <AppText variant="bodySm" style={{ fontFamily: 'OpenSans_700Bold' }} numberOfLines={2}>
          {offer.title}
        </AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {offer.meta}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 20, borderWidth: 1, overflow: 'hidden', minHeight: 112 },
  stub: { width: 96, alignItems: 'center', justifyContent: 'center', padding: space.sm, gap: 2 },
  body: { flex: 1, padding: 14, gap: 4, borderLeftWidth: 2, borderStyle: 'dashed' },
  foot: { marginTop: 'auto', paddingTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  mini: { width: 236, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  miniTop: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, gap: space.sm, borderTopLeftRadius: radius.md },
});
