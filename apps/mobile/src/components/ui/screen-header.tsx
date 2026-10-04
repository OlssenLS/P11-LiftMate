/**
 * ScreenHeader — top-of-screen title block.
 *
 * `title` and `subtitle` are already-translated strings (callers use `t('...')`).
 * An optional `action` node (e.g. a Button or icon) sits on the trailing side.
 * Type scale, colours and spacing come from tokens.
 */
import { type ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  style?: ViewStyle;
};

export function ScreenHeader({ title, subtitle, action, style }: ScreenHeaderProps) {
  const { colors, spacing, fontSize, fontWeight } = useTokens();

  return (
    <View style={[styles.container, { paddingVertical: spacing.lg, gap: spacing.xs }, style]}>
      <View style={styles.row}>
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
  container: {
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flexShrink: 1,
  },
});
