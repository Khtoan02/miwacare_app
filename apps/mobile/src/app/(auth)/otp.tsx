import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { api } from '@/data/api';
import { useAuth } from '@/features/auth/AuthContext';
import { t } from '@/i18n/vi';
import { prettyPhone } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Header, Screen } from '@/ui/kit';

const LEN = 6;

export default function Otp() {
  const { color } = useTheme();
  const { signIn } = useAuth();
  const { phone = '' } = useLocalSearchParams<{ phone: string; marketing: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  async function verify(value = code) {
    if (value.length !== LEN) return;
    setLoading(true);
    setError(null);
    try {
      const { token } = await api.verifyOtp(phone, value);
      await signIn(token);
      router.replace('/(tabs)');
    } catch {
      setError(t.auth.otpInvalid);
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setSeconds(60);
    await api.sendOtp(phone);
  }

  return (
    <Screen>
      <Header title="" />
      <View style={{ gap: space['3xl'], paddingHorizontal: space.xs }}>
        <View style={{ gap: space.sm }}>
          <AppText variant="titleBrand" accessibilityRole="header">
            {t.auth.otpTitle}
          </AppText>
          <AppText color="textMuted">{t.auth.otpSentTo(prettyPhone(phone))}</AppText>
          <AppText variant="caption" color="textLink">
            {t.auth.otpDevHint}
          </AppText>
        </View>

        {/* Một ô nhập ẩn + 6 ô hiển thị: hỗ trợ tự điền OTP từ tin nhắn (iOS/Android). */}
        <Pressable onPress={() => input.current?.focus()} accessibilityLabel={t.auth.otpTitle} style={styles.cells}>
          {Array.from({ length: LEN }).map((_, i) => {
            const focused = i === Math.min(code.length, LEN - 1);
            return (
              <View
                key={i}
                style={[
                  styles.cell,
                  {
                    borderColor: error ? color.dangerText : focused ? color.focus : color.border,
                    backgroundColor: color.surface,
                  },
                ]}>
                <AppText variant="h1">{code[i] ?? ''}</AppText>
              </View>
            );
          })}
        </Pressable>
        <TextInput
          ref={input}
          value={code}
          onChangeText={(v) => {
            const digits = v.replace(/\D/g, '').slice(0, LEN);
            setCode(digits);
            if (digits.length === LEN) verify(digits);
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus
          maxLength={LEN}
          style={styles.hidden}
        />

        {error && (
          <AppText variant="bodySm" color="dangerText" accessibilityLiveRegion="polite">
            {error}
          </AppText>
        )}

        <View style={styles.row}>
          <AppText variant="bodySm" color="textMuted">
            {t.auth.noCode}
          </AppText>
          {seconds > 0 ? (
            <AppText variant="bodySm" color="textMuted">
              {t.auth.resendIn(seconds)}
            </AppText>
          ) : (
            <Pressable accessibilityRole="button" onPress={resend} hitSlop={8}>
              <AppText variant="label" color="textLink">
                {t.auth.resend}
              </AppText>
            </Pressable>
          )}
        </View>

        <View style={[styles.warn, { backgroundColor: color.warningBg }]}>
          <ShieldCheck size={20} color={color.warningText} />
          <AppText variant="bodySm" color="warningText" style={{ flex: 1 }}>
            {t.auth.otpWarning}
          </AppText>
        </View>

        <Button label={t.auth.confirm} onPress={() => verify()} loading={loading} disabled={code.length !== LEN} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cells: { flexDirection: 'row', gap: space.sm },
  cell: { flex: 1, height: 56, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  warn: { flexDirection: 'row', gap: space.md, padding: 14, borderRadius: radius.md },
});
