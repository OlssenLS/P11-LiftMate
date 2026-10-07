import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleButton } from './circle-button';
import { useTokens } from '@/hooks/use-tokens';

/**
 * LargeTitleHeader (DESIGN.md §4 & §6.2)
 * Used on primary tab screens (Home, Train, Food, You).
 * Left-aligned large title with optional eyebrow and trailing slot (avatar or circle button).
 */
export interface LargeTitleHeaderProps {
  title: string;
  eyebrow?: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function LargeTitleHeader({
  title,
  eyebrow,
  trailing,
  style,
}: LargeTitleHeaderProps) {
  const insets = useSafeAreaInsets();
  const { type, layout, spacing } = useTokens();

  return (
    <View
      style={[
        styles.largeHeaderContainer,
        {
          paddingTop: Math.max(insets.top, spacing.md),
          paddingHorizontal: layout.screenPadding,
          paddingBottom: spacing.sm,
        },
        style,
      ]}
    >
      <View style={styles.largeHeaderRow}>
        <View style={styles.titleBlock}>
          {eyebrow ? (
            <Text style={[type.eyebrow, { marginBottom: spacing.xs }]}>
              {eyebrow}
            </Text>
          ) : null}
          <Text style={type.largeTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {trailing ? <View style={{ marginLeft: spacing.md }}>{trailing}</View> : null}
      </View>
    </View>
  );
}

/**
 * DetailHeader (DESIGN.md §4 & §6.2)
 * Detail screen header with leading circle back button, centered title, and optional trailing circle button.
 */
export interface DetailHeaderProps {
  title: string;
  onBack: () => void;
  backAccessibilityLabel?: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function DetailHeader({
  title,
  onBack,
  backAccessibilityLabel = 'Go back',
  trailing,
  style,
}: DetailHeaderProps) {
  const insets = useSafeAreaInsets();
  const { type, layout, spacing } = useTokens();

  return (
    <View
      style={[
        styles.detailHeaderContainer,
        {
          paddingTop: Math.max(insets.top, spacing.sm),
          paddingHorizontal: layout.screenPadding,
          paddingBottom: spacing.md,
        },
        style,
      ]}
    >
      <View style={styles.detailHeaderRow}>
        <CircleButton
          variant="default"
          icon="back"
          accessibilityLabel={backAccessibilityLabel}
          onPress={onBack}
        />
        <View style={styles.detailTitleWrapper}>
          <Text style={[type.cardLabel, styles.centeredTitle]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={styles.detailTrailingWrapper}>
          {trailing ?? <View style={{ width: 44, height: 44 }} />}
        </View>
      </View>
    </View>
  );
}

/**
 * SectionHeader (DESIGN.md §4 & §6.3)
 * Section title on the left, optional text action on the right.
 * Spacing: 28dp above, 12dp below.
 */
export interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onAction?: () => void;
  actionAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  actionText,
  onAction,
  actionAccessibilityLabel,
  style,
}: SectionHeaderProps) {
  const { type, layout, colors, touchTarget } = useTokens();

  return (
    <View
      style={[
        styles.sectionHeaderContainer,
        {
          marginTop: layout.sectionGap,
          marginBottom: layout.cardGap,
          paddingHorizontal: layout.screenPadding,
        },
        style,
      ]}
    >
      <Text style={type.sectionTitle}>{title}</Text>
      {actionText && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionAccessibilityLabel ?? actionText}
          onPress={onAction}
          hitSlop={Math.max(0, (touchTarget.min - 24) / 2)}
          style={({ pressed }) => [
            styles.actionPressable,
            { minHeight: touchTarget.min, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[type.body, { color: colors.accentText, fontWeight: '600' }]}>
            {actionText}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Legacy ScreenHeader preserved for backward compatibility */
export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ScreenHeader({ title, subtitle, action, style }: ScreenHeaderProps) {
  const { colors, spacing, fontSize, fontWeight } = useTokens();

  return (
    <View style={[styles.legacyContainer, { paddingVertical: spacing.lg, gap: spacing.xs }, style]}>
      <View style={styles.legacyRow}>
        <View style={styles.titleBlock}>
          <Text
            style={{ color: colors.ink, fontSize: fontSize.heading, fontWeight: fontWeight.bold }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                color: colors.inkMuted,
                fontSize: fontSize.body,
                fontWeight: fontWeight.regular,
                marginTop: spacing.xs,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action ? <View style={{ marginLeft: spacing.md }}>{action}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  largeHeaderContainer: {
    alignSelf: 'stretch',
  },
  largeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
  },
  detailHeaderContainer: {
    alignSelf: 'stretch',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailTitleWrapper: {
    flex: 1,
    paddingHorizontal: 12,
  },
  centeredTitle: {
    textAlign: 'center',
  },
  detailTrailingWrapper: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionPressable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  legacyContainer: {
    alignSelf: 'stretch',
  },
  legacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
