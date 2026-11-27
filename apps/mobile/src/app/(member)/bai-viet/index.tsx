// Danh sách cẩm nang & ưu đãi (trang blog công khai, bản trong app).
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlogView } from '@/features/blog/BlogView';
import { t } from '@/i18n/vi';
import { blogHomeUrl } from '@/lib/blog';
import { space, useTheme } from '@/theme';
import { Header } from '@/ui/kit';

export default function Blog() {
  const { color } = useTheme();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ paddingHorizontal: space.screenX }}>
        <Header title={t.article.blogTitle} />
      </View>
      <BlogView url={blogHomeUrl()} />
    </SafeAreaView>
  );
}
