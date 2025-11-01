import { Box, Button, Container, Flex } from "@chakra-ui/react";
import { Header } from "./Header";

export const Layout = () => {
  return (
    <Flex direction="column" minHeight="100vh">
      <Box as="header">
        <Header />
      </Box>
      <Box as="main" flex="1">
        <Container maxW="container.xl">
          {/* Main content goes here */}
          <Button>Click Me</Button>
        </Container>
      </Box>
    </Flex>
  );
};
