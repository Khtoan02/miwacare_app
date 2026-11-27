import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronRight, History, LifeBuoy, LogOut, MapPin, ShieldCheck, Trash2, User } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { api } from '@/data/api';
import { useMembership } from '@/data/hooks';
import { useAuth } from '@/features/auth/AuthContext';
import { registerPush, unregisterPush, usePushPrefs } from '@/features/push/push';
import { t } from '@/i18n/vi';
import { prettyPhone } from '@/lib/format';
import { palette, radius, space, tier, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Card, Screen } from '@/ui/kit';

function Row({ icon, label, onPress, danger, last }: { icon: ReactNode; label: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && { borderBottomWidth: 1, borderBottomColor: color.border }, pressed && { backgroundColor: color.bgTint }]}>
      {icon}
      <AppText variant="bodyStrong" color={danger ? 'dangerText' : 'text'} style={{ flex: 1, fontSize: 15 }}>
        {label}
      </AppText>
      {!danger && <ChevronRight size={18} color={color.textMuted} />}
    </Pressable>
  );
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  const { color } = useTheme();
  return (
    <View style={[styles.row, { minHeight: 60, borderBottomWidth: 1, borderBottomColor: color.border }]}>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" style={{ fontSize: 15 }}>
          {label}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {hint}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: color.actionPrimaryBg, false: color.border }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function Account() {
  const { color } = useTheme();
  const { signOut } = useAuth();
  const { member, progress } = useMembership();
  const qc = useQueryClient();
  const prefs = usePushPrefs(true);
  const marketing = useQuery({ queryKey: ['marketing'], queryFn: api.getMarketing });
  // Giá trị khách vừa bấm (hiện ngay) — nếu chưa bấm thì lấy từ máy chủ.
  const [override, setOverride] = useState<{ pushPoints?: boolean; pushPromo?: boolean }>({});
  const pushPoints = override.pushPoints ?? prefs.data?.pushPoints ?? true;
  const pushPromo = override.pushPromo ?? (!!marketing.data && (prefs.data?.pushPromo ?? true));
  const setPushPoints = (v: boolean) => setOverride((o) => ({ ...o, pushPoints: v }));
  const setPushPromo = (v: boolean) => setOverride((o) => ({ ...o, pushPromo: v }));

  // Máy chưa cho phép thông báo (hoặc bản web) → chỉ ghi đồng ý nhận tin, nhắc bật trong Cài đặt.
  async function savePrefs(next: { pushPoints?: boolean; pushPromo?: boolean }) {
    try {
      if (next.pushPromo !== undefined) await api.setMarketing(next.pushPromo);
      const saved = await registerPush(next);
      if (saved) qc.setQueryData(['pushPrefs'], saved);
      else if (Platform.OS !== 'web') Alert.alert(t.push.off);
      qc.invalidateQueries({ queryKey: ['marketing'] });
    } catch {
      Alert.alert(t.common.loadError);
    }
  }
  const soon = () => Alert.alert(t.account.comingSoon);
  const ic = color.text;
  const tc = progress ? tier[progress.current.colorKey] : null;

  return (
    <Screen style={{ gap: space.lg, paddingTop: space.lg }}>
      {member && (
        <View style={[styles.profile, { backgroundColor: color.bgTint }]}>
          <View style={[styles.avatar, { backgroundColor: palette.brand.sky['400'] }]}>
            <AppText variant="h2" rawColor={palette.brand.navy['900']} style={{ fontFamily: 'Comfortaa_700Bold' }}>
              {member.fullName.split(' ').slice(-2).map((w) => w[0]).join('')}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="h3" style={{ fontFamily: 'OpenSans_700Bold' }}>
              {member.fullName}
            </AppText>
            <AppText variant="bodySm" color="textMuted">
              {prettyPhone(member.phone)}
            </AppText>
          </View>
          {progress && tc && (
            <LinearGradient colors={[tc.from, tc.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tier}>
              <AppText variant="caption" rawColor={tc.text} style={{ fontFamily: 'Comfortaa_700Bold' }}>
                {progress.current.name}
              </AppText>
            </LinearGradient>
          )}
        </View>
      )}

      <Card style={{ overflow: 'hidden' }}>
        <Row icon={<User size={20} color={ic} />} label={t.account.profile} onPress={soon} />
        <Row icon={<MapPin size={20} color={ic} />} label={t.account.stores} onPress={soon} />
        <Row icon={<History size={20} color={ic} />} label={t.account.pointsHistory} onPress={() => router.push('/points')} last />
      </Card>

      <Card style={{ overflow: 'hidden' }}>
        <ToggleRow label={t.account.pushPoints} hint={t.account.pushPointsHint} value={pushPoints} onChange={(v) => { setPushPoints(v); void savePrefs({ pushPoints: v }); }} />
        <ToggleRow label={t.account.pushPromo} hint={t.account.pushPromoHint} value={pushPromo} onChange={(v) => { setPushPromo(v); void savePrefs({ pushPromo: v }); }} />
        <Row icon={<ShieldCheck size={20} color={ic} />} label={t.account.privacy} onPress={soon} last />
      </Card>

      <Card style={{ overflow: 'hidden' }}>
        <Row icon={<LifeBuoy size={20} color={ic} />} label={t.account.support} onPress={soon} />
        <Row
          icon={<LogOut size={20} color={ic} />}
          label={t.account.signOut}
          onPress={async () => {
            await unregisterPush(); // F-06: máy này thôi nhận thông báo của tài khoản
            await signOut();
            router.replace('/login');
          }}
        />
        <Row icon={<Trash2 size={20} color={color.dangerText} />} label={t.account.deleteAccount} onPress={soon} danger last />
      </Card>

      <AppText variant="caption" color="textMuted" align="center">
        {t.account.version(Constants.expoConfig?.version ?? '1.0.0')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg },
  avatar: { width: 60, height: 60, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  tier: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingHorizontal: 16 },
});
