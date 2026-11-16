import { useSyncExternalStore } from 'react';
import { useAppearanceStore } from '@/shared/stores/useAppearanceStore';
import { pickWaitingPhrase } from '@/modules/chat/utils/pickWaitingPhrase';
import { WAITING_PHRASES } from '@/waitingPhrases';

const ROTATE_MS = 3000;

let current: string | undefined;

const prefersReducedMotion = () => {
  const { motion } = useAppearanceStore.getState();
  return (
    motion === 'reduced' ||
    (motion === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
};

// Re-picking when a wait ends makes the next wait's first frame fresh and different from this one's last.
const subscribe = (onTick: () => void) => {
  const rotate = () => {
    current = pickWaitingPhrase(WAITING_PHRASES, current);
  };
  const timer = prefersReducedMotion()
    ? undefined
    : setInterval(() => {
        rotate();
        onTick();
      }, ROTATE_MS);
  return () => {
    clearInterval(timer);
    rotate();
  };
};

const getSnapshot = () => {
  current ??= pickWaitingPhrase(WAITING_PHRASES);
  return current;
};

/** The Waiting phrase to show, swapped every 3 seconds unless motion is reduced. */
export const useWaitingPhrase = () => useSyncExternalStore(subscribe, getSnapshot);
