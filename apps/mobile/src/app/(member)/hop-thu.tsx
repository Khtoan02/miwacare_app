// Hộp thư (F-22): thông báo tài khoản, khuyến mãi, bài viết. Mở được từ nút chuông và từ thông báo đẩy.
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BookOpen, ChevronRight, Gift, Star } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/data/api';
import { useInbox } from '@/data/hooks';
import type { InboxItem } from '@/domain/types';
import { t } from '@/i18n/vi';
import { formatDayMonth } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Empty, ErrorState, Header, Loading, Screen } from '@/ui/kit';

const ICON = { transaction: Star, promo: Gift, article: BookOpen } as const;

export default function Inbox() {
  const { color } = useTheme();
  const qc = useQueryClient();
  const inbox = useInbox();
  const unread = (inbox.data ?? []).filter((m) => !m.read).length;

  async function open(m: InboxItem) {
    if (!m.read) {
      await api.markInboxRead(m.id).catch(() => undefined);
      qc.invalidateQueries({ queryKey: ['inbox'] });
    }
    if (m.slug) router.push({ pathname: '/bai-viet/[slug]', params: { slug: m.slug } });
    else if (m.kind === 'promo') router.push('/offers');
    else if (m.kind === 'transaction') router.push('/points');
  }

  async function readAll() {
    await api.markInboxRead().catch(() => undefined);
    qc.invalidateQueries({ queryKey: ['inbox'] });
  }

  return (
    <Screen style={{ gap: space.lg }}>
      <Header title={t.inbox.title} />
      <View style={styles.bar}>
        <AppText variant="bodySm" color="textMuted" style={{ flex: 1 }}>
          {unread ? t.inbox.unread(unread) : ' '}
        </AppText>
        {unread > 0 && (
          <Pressable accessibilityRole="button" onPress={readAll} hitSlop={8}>
            <AppText variant="bodySm" color="textLink" style={{ fontFamily: 'OpenSans_600SemiBold' }}>
              {t.inbox.readAll}
            </AppText>
          </Pressable>
        )}
      </View>

      <Pressable accessibilityRole="link" onPress={() => router.push('/bai-viet')} style={[styles.blog, { backgroundColor: color.bgTint }]}>
        <BookOpen size={22} color={color.text} />
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {t.inbox.allPosts}
        </AppText>
        <ChevronRight size={20} color={color.text} />
      </Pressable>

      {inbox.isLoading && <Loading />}
      {inbox.error && <ErrorState onRetry={() => inbox.refetch()} />}
      {inbox.data && inbox.data.length === 0 && <Empty text={t.inbox.empty} />}

      <View>
        {(inbox.data ?? []).map((m) => {
          const Icon = ICON[m.kind];
          return (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityState={{ selected: !m.read }}
              onPress={() => open(m)}
              style={[styles.item, { borderBottomColor: color.border }]}>
              <View style={[styles.icon, { backgroundColor: m.read ? color.bgTint : color.actionBrandBg }]}>
                <Icon size={20} color={color.text} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.titleRow}>
                  <AppText variant="caption" color="textMuted" style={{ flex: 1 }}>
                    {t.inbox.kind[m.kind]} · {formatDayMonth(m.at)}
                  </AppText>
                  {!m.read && <View style={[styles.dot, { backgroundColor: color.dangerSolid }]} />}
                </View>
                <AppText variant="bodyStrong" style={{ fontFamily: m.read ? 'OpenSans_600SemiBold' : 'OpenSans_700Bold' }}>
                  {m.title}
                </AppText>
                <AppText variant="bodySm" color="textMuted" numberOfLines={2}>
                  {m.body}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 24 },
  blog: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: 14, borderRadius: radius.lg },
  item: { flexDirection: 'row', gap: space.md, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
