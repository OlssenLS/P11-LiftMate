/**
 * DatePicker — token-driven modal date picker.
 *
 * A clean, brand-consistent alternative to a raw text field or the platform's
 * native picker: three scrollable wheels (year / month / day) rendered inside a
 * bottom-sheet modal that slides up with a dimmed backdrop.
 *
 * Design directives honoured:
 * - Colours / spacing / radius / type come exclusively from `@liftmate/shared`
 *   tokens via `useTokens()` — no hard-coded hex or magic numbers.
 * - Every wheel row is ≥ 48dp (`touchTarget.min`).
 * - Haptic selection tick on each change; medium impact on confirm (ui-ux §).
 * - All copy is passed in already-translated (callers use `t('...')`).
 *
 * The caller owns the value: `value` is an ISO `YYYY-MM-DD` string (or '') and
 * `onChange` emits the same shape so it drops straight into the existing form.
 */
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { pressMedium, selectionTick } from '@/lib/haptics';

export type DatePickerProps = {
  /** Already-translated field label. */
  label?: string;
  /** Already-translated placeholder shown when no date is set. */
  placeholder?: string;
  /** Current value as an ISO `YYYY-MM-DD` string, or '' when unset. */
  value: string;
  /** Emits the selected date as an ISO `YYYY-MM-DD` string. */
  onChange: (value: string) => void;
  /** Already-translated error message; also recolours the border. */
  error?: string;
  /** Oldest selectable year. Defaults to 120 years ago. */
  minYear?: number;
  /** Newest selectable year. Defaults to the current year. */
  maxYear?: number;
};

const MONTH_KEYS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;

const ROW_HEIGHT = 48;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function parseIso(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
}

