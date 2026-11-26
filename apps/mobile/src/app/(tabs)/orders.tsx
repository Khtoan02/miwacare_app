import { ShoppingBag } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useOrders } from '@/data/hooks';
import type { OrderStatus } from '@/domain/types';
import { t } from '@/i18n/vi';
import { formatDate, formatDelta, formatVnd } from '@/lib/format';
import { space, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Card, Empty, ErrorState, Loading, Pill, Screen } from '@/ui/kit';

const tone: Record<OrderStatus, 'success' | 'info' | 'danger'> = { done: 'success', shipping: 'info', cancelled: 'danger' };

export default function Orders() {
  const { color } = useTheme();
  const orders = useOrders();

  return (
    <Screen style={{ gap: space.lg, paddingTop: space.lg }}>
      <AppText variant="titleBrand" accessibilityRole="header">
        {t.orders.title}
      </AppText>
      <AppText variant="bodySm" color="textMuted">
        {t.orders.intro}
      </AppText>

      {orders.isLoading && <Loading />}
      {orders.error && <ErrorState onRetry={() => orders.refetch()} />}
      {orders.data?.length === 0 && <Empty text={t.orders.empty} />}

      <View style={{ gap: space.md }}>
        {orders.data?.map((o) => (
          <Card key={o.id} style={styles.card}>
            <View style={styles.row}>
              <AppText variant="bodyStrong" style={{ fontFamily: 'OpenSans_700Bold' }}>
                {o.code}
              </AppText>
              <Pill text={t.orders.status[o.status]} tone={tone[o.status]} />
            </View>
            <View style={[styles.row, { justifyContent: 'flex-start', gap: space.md }]}>
              <View style={[styles.thumb, { backgroundColor: color.bgTint }]}>
                <ShoppingBag size={24} color={color.text} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySm" style={{ fontFamily: 'OpenSans_600SemiBold' }}>
                  {o.items}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  {formatDate(o.at)} · {o.channel}
                </AppText>
              </View>
            </View>
            <View style={[styles.row, styles.foot, { borderTopColor: color.border }]}>
              <AppText variant="bodyStrong" style={{ fontFamily: 'OpenSans_700Bold' }}>
                {formatVnd(o.total)}
              </AppText>
              <AppText
                variant="bodySm"
                color={o.status === 'done' ? 'successText' : 'textMuted'}
                style={{ fontFamily: 'OpenSans_700Bold' }}>
                {o.pointsEarned != null
                  ? `${formatDelta(o.pointsEarned)} ${t.common.points}`
                  : o.status === 'cancelled'
                    ? t.orders.noPoints
                    : t.orders.pointsWhenDone}
              </AppText>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  thumb: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  foot: { paddingTop: 10, borderTopWidth: 1 },
});
