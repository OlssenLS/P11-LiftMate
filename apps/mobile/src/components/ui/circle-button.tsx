import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ChevronLeft, Plus, X, Check } from 'lucide-react-native';
import { useTokens } from '@/hooks/use-tokens';

export type CircleButtonVariant = 'default' | 'confirm' | 'close';
export type CircleButtonIcon = 'back' | 'add' | 'close' | 'confirm';

export interface CircleButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  variant?: CircleButtonVariant;
  icon?: CircleButtonIcon | React.ReactNode;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: number;
}

export function CircleButton({
  onPress,
  variant = 'default',
  icon,
  accessibilityLabel,
  disabled = false,
  style,
  size = 44,
}: CircleButtonProps) {
  const { colors, floatingShadow, icons, touchTarget } = useTokens();

  const isConfirm = variant === 'confirm';
  const isClose = variant === 'close';

  const iconColor = isConfirm ? '#FFFFFF' : colors.ink;
  const iconSize = 22;
  const strokeWidth = icons.strokeWidth;

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (icon === 'back') {
      return <ChevronLeft size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
    }
    if (icon === 'add') {
      return <Plus size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
    }
    if (icon === 'close' || isClose) {
      return <X size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
    }
    if (icon === 'confirm' || isConfirm) {
      return <Check size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
    }
    return null;
  };

  const backgroundColor = isConfirm ? colors.accent : colors.surface;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={Math.max(0, (touchTarget.min - size) / 2)}
      style={({ pressed }) => [
        styles.hitArea,
        { minWidth: touchTarget.min, minHeight: touchTarget.min },
      ]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.visual,
            floatingShadow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor,
              opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
            style,
          ]}
        >
          {renderIcon()}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  visual: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
