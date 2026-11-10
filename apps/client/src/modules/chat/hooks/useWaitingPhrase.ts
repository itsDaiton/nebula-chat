import { useSyncExternalStore } from 'react';
import { useAppearanceStore } from '@/shared/stores/useAppearanceStore';
import { pickWaitingPhrase } from '@/modules/chat/utils/pickWaitingPhrase';
import { WAITING_PHRASES } from '@/waitingPhrases';

const ROTATE_MS = 3000;

let current: string = pickWaitingPhrase(WAITING_PHRASES);

const prefersReducedMotion = () => {
  const { motion } = useAppearanceStore.getState();
  return (
    motion === 'reduced' ||
    (motion === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
};

// The first subscriber of a wait picks afresh; the module variable keeps the snapshot stable between ticks.
const subscribe = (onTick: () => void) => {
  current = pickWaitingPhrase(WAITING_PHRASES, current);
  if (prefersReducedMotion()) return () => {};
  const timer = setInterval(() => {
    current = pickWaitingPhrase(WAITING_PHRASES, current);
    onTick();
  }, ROTATE_MS);
  return () => clearInterval(timer);
};

const getSnapshot = () => current;

/** The Waiting phrase to show, swapped every 3 seconds unless motion is reduced. */
export const useWaitingPhrase = () => useSyncExternalStore(subscribe, getSnapshot);
