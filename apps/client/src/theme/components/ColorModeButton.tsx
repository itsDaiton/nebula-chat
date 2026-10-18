import * as React from 'react';
import { ClientOnly, IconButton, Skeleton } from '@chakra-ui/react';
import { useColorMode } from '@/theme/hooks/useColorMode';
import { ColorModeIcon } from '@/theme/components/ColorModeIcon';
import type { ColorModeButtonProps } from '@/theme/types/types';

export const ColorModeButton = React.forwardRef<HTMLButtonElement, ColorModeButtonProps>(
  (props, ref) => {
    const { toggleColorMode } = useColorMode();
    return (
      <ClientOnly fallback={<Skeleton boxSize="9" />}>
        <IconButton
          onClick={toggleColorMode}
          variant="ghost"
          aria-label="Toggle color mode"
          size="sm"
          ref={ref}
          {...props}
          css={{
            _icon: {
              width: '5',
              height: '5',
            },
          }}
        >
          <ColorModeIcon />
        </IconButton>
      </ClientOnly>
    );
  },
);
ColorModeButton.displayName = 'ColorModeButton';
