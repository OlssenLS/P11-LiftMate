/**
 * Rest timer (brief §4 rule 13): computed from an absolute end timestamp, not
 * from `setInterval` accumulation, so it stays correct across backgrounding and
 * app kill. The interval only drives re-render; remaining time is always
 * `endAt - Date.now()`.
 *
 * A local notification is scheduled for `endAt` so the user is alerted even if
 * the app is backgrounded; it's cancelled if the timer is stopped early.
 */
import { isRunningInExpoGo } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

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

type NotificationsModule = typeof import('expo-notifications');
let notificationsModule: NotificationsModule | null = null;
let handlerConfigured = false;

function getNotifications(): NotificationsModule | null {
  // In Expo SDK 53+, expo-notifications throws a fatal error on module import
  // when running inside Expo Go on Android. We avoid loading it in that environment.
  if (isRunningInExpoGo() && Platform.OS === 'android') {
    return null;
  }
  if (!notificationsModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      notificationsModule = require('expo-notifications') as NotificationsModule;
      if (!handlerConfigured && notificationsModule?.setNotificationHandler) {
        notificationsModule.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        handlerConfigured = true;
      }
    } catch {
      notificationsModule = null;
    }
  }
  return notificationsModule;
}

async function scheduleFinishNotification(seconds: number): Promise<string | null> {
  try {
    const notifications = getNotifications();
    if (!notifications) {
      return null;
    }
    const granted = await ensurePermission();
    if (!granted) {
      return null;
    }
    return await notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest complete',
        body: 'Time for your next set.',
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
      },
    });
  } catch {
    return null;
  }
}

async function ensurePermission(): Promise<boolean> {
  try {
    const notifications = getNotifications();
    if (!notifications) {
      return false;
    }
    const current = await notifications.getPermissionsAsync();
    if (current.granted) {
      return true;
    }
    const req = await notifications.requestPermissionsAsync();
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
        const notifications = getNotifications();
        if (notifications) {
          await notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
        }
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
