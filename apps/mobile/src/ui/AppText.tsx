import { Text, type TextProps } from 'react-native';

import { textStyle, useTheme, type ColorRole, type TypeStyle } from '@/theme';

interface Props extends TextProps {
  variant?: TypeStyle;
  color?: ColorRole;
  /** Màu cố định (dùng trên nền pastel/thẻ hạng, nơi chữ luôn là navy). */
  rawColor?: string;
  align?: 'left' | 'center' | 'right';
}

export function AppText({ variant = 'body', color = 'text', rawColor, align, style, ...rest }: Props) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[textStyle(variant), { color: rawColor ?? theme.color[color], textAlign: align }, style]}
    />
  );
}
