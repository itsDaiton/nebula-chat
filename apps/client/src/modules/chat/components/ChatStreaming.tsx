import { Box, Circle, Flex, Icon, Spinner } from '@chakra-ui/react';
import { IoSparkles } from 'react-icons/io5';

export const ChatStreaming = () => (
  <Flex direction="row" gap={4} mb={6} align="center">
    <Circle
      size="10"
      bg="bg.input"
      color="fg.soft"
      borderWidth={{ base: '1px', _dark: '1.5px' }}
      borderColor="border.default"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
    >
      <Icon as={IoSparkles} boxSize="5" position="relative" left="0.5px" top="0.5px" />
    </Circle>
    <Box
      bg="bg.input"
      color="fg.soft"
      borderRadius="lg"
      px={4}
      py={3}
      borderWidth={{ base: '1px', _dark: '1.5px' }}
      borderColor="border.default"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Spinner size="sm" color="fg.soft" />
    </Box>
  </Flex>
);
