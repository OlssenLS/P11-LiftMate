/**
 * Haptics helper — thin, safe wrapper around `expo-haptics`.
 *
 * Centralises the haptic vocabulary used for micro-interactions (brief §3 /
 * ui-ux steering): selection ticks for card/chip toggles, light impacts for
 * button presses, and success/error notifications for form completion.
 *
 * All calls are fire-and-forget and swallow errors so a device without a
 * haptic engine (or web) never throws.
 */
import * as Haptics from 'expo-haptics';

/** Light tick when toggling a selectable option (card/chip). */
export function selectionTick(): void {
  void Haptics.selectionAsync().catch(() => undefined);
}

/** Light impact for a primary/secondary button press. */
export function pressLight(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** Medium impact for a more significant tap (e.g. confirming a modal). */
export function pressMedium(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}

/** Success notification on a completed step / form. */
export function notifySuccess(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

/** Error notification on a failed submit / validation. */
export function notifyError(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
}
