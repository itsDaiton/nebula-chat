import { Box, Flex, Stack } from '@chakra-ui/react';
import { SettingsNav } from '@/modules/settings/components/SettingsNav';
import type { SettingsLayoutProps } from '@/modules/settings/types/types';
import { Header } from '@/shared/components/layout/Header';
import { useViewportHeight } from '@/shared/hooks/useViewportHeight';

/** The app's navbar over Settings' own shell in place of the chat: section navigation and the open section. */
export const SettingsLayout = ({ children }: SettingsLayoutProps) => {
  const viewportHeight = useViewportHeight();

  return (
    <Flex direction="column" bg="bg.default" overflow="hidden" style={{ height: viewportHeight }}>
      <Header />
      {/* The navbar is fixed and 80px tall (h-16 plus its vertical padding). */}
      <Flex direction={{ base: 'column', md: 'row' }} flex="1" minH={0} mt="80px">
        <SettingsNav />
        <Box as="main" flex="1" overflowY="auto">
          <Stack gap={10} px={{ base: 4, md: 8, xl: 12 }} py={{ base: 6, md: 8 }}>
            {children}
          </Stack>
        </Box>
      </Flex>
    </Flex>
  );
};
