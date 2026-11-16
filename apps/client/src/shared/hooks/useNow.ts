import { useSyncExternalStore } from 'react';

const TICK_MS = 30_000;

const subscribe = (onTick: () => void) => {
  const timer = setInterval(onTick, TICK_MS);
  return () => clearInterval(timer);
};

// Rounded to the tick so the snapshot is stable between ticks.
const getSnapshot = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;

/** The current time in ms, re-read every 30 seconds so relative times keep moving. */
export const useNow = () => useSyncExternalStore(subscribe, getSnapshot);
