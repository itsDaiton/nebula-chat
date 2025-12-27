import { Box, Flex, Text, Icon, IconButton } from '@chakra-ui/react';
import { ColorModeButton } from '../components/ui/color-mode';
import { useResetChat } from '../hooks/useResetChat';
import { TbGalaxy } from 'react-icons/tb';
import { HiMenuAlt2 } from 'react-icons/hi';
import { NebulaMenu } from '../components/navigation/NebulaMenu';
import { menuItems } from '../utils/menuUtils';
import { resources } from '@/resources';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { resetChat } = useResetChat();
  const { isMobile } = useResponsiveLayout();

  return (
    <Box
      as="header"
      position="fixed"
      top={0}
      left={0}
      right={0}
      borderBottom="1.5px solid"
      borderColor={'border.default'}
      zIndex={1000}
      py={2}
    >
      <Flex w="full" h="16" px={4} alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={2}>
          {isMobile && onMenuClick && (
            <IconButton aria-label="Open menu" onClick={onMenuClick} variant="ghost" size="lg">
              <HiMenuAlt2 size={24} />
            </IconButton>
          )}
          <Icon as={TbGalaxy} boxSize={{ base: 10, md: 12 }} />
          <Text
            pl={2}
            fontSize={{ base: '2xl', md: '3xl' }}
            fontWeight="bold"
            letterSpacing="-0.03em"
            cursor="pointer"
            transition="opacity 0.2s"
            onClick={resetChat}
            display={{ base: 'none', sm: 'block' }}
          >
            {resources.chat.appName}
          </Text>
        </Box>
        <Flex gap={2} alignItems="center">
          <ColorModeButton />
          <NebulaMenu items={menuItems} />
        </Flex>
      </Flex>
    </Box>
  );
};
