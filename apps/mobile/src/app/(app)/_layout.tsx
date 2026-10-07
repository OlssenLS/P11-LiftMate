import { useState } from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/ui';
import { TabBar, type TabKey } from '@/components/ui/tab-bar';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { CoachSheetContent } from './coach';

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const { layout } = useTokens();
  const [isCoachOpen, setIsCoachOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        tabBar={({ state, navigation }) => {
          const routeName = state.routes[state.index].name;
          const activeKey: TabKey =
            routeName === 'index'
              ? 'home'
              : (routeName as TabKey);

          return (
            <View
              pointerEvents="box-none"
              style={[
                styles.floatingContainer,
                {
                  bottom: Math.max(insets.bottom, 12),
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
                onCoachPress={() => setIsCoachOpen(true)}
                isCoachActive={isCoachOpen}
              />
            </View>
          );
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="train" options={{ title: 'Train' }} />
        <Tabs.Screen name="food" options={{ title: 'Food' }} />
        <Tabs.Screen name="you" options={{ title: 'You' }} />
        <Tabs.Screen name="coach" options={{ href: null, title: 'Coach' }} />
      </Tabs>

      {/* Full-Height Coach Sheet (DESIGN.md §5 & §7.8) */}
      <Sheet
        visible={isCoachOpen}
        onClose={() => setIsCoachOpen(false)}
        title={t('coach.title')}
        mode="picker"
      >
        <CoachSheetContent />
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
});
