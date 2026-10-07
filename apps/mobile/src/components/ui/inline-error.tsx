import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { SecondaryButton } from './button';

export interface InlineErrorProps {
  message?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * InlineError (DESIGN.md §9)
 * Inline card: short message + SecondaryButton "Try again".
 */
export function InlineError({
  message,
  onRetry,
  style,
}: InlineErrorProps) {
  const { colors, radius, spacing, type } = useTokens();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: colors.hairline,
          padding: spacing.lg,
          gap: spacing.md,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <AlertCircle size={20} color={colors.danger} strokeWidth={2} />
        <Text style={[type.body, { color: colors.ink, flex: 1, fontWeight: '500' }]}>
          {message ?? t('common.somethingWentWrong')}
        </Text>
      </View>
      {onRetry ? (
        <SecondaryButton
          label={t('common.retry')}
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
  },
});
