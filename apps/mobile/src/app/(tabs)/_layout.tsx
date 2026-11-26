import { Redirect, router, Tabs } from 'expo-router';
import { Gift, House, ScanLine, ShoppingBag, User } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthContext';
import { t } from '@/i18n/vi';
import { palette, radius, useTheme } from '@/theme';

function ScanButton() {
  const { color } = useTheme();
  return (
    <View style={styles.scanSlot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.scan.title}
        onPress={() => router.push('/scan')}
        style={({ pressed }) => [
          styles.scan,
          { backgroundColor: color.actionPrimaryBg, borderColor: color.bg, transform: [{ scale: pressed ? 0.96 : 1 }] },
        ]}>
        <ScanLine size={24} color={color.actionPrimaryText} />
      </Pressable>
    </View>
  );
}

function TabIcon({ Icon, color: c, focused }: { Icon: typeof House; color: ColorValue; focused: boolean }) {
  const { color } = useTheme();
  return (
    <View style={[styles.iconPill, focused && { backgroundColor: color.tabActiveBg }]}>
      <Icon size={22} color={String(c)} />
    </View>
  );
}

export default function TabsLayout() {
  const { token } = useAuth();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  if (!token) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.text,
        tabBarInactiveTintColor: color.textMuted,
        tabBarLabelStyle: { fontFamily: 'OpenSans_600SemiBold', fontSize: 11 },
        tabBarStyle: { backgroundColor: color.bg, borderTopColor: color.border, height: 64 + insets.bottom, paddingTop: 6 },
        sceneStyle: { backgroundColor: color.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: t.tabs.home, tabBarIcon: (p) => <TabIcon Icon={House} {...p} /> }} />
      <Tabs.Screen name="offers" options={{ title: t.tabs.offers, tabBarIcon: (p) => <TabIcon Icon={Gift} {...p} /> }} />
      <Tabs.Screen
        name="scan-tab"
        options={{ title: t.tabs.scan, tabBarButton: () => <ScanButton /> }}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tabs.Screen name="orders" options={{ title: t.tabs.orders, tabBarIcon: (p) => <TabIcon Icon={ShoppingBag} {...p} /> }} />
      <Tabs.Screen name="account" options={{ title: t.tabs.account, tabBarIcon: (p) => <TabIcon Icon={User} {...p} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: { width: 56, height: 28, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  scanSlot: { flex: 1, alignItems: 'center' },
  scan: {
    width: 60,
    height: 60,
    marginTop: -22,
    borderRadius: radius.full,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.brand.navy['900'],
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
