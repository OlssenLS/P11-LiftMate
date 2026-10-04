/**
 * Rest timer (brief §4 rule 13): computed from an absolute end timestamp, not
 * from `setInterval` accumulation, so it stays correct across backgrounding and
 * app kill. The interval only drives re-render; remaining time is always
 * `endAt - Date.now()`.
 *
 * A local notification is scheduled for `endAt` so the user is alerted even if
 * the app is backgrounded; it's cancelled if the timer is stopped early.
 */
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';

import { notifySuccess } from '@/lib/haptics';

export const REST_PRESETS = [30, 60, 90, 120, 180] as const;
export type RestPreset = (typeof REST_PRESETS)[number];

export interface RestTimerState {
  /** Seconds remaining (0 when idle or finished). */
  remaining: number;
  /** Total seconds the current rest was started with. */
  duration: number;
  running: boolean;
  start: (seconds: number) => void;
  stop: () => void;
}

/** Configure how notifications present while the app is foregrounded. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function scheduleFinishNotification(seconds: number): Promise<string | null> {
  try {
    const granted = await ensurePermission();
    if (!granted) {
      return null;
    }
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest complete',
        body: 'Time for your next set.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
      },
    });
  } catch {
    return null;
  }
}

async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      return true;
    }
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

export function useRestTimer(): RestTimerState {
  const [remaining, setRemaining] = useState(0);
  const [duration, setDuration] = useState(0);
  const [running, setRunning] = useState(false);

  const endAtRef = useRef<number | null>(null);
  const notificationIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedRef = useRef(false);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cancelNotification = useCallback(async () => {
    if (notificationIdRef.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
      } catch {
        // ignore
      }
      notificationIdRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTick();
    void cancelNotification();
    endAtRef.current = null;
    firedRef.current = false;
    setRunning(false);
    setRemaining(0);
    setDuration(0);
  }, [clearTick, cancelNotification]);

  const start = useCallback(
    (seconds: number) => {
      clearTick();
      void cancelNotification();
      firedRef.current = false;
      const endAt = Date.now() + seconds * 1000;
      endAtRef.current = endAt;
      setDuration(seconds);
      setRemaining(seconds);
      setRunning(true);

      void scheduleFinishNotification(seconds).then((id) => {
        notificationIdRef.current = id;
      });

      intervalRef.current = setInterval(() => {
        const end = endAtRef.current;
        if (end == null) {
          return;
        }
        const left = Math.max(0, Math.round((end - Date.now()) / 1000));
        setRemaining(left);
        if (left <= 0 && !firedRef.current) {
          firedRef.current = true;
          clearTick();
          setRunning(false);
          notifySuccess();
        }
      }, 250);
    },
    [clearTick, cancelNotification],
  );

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      clearTick();
      void cancelNotification();
    };
  }, [clearTick, cancelNotification]);

  return { remaining, duration, running, start, stop };
}
