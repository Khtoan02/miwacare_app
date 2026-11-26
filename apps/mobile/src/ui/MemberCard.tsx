import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TierProgress } from '@/domain/points';
import type { Member } from '@/domain/types';
import { t } from '@/i18n/vi';
import { formatNumber, maskPhone } from '@/lib/format';
import { palette, radius, shadow, space, tier as tierColors } from '@/theme';
import { AppText } from './AppText';

export function MemberCard({ member, progress, onPress }: { member: Member; progress: TierProgress; onPress?: () => void }) {
  const tc = tierColors[progress.current.colorKey];
  const ink = tc.text;
  const top = progress.current.colorKey === 'tier4';
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}>
      <LinearGradient
        colors={[tc.from, tc.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, shadow('raised'), top && { borderWidth: 2, borderColor: palette.brand.sun['400'] }]}>
        <View style={styles.row}>
          <AppText variant="caption" rawColor={ink} style={styles.brand}>
            {t.card.brand}
          </AppText>
          <View style={[styles.tierPill, { backgroundColor: top ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.7)' }]}>
            <AppText variant="label" rawColor={ink} style={{ fontFamily: 'Comfortaa_700Bold' }}>
              {progress.current.name}
            </AppText>
          </View>
        </View>

        <View style={styles.pointsRow}>
          <AppText variant="display" rawColor={ink} style={{ fontSize: 40, lineHeight: 48 }}>
            {formatNumber(member.points)}
          </AppText>
          <AppText variant="bodyStrong" rawColor={ink}>
            {t.common.points}
          </AppText>
        </View>

        <View style={{ gap: 6 }}>
          <View style={[styles.track, { backgroundColor: top ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)' }]}>
            <View
              style={[
                styles.bar,
                { width: `${Math.round(progress.ratio * 100)}%`, backgroundColor: top ? palette.brand.sun['400'] : palette.brand.navy['900'] },
              ]}
            />
          </View>
          <AppText variant="bodySm" rawColor={ink}>
            {progress.next ? t.card.toNext(formatNumber(progress.remaining), progress.next.name) : t.card.topTier}
          </AppText>
        </View>

        <View style={[styles.row, styles.footer, { borderTopColor: top ? 'rgba(255,255,255,0.3)' : 'rgba(21,35,75,0.25)' }]}>
          <AppText variant="bodySm" rawColor={ink} style={{ flex: 1 }} numberOfLines={1}>
            {t.card.earnByPhone}{' '}
            <AppText variant="bodySm" rawColor={ink} style={{ fontFamily: 'OpenSans_700Bold' }}>
              {maskPhone(member.phone)}
            </AppText>
          </AppText>
          <View style={[styles.cta, { backgroundColor: top ? palette.brand.sun['400'] : palette.brand.navy['900'] }]}>
            <AppText variant="caption" rawColor={top ? palette.brand.navy['900'] : '#FFFFFF'} style={{ fontFamily: 'OpenSans_700Bold' }}>
              {t.card.history}
            </AppText>
            <ChevronRight size={14} color={top ? palette.brand.navy['900'] : '#FFFFFF'} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: space.xl, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  brand: { fontFamily: 'Comfortaa_700Bold', letterSpacing: 1.5 },
  tierPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  pointsRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  track: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  bar: { height: 8, borderRadius: radius.full },
  footer: { paddingTop: space.md, borderTopWidth: 1, borderStyle: 'dashed' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 12, paddingRight: 8, paddingVertical: 6, borderRadius: radius.full },
});
