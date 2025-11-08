import { Box, Flex, Text } from "@chakra-ui/react";
import {
  ColorModeButton,
  useColorModeValue,
} from "../components/ui/color-mode";
import { useResetChat } from "../hooks/useResetChat";

export const Header = () => {
  const resetChat = useResetChat();
  const bg = useColorModeValue("white", "bg.default");
  const borderColor = useColorModeValue("gray.200", "border.default");
  const textColor = useColorModeValue("gray.900", "fg.default");

  return (
    <Box
      as="header"
      position="fixed"
      top={0}
      left={0}
      right={0}
      bg={bg}
      borderBottom="1.5px solid"
      borderColor={borderColor}
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
          color={textColor}
          letterSpacing="-0.03em"
          cursor="pointer"
          transition="opacity 0.2s"
          onClick={resetChat}
        >
          nebula chat
        </Text>
        <ColorModeButton />
      </Flex>
    </Box>
  );
};
