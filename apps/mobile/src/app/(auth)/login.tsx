import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { api, IS_MOCK } from '@/data/api';
import { t } from '@/i18n/vi';
import { normalizeVnPhone } from '@/lib/format';
import { radius, shadow, space, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/kit';

const logo = require('@/assets/images/miwako-logo.png');

function Checkbox({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { color } = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle} style={styles.check}>
      <View style={[styles.box, { borderColor: color.text, backgroundColor: checked ? color.actionPrimaryBg : 'transparent' }]}>
        {checked && <Check size={14} color={color.actionPrimaryText} strokeWidth={3} />}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

export default function Login() {
  const { color } = useTheme();
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const normalized = normalizeVnPhone(phone);
    if (!normalized) return setError(t.auth.phoneInvalid);
    if (!agree) return setError(t.auth.needAgree);
    setError(null);
    setLoading(true);
    try {
      await api.sendOtp(normalized);
      // Đồng ý nhận tin (marketing) được ghi vào bảng consents sau khi xác thực OTP.
      router.push({ pathname: '/otp', params: { phone: normalized, marketing: marketing ? '1' : '0' } });
    } catch {
      setError(IS_MOCK ? t.common.loadError : t.auth.sendFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false} edges={['bottom']}>
        <View style={[styles.hero, { backgroundColor: color.bgTint }]}>
          <View style={[styles.logoWrap, shadow('raised')]}>
            <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="MIWAKO" />
          </View>
          <AppText variant="display">MiwaCare</AppText>
        </View>

        <View style={styles.body}>
          <View style={{ gap: 6 }}>
            <AppText variant="h1" accessibilityRole="header">
              {t.auth.hello}
            </AppText>
            <AppText color="textMuted">{t.auth.intro}</AppText>
          </View>

          <View style={{ gap: space.sm }}>
            <AppText variant="label" nativeID="phoneLabel">
              {t.auth.phoneLabel}
            </AppText>
            <View style={[styles.input, { borderColor: error && !normalizeVnPhone(phone) ? color.dangerText : color.focus, backgroundColor: color.surface }]}>
              <AppText variant="bodyStrong" style={[styles.prefix, { borderRightColor: color.border }]}>
                +84
              </AppText>
              <TextInput
                accessibilityLabelledBy="phoneLabel"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                placeholder="0912 345 678"
                placeholderTextColor={color.textMuted}
                maxLength={14}
                style={[styles.field, { color: color.text }]}
              />
            </View>
          </View>

          <View style={{ gap: space.md }}>
            <Checkbox checked={agree} onToggle={() => setAgree((v) => !v)}>
              <AppText variant="bodySm">
                {t.auth.agreeRequired}{' '}
                <AppText variant="bodySm" color="dangerText">
                  {t.auth.required}
                </AppText>
              </AppText>
            </Checkbox>
            <Checkbox checked={marketing} onToggle={() => setMarketing((v) => !v)}>
              <AppText variant="bodySm" color="textMuted">
                {t.auth.agreeMarketing}
              </AppText>
            </Checkbox>
          </View>

          {error && (
            <AppText variant="bodySm" color="dangerText" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          )}

          <Button label={t.auth.getOtp} onPress={submit} loading={loading} />
          <AppText variant="bodySm" color="textMuted" align="center">
            {t.auth.help} <AppText variant="bodySm" color="textLink">{t.auth.contact}</AppText>
          </AppText>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 96, paddingBottom: 40, alignItems: 'center', gap: space.lg, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  // Chữ "MI" của logo màu trắng nên logo phải đặt trên nền màu (xanh trời của bao bì).
  logoWrap: { width: 132, height: 132, borderRadius: radius.full, backgroundColor: '#6BCAFA', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#FFFFFF' },
  logo: { width: 104, height: 31 },
  body: { paddingHorizontal: space['2xl'], paddingTop: 28, gap: space.xl },
  input: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: radius.md, borderWidth: 2, overflow: 'hidden' },
  prefix: { paddingLeft: 16, paddingRight: 12, borderRightWidth: 1 },
  field: { flex: 1, paddingHorizontal: 14, fontFamily: 'OpenSans_600SemiBold', fontSize: 17, height: '100%' },
  check: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', minHeight: 44 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
