import { Comfortaa_700Bold } from '@expo-google-fonts/comfortaa/700Bold';
import { OpenSans_400Regular } from '@expo-google-fonts/open-sans/400Regular';
import { OpenSans_600SemiBold } from '@expo-google-fonts/open-sans/600SemiBold';
import { OpenSans_700Bold } from '@expo-google-fonts/open-sans/700Bold';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { useNotificationObserver, usePushPrefs } from '@/features/push/push';
import { AppThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

function Root() {
  const { ready, token } = useAuth();
  // Đăng nhập xong: xin quyền thông báo + lưu máy; chạm thông báo → mở bài / hộp thư.
  usePushPrefs(ready && !!token);
  useNotificationObserver(ready && !!token);
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({ OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold, Comfortaa_700Bold });
  const done = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (done) SplashScreen.hideAsync();
  }, [done]);

  if (!done) return null;

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.color.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(member)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}
