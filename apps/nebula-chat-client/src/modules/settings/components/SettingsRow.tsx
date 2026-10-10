import { Box, Flex, Text } from '@chakra-ui/react';
import type { SettingsRowProps } from '@/modules/settings/types/types';

/** Label and description anchored left, the control right; stacked on mobile. */
export const SettingsRow = ({ label, description, children }: SettingsRowProps) => (
  <Flex
    direction={{ base: 'column', md: 'row' }}
    align={{ base: 'stretch', md: 'center' }}
    justify="space-between"
    gap={{ base: 3, md: 8 }}
    py={4}
    borderBottomWidth="1px"
    borderColor="border.default"
  >
    <Box>
      <Text fontWeight="medium">{label}</Text>
      {description && (
        <Text fontSize="sm" color="fg.muted">
          {description}
        </Text>
      )}
    </Box>
    <Box flexShrink={0}>{children}</Box>
  </Flex>
);
