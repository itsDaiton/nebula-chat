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

  const handleSendMessage = (message: string) => {
    sendMessage(message).catch(() => {});
  };

  return (
    <Flex
      direction="column"
      h="calc(100vh - 120px)"
      maxW="1000px"
      mx="auto"
      bg="bg.default"
      borderWidth={{ base: "1px", _dark: "1.5px" }}
      borderColor="border.default"
      borderRadius="lg"
      position="relative"
      boxShadow={{ base: "sm", _dark: "none" }}
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
            background: "var(--chakra-colors-border-default)",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "var(--chakra-colors-border-emphasized)",
          },
        }}
      >
        {messages.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            h="100%"
            textAlign="center"
            color="fg.muted"
            gap={4}
          >
            <Box
              fontSize="2xl"
              fontWeight="medium"
              color="fg.default"
              maxW="600px"
            >
              Welcome to Nebula Chat! 👋
            </Box>
            <Box fontSize="md" maxW="600px" lineHeight="tall">
              I'm your AI assistant, ready to help you with any questions or
              tasks you might have. Feel free to start a conversation by typing
              a message below!
            </Box>
          </Flex>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} style={{ height: "0px" }} />
      </Box>
      <Box
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        borderTop={{ base: "1px", _dark: "1.5px" }}
        borderColor="border.default"
      >
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </Box>
    </Flex>
  );
};
