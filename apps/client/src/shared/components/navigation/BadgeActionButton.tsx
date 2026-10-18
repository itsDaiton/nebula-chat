import type { BadgeActionButtonProps } from '@/shared/types/types';
import { useOS } from '@/shared/hooks/useOS';
import { getShortcutKeys } from '@/shared/utils/osUtils';
import { Badge, Button, Flex, HStack, Kbd, Text } from '@chakra-ui/react';

export const BadgeActionButton = ({
  icon,
  label,
  onClick,
  badge,
  shortcut,
}: BadgeActionButtonProps) => {
  const os = useOS();
  const shortcutKeys = shortcut ? getShortcutKeys(shortcut, os) : null;

  return (
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
      <Flex align="center" gap={2} w="100%">
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
        {shortcutKeys && (
          <HStack ml="auto" gap="0.5" display={{ base: 'none', xl: 'flex' }}>
            {shortcutKeys.flatMap((k, i) => [
              ...(i > 0
                ? [
                    <Text
                      key={`sep-${k}`}
                      as="span"
                      fontSize="xs"
                      color="fg.subtle"
                      userSelect="none"
                    >
                      +
                    </Text>,
                  ]
                : []),
              <Kbd key={k} size="sm" variant="subtle">
                {k}
              </Kbd>,
            ])}
          </HStack>
        )}
      </Flex>
    </Button>
  );
};
