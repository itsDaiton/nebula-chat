import type { BadgeActionButtonProps } from '@/shared/types/types';
import { Badge, Button, Flex } from '@chakra-ui/react';

export const BadgeActionButton = ({ icon, label, onClick, badge }: BadgeActionButtonProps) => (
  <Button
    size="md"
    w="100%"
    variant="ghost"
    onClick={onClick}
    borderRadius="md"
    justifyContent="flex-start"
    _hover={{ bg: 'bg.muted' }}
    transition="background 0.2s"
    tabIndex={-1}
  >
    <Flex align="center" gap={2}>
      {icon}
      {label}
      {badge && (
        <Badge
          size="sm"
          colorPalette={badge.colorPalette || 'gray'}
          variant={badge.variant || 'subtle'}
        >
          {badge.text}
        </Badge>
      )}
    </Flex>
  </Button>
);
