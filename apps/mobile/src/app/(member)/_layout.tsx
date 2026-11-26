import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/theme';

// Các màn chỉ dành cho thành viên đã đăng nhập (ngoài thanh tab).
export default function MemberLayout() {
  const { token } = useAuth();
  const { color } = useTheme();
  if (!token) return <Redirect href="/login" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
      <Stack.Screen name="points" />
      <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="scan-result" options={{ animation: 'fade' }} />
    </Stack>
  );
}
