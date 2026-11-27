import { router, type Href } from 'expo-router';
import { Bell, Check, ChevronRight, Gift, History, ScanLine, ShoppingBag } from 'lucide-react-native';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useInbox, useMembership, useOffers, useOrders } from '@/data/hooks';
import { t } from '@/i18n/vi';
import { formatDelta } from '@/lib/format';
import { palette, radius, shadow, space, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { CircleButton, ErrorState, Loading } from '@/ui/kit';
import { MemberCard } from '@/ui/MemberCard';
import { OfferMini } from '@/ui/OfferCard';

export default function Home() {
  const { color, scheme } = useTheme();
  const { member, progress, isLoading, error, refetch } = useMembership();
  const offers = useOffers();
  const orders = useOrders();
  const inbox = useInbox();
  const unread = (inbox.data ?? []).filter((m) => !m.read).length;
  const lastDone = orders.data?.find((o) => o.status === 'done');

  const quick: { label: string; icon: typeof Gift; bg: string; href: Href }[] = [
    { label: t.home.quick.scan, icon: ScanLine, bg: palette.brand.sky['50'], href: '/scan' },
    { label: t.home.quick.offers, icon: Gift, bg: palette.brand.sun['50'], href: '/(tabs)/offers' },
    { label: t.home.quick.points, icon: History, bg: palette.derived.tint.successLight, href: '/points' },
    { label: t.home.quick.orders, icon: ShoppingBag, bg: palette.brand.sky['50'], href: '/(tabs)/orders' },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={[styles.band, { backgroundColor: color.bgTint }]} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { refetch(); offers.refetch(); orders.refetch(); inbox.refetch(); }} />}>
        <View style={styles.headRow}>
          <View>
            <AppText variant="bodySm" color="textMuted">
              {t.home.greeting(new Date().getHours())}
            </AppText>
            <AppText variant="titleBrand">{member?.fullName.split(' ').slice(-2).join(' ') ?? ' '}</AppText>
          </View>
          <View>
            <CircleButton label={unread ? `${t.home.notifications}, ${t.inbox.unread(unread)}` : t.home.notifications} tone="surface" onPress={() => router.push('/hop-thu')}>
              <Bell size={22} color={color.text} />
            </CircleButton>
            {unread > 0 && (
              <View pointerEvents="none" style={[styles.badge, { backgroundColor: color.dangerSolid }]}>
                <AppText variant="caption" color="textOnPrimary" style={{ fontSize: 11, lineHeight: 14, fontFamily: 'OpenSans_700Bold' }}>
                  {unread > 9 ? '9+' : unread}
                </AppText>
              </View>
            )}
          </View>
        </View>

        {isLoading && <Loading />}
        {error && <ErrorState onRetry={refetch} />}
        {member && progress && <MemberCard member={member} progress={progress} onPress={() => router.push('/points')} />}

        <View style={styles.quick}>
          {quick.map(({ label, icon: Icon, bg, href }) => (
            <Pressable key={label} accessibilityRole="button" onPress={() => router.push(href)} style={styles.quickItem}>
              <View style={[styles.quickIcon, { backgroundColor: scheme === 'dark' ? color.surfaceRaised : bg }]}>
                <Icon size={24} color={color.text} />
              </View>
              <AppText variant="caption" align="center" style={{ fontFamily: 'OpenSans_600SemiBold' }}>
                {label}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: space.md }}>
          <View style={styles.sectionHead}>
            <AppText variant="h3" accessibilityRole="header">
              {t.home.offersTitle}
            </AppText>
            <Pressable accessibilityRole="link" onPress={() => router.push('/(tabs)/offers')} hitSlop={8}>
              <AppText variant="label" color="textLink">
                {t.common.seeAll}
              </AppText>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingRight: space.xl }} style={{ marginRight: -space.screenX }}>
            {offers.data?.filter((o) => o.kind === 'mine').map((o) => <OfferMini key={o.id} offer={o} />)}
          </ScrollView>
        </View>

        {lastDone && lastDone.pointsEarned != null && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/orders')} style={[styles.lastOrder, { backgroundColor: color.successBg }]}>
            <View style={[styles.lastIcon, { backgroundColor: color.surface }]}>
              <Check size={20} color={color.successText} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodySm" style={{ fontFamily: 'OpenSans_700Bold' }}>
                {t.home.lastOrderDone(lastDone.code)}
              </AppText>
              <AppText variant="caption" color="successText" style={{ fontFamily: 'OpenSans_600SemiBold' }}>
                {t.home.lastOrderPoints(formatDelta(lastDone.pointsEarned))}
              </AppText>
            </View>
            <ChevronRight size={20} color={color.textMuted} />
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  band: { position: 'absolute', left: 0, right: 0, top: 0, height: 300, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  content: { paddingHorizontal: space.screenX, paddingTop: space.lg, paddingBottom: space['3xl'], gap: space.xl },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quick: { flexDirection: 'row', justifyContent: 'space-between' },
  quickItem: { flex: 1, alignItems: 'center', gap: space.sm },
  quickIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastOrder: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: 14, borderRadius: radius.md },
  lastIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', ...shadow('card') },
});
