// Hiển thị trang blog trong app. Chỉ cho phép đi lại trong trang blog; link ngoài mở bằng trình duyệt.
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { t } from '@/i18n/vi';
import { BLOG_URL } from '@/lib/blog';
import { useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';

export function BlogView({ url }: { url: string }) {
  const { color } = useTheme();
  const [failed, setFailed] = useState(false);
  const [key, setKey] = useState(0);

  if (Platform.OS === 'web') {
    // Bản web (chỉ dùng khi phát triển): nhúng iframe.
    return <iframe src={url} style={{ flex: 1, border: 0, width: '100%', height: '100%' }} title={t.article.title} />;
  }
  if (failed) {
    return (
      <View style={styles.center}>
        <AppText color="textMuted" align="center">
          {t.article.loadError}
        </AppText>
        <Button
          label={t.common.retry}
          onPress={() => {
            setFailed(false);
            setKey((k) => k + 1);
          }}
        />
      </View>
    );
  }
  return (
    <WebView
      key={key}
      source={{ uri: url }}
      style={{ flex: 1, backgroundColor: color.bg }}
      startInLoadingState
      renderLoading={() => (
        <View style={[styles.center, StyleSheet.absoluteFill]}>
          <ActivityIndicator color={color.text} />
        </View>
      )}
      onError={() => setFailed(true)}
      onHttpError={(e) => e.nativeEvent.statusCode >= 500 && setFailed(true)}
      onShouldStartLoadWithRequest={(req) => {
        if (req.url.startsWith(BLOG_URL)) return true;
        if (/^https?:/i.test(req.url)) void WebBrowser.openBrowserAsync(req.url);
        return false;
      }}
      setSupportMultipleWindows={false}
      allowsBackForwardNavigationGestures
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
});
