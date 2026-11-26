// Các thành phần nhỏ dùng chung: khung màn hình, nút tròn, chip lọc, trạng thái tải/lỗi/rỗng.
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '@/i18n/vi';
import { radius, space, useTheme } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
  edges = ['top'],
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  edges?: ('top' | 'bottom')[];
}) {
  const { color } = useTheme();
  const inner = [padded && { paddingHorizontal: space.screenX }, { paddingBottom: space['3xl'] }, style];
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: color.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={inner} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function CircleButton({
  onPress,
  label,
  children,
  tone = 'tint',
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
  tone?: 'tint' | 'surface' | 'glass';
}) {
  const { color } = useTheme();
  const bg = tone === 'tint' ? color.bgTint : tone === 'surface' ? color.surface : 'rgba(255,255,255,0.14)';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={[styles.circle, { backgroundColor: bg }]}>
      {children}
    </Pressable>
  );
}

export function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  const { color } = useTheme();
  return (
    <View style={styles.header}>
      <CircleButton label={t.common.back} onPress={onBack ?? (() => router.back())}>
        <ChevronLeft size={22} color={color.text} />
      </CircleButton>
      <AppText variant="h2" accessibilityRole="header">
        {title}
      </AppText>
    </View>
  );
}

export function Chips<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const { color } = useTheme();
  return (
    <View accessibilityRole="tablist" style={styles.chips}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[
              styles.chip,
              {
                backgroundColor: on ? color.actionPrimaryBg : color.surface,
                borderColor: on ? color.actionPrimaryBg : color.border,
              },
            ]}>
            <AppText variant="label" rawColor={on ? color.actionPrimaryText : color.text}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Loading() {
  const { color } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={color.text} />
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={[styles.center, { gap: space.lg }]}>
      <AppText color="textMuted" align="center">
        {t.common.loadError}
      </AppText>
      <Button label={t.common.retry} variant="outline" size="md" onPress={onRetry} />
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <AppText color="textMuted" align="center">
        {text}
      </AppText>
    </View>
  );
}

export function Pill({ text, tone }: { text: string; tone: 'success' | 'warning' | 'danger' | 'info' }) {
  const { color } = useTheme();
  const c = {
    success: [color.successBg, color.successText],
    warning: [color.warningBg, color.warningText],
    danger: [color.dangerBg, color.dangerText],
    info: [color.bgTint, color.textLink],
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: c[0] }]}>
      <AppText variant="caption" rawColor={c[1]} style={{ fontFamily: 'OpenSans_700Bold' }}>
        {text}
      </AppText>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { color } = useTheme();
  return (
    <View style={[{ borderRadius: 20, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  chip: { height: 36, paddingHorizontal: 16, borderRadius: radius.full, borderWidth: 1, justifyContent: 'center' },
  center: { paddingVertical: space['4xl'], alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
});
