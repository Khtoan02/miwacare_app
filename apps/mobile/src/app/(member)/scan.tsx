import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useIsFocused } from 'expo-router';
import { X, Zap } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/data/api';
import { t } from '@/i18n/vi';
import { palette, radius, space, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { CircleButton } from '@/ui/kit';

const FRAME = 240;

export default function Scan() {
  const { color } = useTheme();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const isWeb = Platform.OS === 'web';
  const canScan = !isWeb && permission?.granted;

  async function submit(raw: string) {
    if (lock.current || !raw.trim()) return;
    lock.current = true;
    setBusy(true);
    try {
      const result = await api.claimProgramCode(raw);
      router.replace({ pathname: '/scan-result', params: { result: JSON.stringify(result) } });
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  return (
    <View style={styles.root}>
      {canScan && focused && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={busy ? undefined : ({ data }) => submit(data)}
        />
      )}
      <View style={[StyleSheet.absoluteFill, styles.dim]} pointerEvents="none" />

      <SafeAreaView edges={['top']} style={styles.top}>
        <CircleButton label={t.common.close} tone="glass" onPress={() => router.back()}>
          <X size={22} color="#FFFFFF" />
        </CircleButton>
        <AppText variant="h3" rawColor="#FFFFFF" style={{ fontFamily: 'OpenSans_700Bold' }}>
          {t.scan.title}
        </AppText>
        <CircleButton label={t.scan.torch} tone="glass" onPress={() => setTorch((v) => !v)}>
          <Zap size={22} color={torch ? palette.brand.sun['400'] : '#FFFFFF'} fill={torch ? palette.brand.sun['400'] : 'transparent'} />
        </CircleButton>
      </SafeAreaView>

      <View style={styles.middle} pointerEvents="box-none">
        <View style={styles.frame}>
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <View key={c} style={[styles.corner, cornerStyle[c]]} />
          ))}
        </View>
        {canScan ? (
          <AppText rawColor="#FFFFFF" align="center">
            {busy ? t.scan.checking : t.scan.aim}
          </AppText>
        ) : isWeb ? (
          <AppText rawColor="#FFFFFF" align="center" style={styles.note}>
            {t.scan.noCameraWeb}
          </AppText>
        ) : (
          <View style={{ gap: space.md, alignItems: 'center' }}>
            <AppText rawColor="#FFFFFF" align="center" style={styles.note}>
              {t.scan.needPermission}
            </AppText>
            <Button label={t.scan.allowCamera} variant="brand" size="md" onPress={requestPermission} />
          </View>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: color.surface }]}>
          <AppText variant="bodySm" color="textMuted">
            {t.scan.explain}
          </AppText>
          <AppText variant="label" nativeID="codeLabel">
            {t.scan.manualLabel}
          </AppText>
          <View style={styles.manual}>
            <TextInput
              accessibilityLabelledBy="codeLabel"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={t.scan.manualPlaceholder}
              placeholderTextColor={color.textMuted}
              onSubmitEditing={() => submit(code)}
              style={[styles.input, { borderColor: color.border, color: color.text }]}
            />
            <Button label={t.auth.confirm} onPress={() => submit(code)} loading={busy} disabled={!code.trim()} />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const C = 34;
const cornerStyle = {
  tl: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18 },
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.derived.navy['950'] },
  dim: { backgroundColor: 'rgba(11,20,48,0.35)' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.screenX, paddingTop: space.sm },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl, paddingHorizontal: space['3xl'] },
  frame: { width: FRAME, height: FRAME },
  corner: { position: 'absolute', width: C, height: C, borderColor: palette.brand.sky['400'] },
  note: { maxWidth: 300 },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, paddingBottom: space['2xl'], gap: space.md },
  manual: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, height: 52, borderWidth: 2, borderRadius: radius.md, paddingHorizontal: 16, fontFamily: 'OpenSans_700Bold', fontSize: 16, letterSpacing: 1 },
});
