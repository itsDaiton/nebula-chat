import { useSyncExternalStore } from 'react';

const subscribe = (onTick: () => void) => {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
};

// Whole seconds, so the snapshot is stable between ticks.
const getSnapshot = () => Math.floor(Date.now() / 1000);

/** Whole seconds until `expiresAt`, re-read every second and never below zero. */
export const useSecondsLeft = (expiresAt: string) => {
  const now = useSyncExternalStore(subscribe, getSnapshot);
  return Math.max(0, Math.floor(Date.parse(expiresAt) / 1000) - now);
};
