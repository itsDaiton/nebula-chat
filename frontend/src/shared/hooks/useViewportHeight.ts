import { useSyncExternalStore } from 'react';

const getViewportHeight = () => {
  if (window.visualViewport) {
    return `${window.visualViewport.height}px`;
  }
  return `${window.innerHeight}px`;
};

const subscribeToViewportHeight = (callback: () => void) => {
  window.addEventListener('resize', callback);
  window.visualViewport?.addEventListener('resize', callback);
  return () => {
    window.removeEventListener('resize', callback);
    window.visualViewport?.removeEventListener('resize', callback);
  };
};

export const useViewportHeight = () =>
  useSyncExternalStore(subscribeToViewportHeight, getViewportHeight, () => '100dvh');
