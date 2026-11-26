// MiwaCare design tokens — sinh từ design/tokens.json (v2.0.0, 2026-11-25).
// Nguồn màu: Design & Brand Guidelines 2023 – Dale & Cecil – MIWAKO Series.
// Component chỉ dùng `theme.color.*` (token vai trò), không dùng `palette` trực tiếp.
import tokens from './tokens.json';

export type ColorScheme = 'light' | 'dark';
export type ColorRole = keyof typeof tokens.color.light;
export type TypeStyle = keyof typeof tokens.type;

export const palette = tokens.palette;
export const space = tokens.space;
export const radius = tokens.radius;
export const motion = tokens.motion;
export const size = tokens.size;
export const tier = tokens.tier;

// Tên family phải khớp với key khi nạp font bằng expo-font / useFonts
export const fontFamily = {
  ui: { 400: 'OpenSans_400Regular', 600: 'OpenSans_600SemiBold', 700: 'OpenSans_700Bold' },
  brand: { 700: 'Comfortaa_700Bold' },
} as const;

export function textStyle(name: TypeStyle) {
  const t = tokens.type[name];
  const fam = fontFamily[t.family as 'ui' | 'brand'] as Record<number, string>;
  return {
    fontFamily: fam[t.weight] ?? fam[700],
    fontSize: t.size,
    lineHeight: t.lineHeight,
  };
}

export function shadow(name: keyof typeof tokens.shadow) {
  const s = tokens.shadow[name];
  // iOS dùng shadow*, Android dùng elevation; RN mới hỗ trợ boxShadow
  return {
    boxShadow: `${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`,
    elevation: name === 'raised' ? 8 : 3,
  };
}

export function makeTheme(scheme: ColorScheme) {
  return {
    scheme,
    color: tokens.color[scheme],
    palette,
    space,
    radius,
    motion,
    size,
    tier,
    textStyle,
    shadow: scheme === 'light' ? shadow : () => ({}),
  };
}

export type Theme = ReturnType<typeof makeTheme>;
