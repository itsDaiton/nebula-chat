import { Box, Text, Flex, Circle, Icon } from "@chakra-ui/react";
import { ChatMessageProps } from "../types/types";
import { IoSparkles, IoPersonCircle } from "react-icons/io5";

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.type === "user";

  return (
    <Flex
      direction={isUser ? "row-reverse" : "row"}
      gap={3}
      mb={6}
      align="start"
    >
      <Circle
        size="8"
        bg="white"
        color="black"
        borderWidth="1px"
        borderColor="gray.900"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Icon as={isUser ? IoPersonCircle : IoSparkles} boxSize="3.5" />
      </Circle>
      <Box
        maxW="70%"
        bg="white"
        color="gray.900"
        borderRadius="md"
        px={4}
        py={3}
        borderWidth="1px"
        borderColor="gray.900"
      >
        <Text fontSize="sm">{message.content}</Text>
      </Box>
    </Flex>
  );
};
