import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTokens } from '@/hooks/use-tokens';

export interface InsightCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionText?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  dismissAccessibilityLabel?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function InsightCard({
  title,
  description,
  icon,
  actionText,
  onAction,
  onDismiss,
  dismissAccessibilityLabel = 'Dismiss insight',
  accessibilityLabel,
  style,
}: InsightCardProps) {
  const { colors, radius, type, icons, touchTarget } = useTokens();

  const a11yLabel = accessibilityLabel ?? `${title}. ${description}`;

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={a11yLabel}
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: 20,
        },
        style,
      ]}
    >
      {/* Top right dismiss button */}
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dismissAccessibilityLabel}
          onPress={onDismiss}
          hitSlop={Math.max(0, (touchTarget.min - 28) / 2)}
          style={({ pressed }) => [
            styles.dismissButton,
            {
              backgroundColor: colors.surfaceMuted,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <X size={14} color={colors.ink} strokeWidth={icons.strokeWidth} />
        </Pressable>
      ) : null}

      <View style={styles.cardContent}>
        {/* Left tile */}
        {icon ? (
          <View
            style={[
              styles.iconTile,
              {
                backgroundColor: colors.accentSoft,
                borderRadius: radius.md,
              },
            ]}
          >
            {icon}
          </View>
        ) : null}

        {/* Right content column */}
        <View style={styles.textColumn}>
          <Text style={[type.body, styles.boldTitle, { color: colors.ink }]}>
            {title}
          </Text>
          <Text style={[type.secondary, { color: colors.inkMutedText, marginTop: 4 }]}>
            {description}
          </Text>

          {actionText && onAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={actionText}
              onPress={onAction}
              hitSlop={Math.max(0, (touchTarget.min - 24) / 2)}
              style={({ pressed }) => [
                styles.actionPressable,
                { minHeight: 36, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text
                style={[
                  type.body,
                  { color: colors.accentText, fontWeight: '600' },
                ]}
              >
                {actionText}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: 'relative',
    alignSelf: 'stretch',
  },
  dismissButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconTile: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textColumn: {
    flex: 1,
    paddingRight: 16,
  },
  boldTitle: {
    fontWeight: '600',
  },
  actionPressable: {
    marginTop: 8,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
