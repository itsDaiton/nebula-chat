import { Box, Text, Flex, Circle, Icon } from "@chakra-ui/react";
import { ChatMessageProps } from "../types/types";
import { IoSparkles } from "react-icons/io5";
import { LuUser } from "react-icons/lu";

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.type === "user";

  return (
    <Flex
      direction={isUser ? "row-reverse" : "row"}
      gap={4}
      mb={6}
      align="center"
    >
      <Circle
        size="10"
        bg={isUser ? "gray.50" : "white"}
        color="gray.700"
        borderWidth="1px"
        borderColor="gray.200"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <Icon as={isUser ? LuUser : IoSparkles} boxSize="5" />
      </Circle>
      <Box
        maxW="70%"
        bg={isUser ? "gray.50" : "white"}
        color="gray.700"
        borderRadius="lg"
        px={4}
        py={3}
        borderWidth="1px"
        borderColor="gray.200"
      >
        <Text fontSize="sm">{message.content}</Text>
      </Box>
    </Flex>
  );
};
