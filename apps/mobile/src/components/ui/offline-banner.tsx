import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { useIsOffline } from '@/lib/network';

export interface OfflineBannerProps {
  style?: StyleProp<ViewStyle>;
  forceVisible?: boolean;
}

/**
 * OfflineBanner (DESIGN.md §9)
 * Slim pill under the header: "Offline — changes will sync".
 * Visible when offline is detected or forced.
 */
export function OfflineBanner({ style, forceVisible = false }: OfflineBannerProps) {
  const isOffline = useIsOffline();
  const { colors, radius, spacing, type } = useTokens();

  if (!isOffline && !forceVisible) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.container, style]}
    >
      <View
        style={[
          styles.pill,
          {
            backgroundColor: colors.surfaceMuted,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
          },
        ]}
      >
        <WifiOff size={14} color={colors.inkMutedText} strokeWidth={2} />
        <Text style={[type.cardLabel, { color: colors.inkMutedText }]}>
          {t('common.offlineBanner')}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
