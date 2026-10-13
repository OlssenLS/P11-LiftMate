/**
 * ExercisePicker — canonical bottom-sheet modal to search the exercise DB and pick one.
 *
 * Built on Sheet (DESIGN.md §6.9) with mode="picker".
 * Handles the four component states (ui-ux steering): loading, error, empty,
 * and success. Token-driven; copy via `t()`.
 */
import type { Exercise } from '@liftmate/shared';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Sheet } from '@/components/ui';
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
  const { colors, radius, spacing, touchTarget, fontSize, fontWeight } = useTokens();
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
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('workout.pickExercise')}
      mode="picker"
      scrollable={false}
      style={styles.sheetSurface}
    >
      <View style={{ gap: spacing.md, flex: 1, minHeight: 0 }}>
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
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing.md }}
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
                  pressed ? { opacity: 0.9, backgroundColor: colors.surfaceMuted } : null,
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
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheetSurface: {
    height: '80%',
    maxHeight: '85%',
  },
  state: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
});
