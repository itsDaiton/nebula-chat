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
        bg={isUser ? "bg.subtle" : "bg.input"}
        color="fg.soft"
        borderWidth="1.5px"
        borderColor="border.emphasized"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <Icon as={isUser ? LuUser : IoSparkles} boxSize="5" />
      </Circle>
      <Box
        maxW="70%"
        bg={isUser ? "bg.subtle" : "bg.input"}
        color="fg.soft"
        borderRadius="lg"
        px={4}
        py={3}
        borderWidth="1.5px"
        borderColor="border.emphasized"
      >
        <Text fontSize="sm">{message.content}</Text>
      </Box>
    </Flex>
  );
};
