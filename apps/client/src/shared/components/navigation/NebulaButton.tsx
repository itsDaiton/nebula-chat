import type { NebulaButtonProps } from '@/shared/types/types';
import { Button } from '@chakra-ui/react';

export const NebulaButton = ({ children, ...props }: NebulaButtonProps) => (
  <Button {...props} variant="ghost" size="md" w="full" justifyContent="flex-start" py={2}>
    {children}
  </Button>
);
