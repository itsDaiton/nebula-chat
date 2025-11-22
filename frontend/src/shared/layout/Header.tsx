import { Box, Flex, Text, Icon } from '@chakra-ui/react';
import { ColorModeButton } from '../components/ui/color-mode';
import { useResetChat } from '../hooks/useResetChat';
import { TbGalaxy } from 'react-icons/tb';
import { NebulaMenu } from '../components/navigation/NebulaMenu';
import { menuItems } from '../utils/menuUtils';
import { resources } from '@/resources';

export const Header = () => {
  const { resetChat } = useResetChat();

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
        <Box display="flex" alignItems="center">
          <Icon as={TbGalaxy} boxSize={12} />
          <Text
            pl={2}
            fontSize="3xl"
            fontWeight="bold"
            letterSpacing="-0.03em"
            cursor="pointer"
            transition="opacity 0.2s"
            onClick={resetChat}
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
