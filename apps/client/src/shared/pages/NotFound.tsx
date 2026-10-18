import { Box, Flex, Text, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router';
import { route } from '@/routing/routes';
import { resources } from '@/resources';

export const NotFound = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    void navigate(route.chat.root());
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="bg.default" px={4}>
      <Flex direction="column" align="center" textAlign="center" gap={6} maxW="500px">
        <Box>
          <Text
            fontSize={{ base: '6xl', md: '8xl' }}
            fontWeight="bold"
            color="fg.muted"
            lineHeight="1"
          >
            {resources.notFound.status}
          </Text>
          <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="medium" color="fg.default" mt={4}>
            {resources.notFound.title}
          </Text>
        </Box>

        <Text fontSize={{ base: 'sm', md: 'md' }} color="fg.muted" lineHeight="tall">
          {resources.notFound.message}
        </Text>

        <Button onClick={handleGoHome} colorScheme="blue" size={{ base: 'md', md: 'lg' }} px={8}>
          {resources.notFound.action}
        </Button>
      </Flex>
    </Flex>
  );
};
