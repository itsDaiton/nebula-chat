import { useEffect } from 'react';
import { useViewportStore } from '../stores/useViewportStore';

export const useViewportHeight = () => {
  const { viewportHeight, setViewportHeight } = useViewportStore();

  useEffect(() => {
    const updateHeight = () => {
      if (window.visualViewport) {
        const height = window.visualViewport.height;
        setViewportHeight(`${height}px`);
      } else {
        setViewportHeight(`${window.innerHeight}px`);
      }
    };

    updateHeight();

    window.addEventListener('resize', updateHeight);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight);
    }

    return () => {
      window.removeEventListener('resize', updateHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateHeight);
      }
    };
  }, [setViewportHeight]);

  return viewportHeight;
};
