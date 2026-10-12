import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from './use-tokens';

/**
 * Calculates bottom scroll padding for screens so content is never hidden
 * behind the floating tab bar (DESIGN.md §4: tabBarHeight + 24 + bottomInset).
 */
export function useTabScrollPadding(): number {
  const insets = useSafeAreaInsets();
  const { layout } = useTokens();
  // tabBarHeight (64) + floating bar bottom margin (inset + 16) + extra clearance (24)
  return layout.tabBarHeight + Math.max(insets.bottom, 8) + 40;
}
