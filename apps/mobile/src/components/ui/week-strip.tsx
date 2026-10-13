import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Sheet } from './sheet';
import { useTokens } from '@/hooks/use-tokens';
import { pressLight, selectionTick } from '@/lib/haptics';

export interface WeekStripProps {
  /** Selected date in ISO format `YYYY-MM-DD`. */
  selectedDate: string;
  /** Callback emitted when a date is selected. */
  onSelectDate: (date: string) => void;
  /** Optional container style. */
  style?: StyleProp<ViewStyle>;
  /** Optional accessibility label. */
  accessibilityLabel?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

export function parseIsoDate(iso: string): Date {
  const parts = iso.split('-').map((p) => Number.parseInt(p, 10));
  const year = parts[0] ?? new Date().getFullYear();
  const month = (parts[1] ?? 1) - 1;
  const day = parts[2] ?? 1;
  return new Date(year, month, day, 12, 0, 0);
}

export function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getMondayOfWeek(d: Date): Date {
  const res = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  const day = res.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  res.setDate(res.getDate() + diff);
  return res;
}

export function WeekStrip({
  selectedDate,
  onSelectDate,
  style,
  accessibilityLabel = 'Date navigator',
}: WeekStripProps) {
  const { colors, radius, type, icons, touchTarget } = useTokens();

  const todayIso = useMemo(() => formatIsoDate(new Date()), []);
  const parsedSelected = useMemo(() => parseIsoDate(selectedDate), [selectedDate]);

  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
  const [viewMonday, setViewMonday] = useState<Date>(() => getMondayOfWeek(parsedSelected));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    return new Date(parsedSelected.getFullYear(), parsedSelected.getMonth(), 1, 12, 0, 0);
  });

  // Keep viewMonday aligned when selectedDate changes
  if (prevSelectedDate !== selectedDate) {
    setPrevSelectedDate(selectedDate);
    setViewMonday(getMondayOfWeek(parsedSelected));
  }

  // Sync calendar picker month whenever modal opens
  const handleOpenCalendar = () => {
    pressLight();
    setCalendarMonth(new Date(parsedSelected.getFullYear(), parsedSelected.getMonth(), 1, 12, 0, 0));
    setIsCalendarOpen(true);
  };

  const handleCloseCalendar = () => {
    setIsCalendarOpen(false);
  };

  // Week days for the currently visible week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(viewMonday.getFullYear(), viewMonday.getMonth(), viewMonday.getDate() + i, 12, 0, 0);
      const dateStr = formatIsoDate(d);
      return {
        dateStr,
        label: WEEKDAY_INITIALS[i],
        dayNum: String(d.getDate()),
        isToday: dateStr === todayIso,
        fullDayName: WEEKDAY_NAMES[i],
        monthName: SHORT_MONTH_NAMES[d.getMonth()],
      };
    });
  }, [viewMonday, todayIso]);

  // Header month/year label
  const headerLabel = useMemo(() => {
    const sunday = new Date(viewMonday.getFullYear(), viewMonday.getMonth(), viewMonday.getDate() + 6, 12, 0, 0);
    if (viewMonday.getMonth() === sunday.getMonth()) {
      return `${MONTH_NAMES[viewMonday.getMonth()]} ${viewMonday.getFullYear()}`;
    }
    if (viewMonday.getFullYear() === sunday.getFullYear()) {
      return `${SHORT_MONTH_NAMES[viewMonday.getMonth()]} - ${SHORT_MONTH_NAMES[sunday.getMonth()]} ${sunday.getFullYear()}`;
    }
    return `${SHORT_MONTH_NAMES[viewMonday.getMonth()]} ${viewMonday.getFullYear()} - ${SHORT_MONTH_NAMES[sunday.getMonth()]} ${sunday.getFullYear()}`;
  }, [viewMonday]);

  // Check if viewing current week
  const isViewingCurrentWeek = useMemo(() => {
    const todayMon = getMondayOfWeek(new Date());
    return formatIsoDate(viewMonday) === formatIsoDate(todayMon);
  }, [viewMonday]);

  // Navigation handlers
  const handlePrevWeek = () => {
    pressLight();
    const newSel = new Date(parsedSelected);
    newSel.setDate(newSel.getDate() - 7);
    onSelectDate(formatIsoDate(newSel));
  };

  const handleNextWeek = () => {
    pressLight();
    const newSel = new Date(parsedSelected);
    newSel.setDate(newSel.getDate() + 7);
    onSelectDate(formatIsoDate(newSel));
  };

  const handleJumpToToday = () => {
    selectionTick();
    onSelectDate(todayIso);
  };

  // Calendar month navigation
  const handlePrevMonth = () => {
    pressLight();
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1, 12, 0, 0));
  };

  const handleNextMonth = () => {
    pressLight();
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1, 12, 0, 0));
  };

  // Calendar grid calculation
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1, 12, 0, 0);
    const dayOfWeek = firstDay.getDay();
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const daysCount = new Date(year, month + 1, 0).getDate();

    const items: ({ dateStr: string; dayNum: number } | null)[] = [];
    for (let i = 0; i < offset; i += 1) {
      items.push(null);
    }
    for (let d = 1; d <= daysCount; d += 1) {
      const dt = new Date(year, month, d, 12, 0, 0);
      items.push({ dateStr: formatIsoDate(dt), dayNum: d });
    }
    const remainder = items.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i += 1) {
        items.push(null);
      }
    }
    return items;
  }, [calendarMonth]);

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.lg,
        },
        style,
      ]}
    >
      {/* Week Header Row */}
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open calendar picker, currently viewing ${headerLabel}`}
          onPress={handleOpenCalendar}
          hitSlop={8}
          style={({ pressed }) => [
            styles.monthTrigger,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.pill,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Calendar size={14} color={colors.ink} strokeWidth={icons.strokeWidth} />
          <Text
            style={[
              type.cardLabel,
              {
                fontSize: 13,
                fontWeight: '700',
                color: colors.ink,
              },
            ]}
          >
            {headerLabel}
          </Text>
          <ChevronDown size={14} color={colors.inkMutedText} strokeWidth={icons.strokeWidth} />
        </Pressable>

        <View style={styles.navActions}>
          {!isViewingCurrentWeek && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Jump to today"
              onPress={handleJumpToToday}
              hitSlop={6}
              style={({ pressed }) => [
                styles.todayChip,
                {
                  backgroundColor: colors.accent,
                  borderRadius: radius.pill,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[type.caption, { color: '#FFFFFF', fontWeight: '700', fontSize: 11 }]}>
                Today
              </Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            onPress={handlePrevWeek}
            hitSlop={8}
            style={({ pressed }) => [
              styles.navBtn,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.circle,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ChevronLeft size={16} color={colors.ink} strokeWidth={icons.strokeWidth} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next week"
            onPress={handleNextWeek}
            hitSlop={8}
            style={({ pressed }) => [
              styles.navBtn,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.circle,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ChevronRight size={16} color={colors.ink} strokeWidth={icons.strokeWidth} />
          </Pressable>
        </View>
      </View>

      {/* Week Days Strip */}
      <View style={styles.daysRow}>
        {weekDays.map((day) => {
          const isSelected = day.dateStr === selectedDate;

          return (
            <Pressable
              key={day.dateStr}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${day.fullDayName} ${day.dayNum} ${day.monthName}${day.isToday ? ', Today' : ''}`}
              onPress={() => {
                selectionTick();
                onSelectDate(day.dateStr);
              }}
              hitSlop={Math.max(0, (touchTarget.min - 44) / 2)}
              style={styles.dayHitArea}
            >
              <View
                style={[
                  styles.dayCircle,
                  {
                    backgroundColor: isSelected ? colors.accent : colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    type.caption,
                    {
                      color: isSelected ? '#FFFFFF' : colors.inkMutedText,
                      fontWeight: '600',
                      fontSize: 11,
                    },
                  ]}
                >
                  {day.label}
                </Text>
                <Text
                  style={[
                    type.cardLabel,
                    {
                      color: isSelected ? '#FFFFFF' : colors.ink,
                      fontWeight: '700',
                      fontSize: 14,
                      lineHeight: 18,
                    },
                  ]}
                >
                  {day.dayNum}
                </Text>

                {day.isToday && !isSelected && (
                  <View
                    style={[
                      styles.todayIndicatorDot,
                      {
                        backgroundColor: colors.accent,
                      },
                    ]}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Modal Calendar Sheet */}
      <Sheet
        visible={isCalendarOpen}
        onClose={handleCloseCalendar}
        title="Select Date"
        mode="picker"
        scrollable={false}
      >
        <View style={styles.calendarModalContent}>
          {/* Month Navigation */}
          <View style={styles.monthNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={handlePrevMonth}
              hitSlop={8}
              style={({ pressed }) => [
                styles.monthNavArrow,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.circle,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <ChevronLeft size={18} color={colors.ink} strokeWidth={icons.strokeWidth} />
            </Pressable>

            <Text style={[type.cardLabel, { fontSize: 16, fontWeight: '700', color: colors.ink }]}>
              {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={handleNextMonth}
              hitSlop={8}
              style={({ pressed }) => [
                styles.monthNavArrow,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.circle,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <ChevronRight size={18} color={colors.ink} strokeWidth={icons.strokeWidth} />
            </Pressable>
          </View>

          {/* Weekday Column Headers */}
          <View style={styles.calendarWeekdaysRow}>
            {WEEKDAY_INITIALS.map((w, idx) => (
              <View key={`header-${idx}`} style={styles.calendarGridCell}>
                <Text
                  style={[
                    type.caption,
                    {
                      color: colors.inkMutedText,
                      fontWeight: '600',
                      fontSize: 12,
                    },
                  ]}
                >
                  {w}
                </Text>
              </View>
            ))}
          </View>

          {/* Month Grid */}
          <View style={styles.calendarGrid}>
            {calendarGrid.map((item, idx) => {
              if (!item) {
                return <View key={`empty-${idx}`} style={styles.calendarGridCell} />;
              }

              const isSelected = item.dateStr === selectedDate;
              const isToday = item.dateStr === todayIso;

              return (
                <Pressable
                  key={item.dateStr}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${item.dateStr}${isToday ? ', Today' : ''}`}
                  onPress={() => {
                    selectionTick();
                    onSelectDate(item.dateStr);
                    handleCloseCalendar();
                  }}
                  style={styles.calendarGridCell}
                >
                  <View
                    style={[
                      styles.calendarDayCircle,
                      {
                        backgroundColor: isSelected
                          ? colors.accent
                          : isToday
                          ? colors.surfaceMuted
                          : 'transparent',
                        borderColor: isToday && !isSelected ? colors.accent : 'transparent',
                        borderWidth: isToday && !isSelected ? 1.5 : 0,
                        borderRadius: radius.circle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        type.cardLabel,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : isToday
                            ? colors.accent
                            : colors.ink,
                          fontWeight: isSelected || isToday ? '700' : '500',
                          fontSize: 15,
                        },
                      ]}
                    >
                      {item.dayNum}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Quick Jump Action */}
          <View style={styles.modalFooter}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Jump to today"
              onPress={() => {
                selectionTick();
                onSelectDate(todayIso);
                handleCloseCalendar();
              }}
              style={({ pressed }) => [
                styles.jumpTodayBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.cardSm,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Calendar size={16} color={colors.ink} strokeWidth={icons.strokeWidth} />
              <Text style={[type.cardLabel, { color: colors.ink, fontWeight: '600', fontSize: 13 }]}>
                Jump to Today
              </Text>
            </Pressable>
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignSelf: 'stretch',
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  monthTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayHitArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: 44,
    height: 52,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    position: 'relative',
  },
  todayIndicatorDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  calendarModalContent: {
    gap: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  monthNavArrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarWeekdaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarGridCell: {
    width: '14.2857%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    alignItems: 'center',
    paddingTop: 4,
  },
  jumpTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
});
