import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTokens } from '@/hooks/use-tokens';

export interface ListRowCardProps {
  label: string;
  icon?: ReactNode;
  subtitle?: string;
  value?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  isGrouped?: boolean;
}

export function ListRowCard({
  label,
  icon,
  subtitle,
  value,
  trailing,
  onPress,
  showChevron = true,
  accessibilityLabel,
  style,
  isGrouped = false,
}: ListRowCardProps) {
  const { colors, radius, type, icons, touchTarget } = useTokens();

  const a11yLabel = accessibilityLabel ?? `${label}${value ? `, ${value}` : ''}${subtitle ? `, ${subtitle}` : ''}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.rowBase,
        {
          minHeight: Math.max(56, touchTarget.min),
          backgroundColor: colors.surface,
          borderRadius: isGrouped ? 0 : radius.lg,
          opacity: pressed && onPress ? 0.75 : 1,
        },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
        <View style={styles.labelColumn}>
          <Text style={[type.body, { color: colors.ink }]} numberOfLines={1}>
            {label}
          </Text>
          {subtitle ? (
            <Text style={[type.secondary, { marginTop: 2 }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.trailingGroup}>
          {value ? (
            <Text style={[type.secondary, { marginRight: 6 }]}>{value}</Text>
          ) : null}
          {trailing}
          {showChevron && onPress && !trailing ? (
            <ChevronRight
              size={18}
              color={colors.inkMutedText}
              strokeWidth={icons.strokeWidth}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * ListGroup
 * Container for Apple-style inset grouped list rows separated by hairline dividers (DESIGN.md §6.5).
 */
export interface ListGroupProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ListGroup({ children, style }: ListGroupProps) {
  const { colors, radius } = useTokens();
  const childrenArray = React.Children.toArray(children).filter(Boolean);

  return (
    <View
      style={[
        styles.groupContainer,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          {index > 0 ? (
            <View
              style={[
                styles.hairlineDivider,
                { backgroundColor: colors.hairline, marginLeft: 56 },
              ]}
            />
          ) : null}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rowBase: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrapper: {
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },
  labelColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  trailingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  groupContainer: {
    alignSelf: 'stretch',
  },
  hairlineDivider: {
    height: StyleSheet.hairlineWidth,
  },
});
