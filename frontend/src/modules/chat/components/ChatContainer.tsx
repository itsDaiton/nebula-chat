import { Box, Flex } from "@chakra-ui/react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useChat } from "../hooks/useChat";
import { useEffect, useRef } from "react";

export const ChatContainer = () => {
  const { messages, isLoading, sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Flex
      direction="column"
      h="calc(100vh - 120px)"
      maxW="1000px"
      mx="auto"
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      position="relative"
      boxShadow="{shadows.container}"
    >
      <Box
        flex="1"
        overflowY="auto"
        p={4}
        mb="70px"
        css={{
          "&::-webkit-scrollbar": {
            width: "4px",
            background: "transparent",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(0, 0, 0, 0.1)",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "rgba(0, 0, 0, 0.15)",
          },
        }}
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} style={{ height: "0px" }} />
      </Box>
      <Box
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        borderTop="1px"
        borderColor="gray.200"
      >
        <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
      </Box>
    </Flex>
  );
};
