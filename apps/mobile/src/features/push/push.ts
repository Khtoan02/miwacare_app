// Thông báo đẩy (F-15, F-33, F-56): xin quyền, lấy Expo push token, lưu lên máy chủ, mở đúng màn khi chạm thông báo.
// Chỉ chạy trên điện thoại thật bản build (Expo Go trên Android từ SDK 53 không nhận push).
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { api } from '@/data/api';
import type { PushPrefs } from '@/domain/types';
import { t } from '@/i18n/vi';

const TOKEN_KEY = 'miwacare.pushToken';
const supported = Platform.OS !== 'web';

if (supported) {
  // App đang mở vẫn hiện thông báo.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

export const getSavedPushToken = () => (supported ? SecureStore.getItemAsync(TOKEN_KEY) : Promise.resolve(null));

/** Xin quyền + lấy token. Trả về null nếu khách từ chối, máy ảo hoặc web. */
async function obtainToken(): Promise<string | null> {
  if (!supported || !Device.isDevice) return null;
  if (Platform.OS === 'android') {
    // Phải tạo kênh trước khi xin quyền / lấy token (Android 13+). Tên kênh hiện trong Cài đặt của máy.
    await Notifications.setNotificationChannelAsync('news', { name: t.push.channelNews, importance: AndroidImportance.HIGH });
    await Notifications.setNotificationChannelAsync('default', { name: t.push.channelAccount, importance: AndroidImportance.HIGH });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return token;
}

/** Đăng ký máy với máy chủ (an toàn khi gọi lại), trả về cài đặt thông báo của máy. */
export async function registerPush(prefs?: Partial<PushPrefs>): Promise<PushPrefs | null> {
  const token = (await getSavedPushToken()) ?? (await obtainToken());
  if (!token) return null;
  return api.registerDevice(token, prefs);
}

/** Gỡ máy khỏi danh sách nhận thông báo (khi đăng xuất, F-06). */
export async function unregisterPush() {
  const token = await getSavedPushToken();
  if (!token) return;
  await api.unregisterDevice(token).catch(() => undefined);
}

/** Cài đặt thông báo của máy; lần đầu sẽ xin quyền. `null` = máy chưa bật thông báo. */
export function usePushPrefs(enabled: boolean) {
  return useQuery({ queryKey: ['pushPrefs'], queryFn: () => registerPush().catch(() => null), enabled: enabled && supported, staleTime: Infinity, retry: false });
}

/** "miwacare://bai-viet/abc" → "/bai-viet/abc" */
function toPath(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const m = url.match(/^miwacare:\/\/(.+)$/);
  const path = m ? `/${m[1]}` : url.startsWith('/') ? url : null;
  return path && /^\/(bai-viet\/[a-z0-9-]+|hop-thu)$/.test(path) ? path : null;
}

/** Chạm vào thông báo → mở bài viết / hộp thư; làm mới hộp thư khi có thông báo mới. */
export function useNotificationObserver(signedIn: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!supported || !signedIn) return;
    const open = (n: Notifications.Notification) => {
      qc.invalidateQueries({ queryKey: ['inbox'] });
      const path = toPath(n.request.content.data?.url);
      if (path) router.push(path as never);
    };
    Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r?.notification) {
        open(r.notification);
        void Notifications.clearLastNotificationResponseAsync();
      }
    });
    const tap = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification));
    const received = Notifications.addNotificationReceivedListener(() => qc.invalidateQueries({ queryKey: ['inbox'] }));
    return () => {
      tap.remove();
      received.remove();
    };
  }, [signedIn, qc]);
}
