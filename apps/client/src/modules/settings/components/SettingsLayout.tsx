import { Box, Flex, Stack } from '@chakra-ui/react';
import { SettingsNav } from '@/modules/settings/components/SettingsNav';
import type { SettingsLayoutProps } from '@/modules/settings/types/types';

/** Settings' own layout in the shell's centre panel: section navigation and the open section. */
export const SettingsLayout = ({ children }: SettingsLayoutProps) => (
  <Flex direction={{ base: 'column', md: 'row' }} h="100%" minH={0} overflow="hidden">
    <SettingsNav />
    <Box flex="1" overflowY="auto">
      {/* Left-aligned with the nav; capped so a row's label and control stay within one glance. */}
      <Stack gap={10} maxW="4xl" px={{ base: 4, md: 8, xl: 12 }} py={{ base: 6, md: 8 }}>
        {children}
      </Stack>
    </Box>
  </Flex>
);
