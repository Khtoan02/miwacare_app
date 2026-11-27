// Đọc một bài viết (F-23) — nội dung lấy từ trang blog công khai, mở được từ thông báo đẩy (miwacare://bai-viet/<slug>).
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlogView } from '@/features/blog/BlogView';
import { t } from '@/i18n/vi';
import { blogPostUrl } from '@/lib/blog';
import { space, useTheme } from '@/theme';
import { Header } from '@/ui/kit';

export default function Article() {
  const { color } = useTheme();
  const { slug = '' } = useLocalSearchParams<{ slug: string }>();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ paddingHorizontal: space.screenX }}>
        <Header title={t.article.title} />
      </View>
      <BlogView url={blogPostUrl(slug)} />
    </SafeAreaView>
  );
}
