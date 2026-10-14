import React, { type ReactNode, useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  avoidKeyboard?: boolean;
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
  avoidKeyboard = true,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const { colors, radius, type, spacing } = useTokens();

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleScrimPress = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    onClose();
  };

  const flatStyle = StyleSheet.flatten(style);
  const hasExplicitHeight = Boolean(flatStyle?.height != null || flatStyle?.flex != null);

  const sheetBody = (
    <View style={styles.overlay}>
      {/* Scrim backdrop */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss sheet"
        onPress={handleScrimPress}
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
              style={hasExplicitHeight ? styles.bodyContainerFlex : styles.bodyContainerAuto}
              contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View
              style={[
                hasExplicitHeight ? styles.bodyContainerFlex : styles.bodyContainerAuto,
                contentContainerStyle,
              ]}
            >
              {children}
            </View>
          )}
        </View>
      </View>
  );

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
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={styles.keyboardAvoidingView}
        >
          {sheetBody}
        </KeyboardAvoidingView>
      ) : (
        sheetBody
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  sheetSurface: {
    width: '100%',
    maxHeight: '90%',
    paddingTop: 16,
    paddingHorizontal: 20,
    zIndex: 1,
  },
  bodyContainerFlex: {
    flex: 1,
    minHeight: 0,
  },
  bodyContainerAuto: {
    flexShrink: 1,
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
