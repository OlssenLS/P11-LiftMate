/**
 * ExercisePicker — bottom-sheet modal to search the exercise DB and pick one.
 *
 * Handles the four component states (ui-ux steering): loading, error, empty,
 * and success. Token-driven; copy via `t()`.
 */
import type { Exercise } from '@liftmate/shared';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { useExerciseSearch } from '@/features/workout/use-workout-queries';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { selectionTick } from '@/lib/haptics';

export type ExercisePickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
};

export function ExercisePicker({ visible, onClose, onSelect }: ExercisePickerProps) {
  const { colors, radius, spacing, touchTarget, fontSize, fontWeight, alpha } = useTokens();
  const [query, setQuery] = useState('');
  const { data, isLoading, isError, refetch } = useExerciseSearch(
    query.trim() ? { q: query.trim() } : {},
  );

  const handleSelect = (exercise: Exercise) => {
    selectionTick();
    onSelect(exercise);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(150)}
        style={[styles.backdrop, { backgroundColor: alpha(colors.ink, 0.4) }]}
      >
        <Pressable style={styles.backdropFill} accessibilityLabel={t('workout.close')} onPress={onClose} />
        <Animated.View
          entering={SlideInDown.duration(240)}
          exiting={SlideOutDown.duration(180)}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              padding: spacing.xl,
              gap: spacing.lg,
            },
          ]}
        >
          <Text style={{ color: colors.ink, fontSize: fontSize.title, fontWeight: fontWeight.bold }}>
            {t('workout.pickExercise')}
          </Text>

          <TextInput
            placeholder={t('workout.searchPlaceholder')}
            placeholderTextColor={colors.inkMutedText}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            style={{
              minHeight: touchTarget.min,
              borderRadius: radius.cardSm,
              borderWidth: 1,
              borderColor: colors.hairline,
              backgroundColor: colors.surface,
              color: colors.ink,
              paddingHorizontal: spacing.lg,
              fontSize: fontSize.body,
            }}
          />

          {isLoading ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : isError ? (
            <View style={styles.state}>
              <Text style={{ color: colors.danger, fontSize: fontSize.body }}>
                {t('common.somethingWentWrong')}
              </Text>
              <Pressable onPress={() => void refetch()} accessibilityRole="button">
                <Text style={{ color: colors.accent, fontSize: fontSize.body, fontWeight: fontWeight.semibold }}>
                  {t('common.retry')}
                </Text>
              </Pressable>
            </View>
          ) : !data || data.length === 0 ? (
            <View style={styles.state}>
              <Text style={{ color: colors.inkMutedText, fontSize: fontSize.body }}>
                {t('workout.noResults')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 360 }}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => [
                    {
                      minHeight: touchTarget.min,
                      borderRadius: radius.cardSm,
                      borderWidth: 1,
                      borderColor: colors.hairline,
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.md,
                      backgroundColor: colors.surface,
                      justifyContent: 'center',
                    },
                    pressed ? { opacity: 0.9 } : null,
                  ]}
                >
                  <Text style={{ color: colors.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.inkMutedText, fontSize: fontSize.label, marginTop: 2 }}>
                    {item.primaryMuscle} · {item.equipment}
                  </Text>
                </Pressable>
              )}
            />
          )}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              {
                minHeight: touchTarget.min,
                borderRadius: radius.pill,
                backgroundColor: colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: spacing.md,
              },
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Text style={{ color: colors.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold }}>
              {t('workout.close')}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: { width: '100%' },
  state: { paddingVertical: 32, alignItems: 'center', gap: 12 },
});
