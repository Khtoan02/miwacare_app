import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { radius, size, useTheme } from '@/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'brand' | 'reward' | 'outline';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'lg' | 'md';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', size: s = 'lg', loading, disabled, icon, style }: Props) {
  const { color } = useTheme();
  const map = {
    primary: { bg: color.actionPrimaryBg, fg: color.actionPrimaryText, border: color.actionPrimaryBg },
    brand: { bg: color.actionBrandBg, fg: color.actionBrandText, border: color.actionBrandBg },
    reward: { bg: color.actionRewardBg, fg: color.actionRewardText, border: color.actionRewardBg },
    outline: { bg: 'transparent', fg: color.text, border: color.border },
  }[variant];
  const off = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: s === 'lg' ? size.buttonLg : size.buttonMd,
          backgroundColor: map.bg,
          borderColor: map.border,
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale: pressed && !off ? 0.98 : 1 }],
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={map.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <AppText variant="label" rawColor={map.fg}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