export function DatePicker({
  label,
  placeholder,
  value,
  onChange,
  error,
  minYear,
  maxYear,
}: DatePickerProps) {
  const { colors, radius, spacing, touchTarget, fontSize, fontWeight, alpha } = useTokens();

  const now = new Date();
  const resolvedMaxYear = maxYear ?? now.getFullYear();
  const resolvedMinYear = minYear ?? resolvedMaxYear - 120;

  const parsed = parseIso(value);
  const defaultDraft = {
    year: parsed?.year ?? resolvedMaxYear - 20,
    month: parsed?.month ?? 0,
    day: parsed?.day ?? 1,
  };

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(defaultDraft);

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = resolvedMaxYear; y >= resolvedMinYear; y -= 1) {
      out.push(y);
    }
    return out;
  }, [resolvedMaxYear, resolvedMinYear]);

  const days = useMemo(() => {
    const count = daysInMonth(draft.year, draft.month);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [draft.year, draft.month]);

  const openModal = () => {
    setDraft(parseIso(value) ?? defaultDraft);
    pressMedium();
    setOpen(true);
  };

  const confirm = () => {
    const safeDay = Math.min(draft.day, daysInMonth(draft.year, draft.month));
    onChange(`${draft.year}-${pad(draft.month + 1)}-${pad(safeDay)}`);
    pressMedium();
    setOpen(false);
  };

  const cancel = () => {
    setOpen(false);
  };

  const borderColor = error ? colors.danger : colors.inkMuted;

  const displayValue = parsed
    ? `${t(`datePicker.months.${MONTH_KEYS[parsed.month]}`)} ${parsed.day}, ${parsed.year}`
    : '';

  const triggerStyle: ViewStyle = {
    minHeight: touchTarget.min,
    borderRadius: radius.cardSm,
    borderWidth: 1.5,
    borderColor,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  };

  const columnLabelStyle = {
    color: colors.inkMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: spacing.xs,
    textAlign: 'center' as const,
  };

  const renderWheel = (
    items: { key: string; display: string; selected: boolean; onPress: () => void }[],
  ) => (
    <ScrollView
      style={styles.wheel}
      contentContainerStyle={{ paddingVertical: spacing.sm }}
      showsVerticalScrollIndicator={false}
    >
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityState={{ selected: item.selected }}
          onPress={item.onPress}
          style={[
            styles.wheelRow,
            {
              borderRadius: radius.cardSm,
              backgroundColor: item.selected ? colors.ink : 'transparent',
            },
          ]}
        >
          <Text
            style={{
              color: item.selected ? colors.surface : colors.ink,
              fontSize: fontSize.body,
              fontWeight: item.selected ? fontWeight.semibold : fontWeight.regular,
            }}
          >
            {item.display}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { gap: spacing.xs }]}>
      {label ? (
        <Text
          style={{
            color: colors.inkMuted,
            fontSize: fontSize.label,
            fontWeight: fontWeight.semibold,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {label}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: displayValue || placeholder || '' }}
        onPress={openModal}
        style={({ pressed }) => [triggerStyle, pressed ? styles.pressed : null]}
      >
        <Text
          style={{
            color: displayValue ? colors.ink : colors.inkMuted,
            fontSize: fontSize.body,
            fontWeight: fontWeight.regular,
          }}
        >
          {displayValue || placeholder || ''}
        </Text>
      </Pressable>

      {error ? (
        <Text
          style={{ color: colors.danger, fontSize: fontSize.label, fontWeight: fontWeight.medium }}
        >
          {error}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType="none" onRequestClose={cancel}>
        <Animated.View
          entering={FadeIn.duration(150)}
          style={[styles.backdrop, { backgroundColor: alpha(colors.ink, 0.4) }]}
        >
          <Pressable style={styles.backdropFill} accessibilityLabel={t('common.cancel')} onPress={cancel} />
          <Animated.View
            entering={SlideInDown.duration(240)}
            exiting={SlideOutDown.duration(180)}
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.cardLg,
                borderTopRightRadius: radius.cardLg,
                padding: spacing.xl,
                gap: spacing.lg,
              },
            ]}
          >
            <Text
              style={{ color: colors.ink, fontSize: fontSize.title, fontWeight: fontWeight.bold }}
            >
              {label ?? t('datePicker.title')}
            </Text>

            <View style={[styles.wheels, { gap: spacing.md }]}>
              <View style={styles.column}>
                <Text style={columnLabelStyle}>{t('datePicker.month')}</Text>
                {renderWheel(
                  MONTH_KEYS.map((key, idx) => ({
                    key,
                    display: t(`datePicker.months.${key}`),
                    selected: draft.month === idx,
                    onPress: () => {
                      selectionTick();
                      setDraft((d) => ({
                        ...d,
                        month: idx,
                        day: Math.min(d.day, daysInMonth(d.year, idx)),
                      }));
                    },
                  })),
                )}
              </View>

              <View style={styles.column}>
                <Text style={columnLabelStyle}>{t('datePicker.day')}</Text>
                {renderWheel(
                  days.map((d) => ({
                    key: `d-${d}`,
                    display: String(d),
                    selected: draft.day === d,
                    onPress: () => {
                      selectionTick();
                      setDraft((prev) => ({ ...prev, day: d }));
                    },
                  })),
                )}
              </View>

              <View style={styles.column}>
                <Text style={columnLabelStyle}>{t('datePicker.year')}</Text>
                {renderWheel(
                  years.map((y) => ({
                    key: `y-${y}`,
                    display: String(y),
                    selected: draft.year === y,
                    onPress: () => {
                      selectionTick();
                      setDraft((prev) => ({
                        ...prev,
                        year: y,
                        day: Math.min(prev.day, daysInMonth(y, prev.month)),
                      }));
                    },
                  })),
                )}
              </View>
            </View>

            <View style={[styles.actions, { gap: spacing.md }]}>
              <Pressable
                accessibilityRole="button"
                onPress={cancel}
                style={({ pressed }) => [
                  styles.action,
                  {
                    minHeight: touchTarget.min,
                    borderRadius: radius.button,
                    borderWidth: 1.5,
                    borderColor: colors.ink,
                    backgroundColor: colors.surface,
                  },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={{ color: colors.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold }}
                >
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={confirm}
                style={({ pressed }) => [
                  styles.action,
                  {
                    minHeight: touchTarget.min,
                    borderRadius: radius.button,
                    backgroundColor: colors.accent,
                  },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={{ color: colors.surface, fontSize: fontSize.body, fontWeight: fontWeight.semibold }}
                >
                  {t('common.done')}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch' },
  pressed: { opacity: 0.85 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: { width: '100%' },
  wheels: { flexDirection: 'row' },
  column: { flex: 1 },
  wheel: { height: ROW_HEIGHT * 4 },
  wheelRow: {
    minHeight: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row' },
  action: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
