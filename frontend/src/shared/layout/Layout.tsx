import { Box, Flex } from '@chakra-ui/react';
import { Header } from './Header';
import { Page } from './Page';
import type { LayoutProps } from '@/shared/types/types';

export const Layout = ({ children }: LayoutProps) => (
  <Flex direction="column" minHeight="100vh">
    <Header />
    <Box as="main" flex="1" mt="20">
      <Page>{children}</Page>
    </Box>
  </Flex>
);
