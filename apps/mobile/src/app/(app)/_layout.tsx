import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/ui';
import { TabBar, type TabKey } from '@/components/ui/tab-bar';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { useCoachStore } from '@/stores/coach-store';
import { CoachSheetContent } from './coach';

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const { layout } = useTokens();
  const isCoachOpen = useCoachStore((s) => s.isOpen);
  const openCoach = useCoachStore((s) => s.openCoach);
  const closeCoach = useCoachStore((s) => s.closeCoach);
  const prefillPrompt = useCoachStore((s) => s.prefillPrompt);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        tabBar={({ state, navigation }) => {
          const routeName = state.routes[state.index].name;
          const activeKey: TabKey | null =
            routeName === 'index'
              ? 'home'
              : routeName === 'train' || routeName === 'food' || routeName === 'insights'
              ? (routeName as TabKey)
              : null;

          return (
            <View
              pointerEvents="box-none"
              style={[
                styles.floatingContainer,
                {
                  bottom: Math.max(insets.bottom, 8) + 16,
                  paddingHorizontal: layout.screenPadding,
                },
              ]}
            >
              <TabBar
                active={activeKey}
                onSelect={(key) => {
                  const target = key === 'home' ? 'index' : key;
                  navigation.navigate(target);
                }}
                onCoachPress={() => openCoach()}
                isCoachActive={isCoachOpen}
              />
            </View>
          );
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="train" options={{ title: 'Train' }} />
        <Tabs.Screen name="food" options={{ title: 'Food' }} />
        <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
        <Tabs.Screen name="you" options={{ href: null, title: 'You' }} />
        <Tabs.Screen name="coach" options={{ href: null, title: 'Coach' }} />
      </Tabs>

      {/* Full-Height Coach Sheet (DESIGN.md §5 & §7.8) */}
      <Sheet
        visible={isCoachOpen}
        onClose={closeCoach}
        title={t('coach.title')}
        mode="picker"
        scrollable={false}
        style={styles.coachSheetSurface}
      >
        <CoachSheetContent key={prefillPrompt ?? 'default'} prefill={prefillPrompt} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  coachSheetSurface: {
    height: '90%',
  },
});
