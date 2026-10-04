import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ScreenHeader } from '@/components/ui';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { pressLight } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth-store';

export default function HomeScreen() {
  const { colors } = useTokens();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title={t('common.appName')}
          subtitle={user ? user.displayName : undefined}
        />
        <View style={styles.spacer} />
        <Button
          label={t('workout.startTitle')}
          onPress={() => {
            pressLight();
            router.push('/workout/active');
          }}
        />
        <View style={styles.gap} />
        <Button label={t('auth.logout')} variant="secondary" onPress={() => void logout()} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  spacer: {
    flex: 1,
  },
  gap: {
    height: Spacing.three,
  },
});
