import React, { type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleButton } from './circle-button';
import { useTokens } from '@/hooks/use-tokens';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  mode?: 'edit' | 'picker' | 'custom';
  children: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
}

export function Sheet({
  visible,
  onClose,
  onConfirm,
  title,
  mode = 'custom',
  children,
  accessibilityLabel,
  style,
  contentContainerStyle,
  scrollable = true,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const { colors, radius, type, spacing } = useTokens();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Scrim backdrop */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss sheet"
          onPress={onClose}
          style={[styles.scrim, { backgroundColor: colors.scrim }]}
        />

        {/* Sheet container */}
        <View
          accessibilityRole="none"
          accessibilityLabel={accessibilityLabel ?? title ?? 'Bottom Sheet'}
          style={[
            styles.sheetSurface,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
            style,
          ]}
        >
          {/* Header */}
          {mode === 'edit' ? (
            <View style={styles.editHeaderBlock}>
              <View style={styles.actionRow}>
                <CircleButton
                  variant="close"
                  accessibilityLabel="Discard changes"
                  onPress={onClose}
                />
                {onConfirm ? (
                  <CircleButton
                    variant="confirm"
                    accessibilityLabel="Apply changes"
                    onPress={onConfirm}
                  />
                ) : null}
              </View>
              {title ? (
                <Text style={[type.title, { marginTop: spacing.md }]}>
                  {title}
                </Text>
              ) : null}
            </View>
          ) : mode === 'picker' ? (
            <View style={styles.pickerHeaderRow}>
              <CircleButton
                variant="close"
                accessibilityLabel="Close"
                onPress={onClose}
              />
              {title ? (
                <Text style={[type.cardLabel, styles.centeredTitle]} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
              <View style={{ width: 44, height: 44 }} />
            </View>
          ) : title ? (
            <View style={styles.customHeaderRow}>
              <Text style={type.title}>{title}</Text>
              <CircleButton
                variant="close"
                accessibilityLabel="Close"
                onPress={onClose}
              />
            </View>
          ) : null}

          {/* Body Content */}
          {scrollable ? (
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.bodyContainer, contentContainerStyle]}>
              {children}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  sheetSurface: {
    maxHeight: '90%',
    paddingTop: 16,
    paddingHorizontal: 20,
    zIndex: 1,
  },
  bodyContainer: {
    flex: 1,
    minHeight: 0,
  },
  editHeaderBlock: {
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  centeredTitle: {
    textAlign: 'center',
    flex: 1,
  },
  customHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  contentContainer: {
    paddingBottom: 16,
  },
});
