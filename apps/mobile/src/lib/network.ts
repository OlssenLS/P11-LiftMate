import { useEffect, useState } from 'react';
import { onlineManager } from '@tanstack/react-query';

type NetworkListener = (isOffline: boolean) => void;

let offlineState = false;
const listeners = new Set<NetworkListener>();

function notify() {
  listeners.forEach((listener) => listener(offlineState));
}

export function setOffline(offline: boolean) {
  if (offlineState !== offline) {
    offlineState = offline;
    onlineManager.setOnline(!offline);
    notify();
  }
}

export function getIsOffline(): boolean {
  return offlineState;
}

// Hook up TanStack Query's onlineManager
onlineManager.subscribe((isOnline) => {
  if (offlineState === isOnline) {
    offlineState = !isOnline;
    notify();
  }
});

/**
 * React hook to observe offline status.
 */
export function useIsOffline(): boolean {
  const [offline, setLocalOffline] = useState(offlineState);

  useEffect(() => {
    const handler: NetworkListener = (val) => setLocalOffline(val);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return offline;
}
