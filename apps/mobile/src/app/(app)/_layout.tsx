import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar, type TabKey } from '@/components/ui/tab-bar';
import { useTokens } from '@/hooks/use-tokens';

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const { spacing } = useTokens();

  return (
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
                bottom: Math.max(insets.bottom, spacing.md),
                left: spacing.lg,
                right: spacing.lg,
              },
            ]}
          >
            <TabBar
              active={activeKey}
              onSelect={(key) => {
                const target = key === 'home' ? 'index' : key;
                navigation.navigate(target);
              }}
              style={styles.tabBar}
            />
          </View>
        );
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="train" options={{ title: 'Train' }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach' }} />
      <Tabs.Screen name="food" options={{ title: 'Food' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 100,
  },
  tabBar: {
    maxWidth: 520,
    width: '100%',
  },
});
