import { Box, Flex, Text, Button, Icon, Input } from "@chakra-ui/react";
import { LuSearch, LuCommand } from "react-icons/lu";

export const Header = () => {
  return (
    <Box
      as="header"
      position="fixed"
      top={0}
      left={0}
      right={0}
      bg="white"
      borderBottom="1px solid"
      borderColor="gray.200"
      zIndex={1000}
      py={2}
    >
      <Flex
        w="full"
        h="16"
        px={4}
        alignItems="center"
        justifyContent="space-between"
      >
        <Text
          pl={2}
          fontSize="3xl"
          fontWeight="bold"
          color="gray.900"
          letterSpacing="-0.03em"
        >
          nebula chat
        </Text>

        <Button
          variant="ghost"
          display="inline-flex"
          alignItems="center"
          gap={2}
          px={3}
          h="9"
          fontSize="sm"
          color="gray.500"
          _hover={{ bg: "gray.50" }}
        >
          <Icon as={LuSearch} boxSize={4} />
          <Text>Search...</Text>
          <Box
            ml={2}
            border="1px solid"
            borderColor="gray.200"
            rounded="sm"
            px={1.5}
            py={0.5}
            fontSize="xs"
            color="gray.500"
            lineHeight="normal"
          >
            ⌘K
          </Box>
        </Button>
      </Flex>
    </Box>
  );
};
