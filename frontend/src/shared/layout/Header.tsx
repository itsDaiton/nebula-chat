import { Box } from "@chakra-ui/react";

export const Header = () => {
  return (
    <Box
      as="header"
      bg="white"
      color="black"
      border="1px solid black"
      p={4}
      textAlign="center"
    >
      Nebula Chat
    </Box>
  );
};
