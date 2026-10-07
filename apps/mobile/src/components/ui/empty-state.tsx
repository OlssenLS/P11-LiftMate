import React, { type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { FolderOpen } from 'lucide-react-native';
import { SecondaryButton } from './button';
import { useTokens } from '@/hooks/use-tokens';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionText?: string;
  onAction?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  title,
  description,
  icon,
  actionText,
  onAction,
  accessibilityLabel,
  style,
}: EmptyStateProps) {
  const { colors, type, spacing, icons } = useTokens();

  const a11yLabel =
    accessibilityLabel ?? `${title}${description ? `. ${description}` : ''}`;

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={a11yLabel}
      style={[styles.container, style]}
    >
      <View style={styles.iconContainer}>
        {icon ?? (
          <FolderOpen
            size={48}
            color={colors.inkMuted}
            strokeWidth={icons.strokeWidth}
          />
        )}
      </View>
      <Text style={[type.sectionTitle, styles.centerText, { color: colors.ink }]}>
        {title}
      </Text>
      {description ? (
        <Text
          style={[
            type.secondary,
            styles.centerText,
            { color: colors.inkMutedText, marginTop: spacing.xs },
          ]}
        >
          {description}
        </Text>
      ) : null}
      {actionText && onAction ? (
        <View style={[styles.actionWrapper, { marginTop: spacing.lg }]}>
          <SecondaryButton label={actionText} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignSelf: 'stretch',
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  actionWrapper: {
    width: '100%',
    maxWidth: 240,
  },
});
