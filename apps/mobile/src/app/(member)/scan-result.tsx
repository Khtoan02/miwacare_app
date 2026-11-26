import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ClaimResult } from '@/domain/types';
import { t } from '@/i18n/vi';
import { palette, radius, space, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card, Screen } from '@/ui/kit';

export default function ScanResult() {
  const { color } = useTheme();
  const qc = useQueryClient();
  const { result: raw = '' } = useLocalSearchParams<{ result: string }>();
  let result: ClaimResult = { ok: false, reason: 'invalid' };
  try {
    result = JSON.parse(raw) as ClaimResult;
  } catch {}

  useEffect(() => {
    if (result.ok) qc.invalidateQueries({ queryKey: ['offers'] });
  }, [result.ok, qc]);

  const ok = result.ok;
  return (
    <Screen padded={false} edges={['top', 'bottom']} style={{ flexGrow: 1 }}>
      <View style={[styles.band, { backgroundColor: ok ? color.successBg : color.dangerBg }]} />
      <View style={styles.body}>
        <View style={[styles.badge, { backgroundColor: ok ? palette.brand.leaf['400'] : color.dangerSolid, borderColor: color.bg }]}>
          {ok ? <Check size={44} color={palette.brand.navy['900']} strokeWidth={2.5} /> : <X size={44} color="#FFFFFF" strokeWidth={2.5} />}
        </View>
        <AppText variant="titleBrand" align="center" accessibilityRole="header">
          {ok ? t.scanResult.okTitle : t.scanResult.failTitle}
        </AppText>

        {result.ok ? (
          <>
            <Card style={{ overflow: 'hidden', alignSelf: 'stretch' }}>
              <View style={[styles.prog, { backgroundColor: color.bgTint }]}>
                <AppText variant="caption" color="textLink" style={{ fontFamily: 'OpenSans_700Bold', letterSpacing: 1 }}>
                  {t.scanResult.program}
                </AppText>
                <AppText variant="h3" style={{ fontFamily: 'OpenSans_700Bold' }}>
                  {result.program.name}
                </AppText>
                <AppText variant="bodySm" color="textMuted">
                  {result.program.when} · {result.program.where}
                </AppText>
              </View>
              <View style={[styles.gift, { borderTopColor: color.border }]}>
                <View style={styles.giftValue}>
                  <AppText variant="h3" rawColor={palette.brand.navy['900']} style={{ fontFamily: 'Comfortaa_700Bold' }}>
                    {result.gift.value}
                  </AppText>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyStrong" style={{ fontFamily: 'OpenSans_700Bold', fontSize: 15 }}>
                    {result.gift.title}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    {result.gift.note}
                  </AppText>
                </View>
              </View>
            </Card>
            <AppText variant="bodySm" color="textMuted" align="center">
              {t.scanResult.useAtCounter}
            </AppText>
          </>
        ) : (
          <AppText color="textMuted" align="center">
            {t.scanResult.reasons[result.reason]}
          </AppText>
        )}

        <View style={styles.actions}>
          {ok ? (
            <Button label={t.scanResult.viewOffers} onPress={() => router.replace('/(tabs)/offers')} />
          ) : (
            <Button label={t.scanResult.tryAgain} onPress={() => router.replace('/scan')} />
          )}
          <Button label={t.scanResult.home} variant="outline" onPress={() => router.replace('/(tabs)')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  body: { flex: 1, alignItems: 'center', gap: space.xl, paddingHorizontal: space['2xl'], paddingTop: 64 },
  badge: { width: 96, height: 96, borderRadius: radius.full, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  prog: { padding: 16, gap: 4 },
  gift: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderTopWidth: 2, borderStyle: 'dashed' },
  giftValue: { width: 64, height: 64, borderRadius: 16, backgroundColor: palette.brand.sun['400'], alignItems: 'center', justifyContent: 'center' },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: 'auto', paddingTop: space.xl },
});
