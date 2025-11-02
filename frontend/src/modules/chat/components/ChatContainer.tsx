import { Box, Flex } from "@chakra-ui/react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useChat } from "../hooks/useChat";

export const ChatContainer = () => {
  const { messages, isLoading, sendMessage } = useChat();

  return (
    <Flex
      direction="column"
      h="calc(100vh - 200px)"
      maxW="800px"
      mx="auto"
      bg="white"
      borderWidth="1px"
      borderColor="gray.900"
      borderRadius="md"
      position="relative"
    >
      <Box
        flex="1"
        overflowY="auto"
        p={4}
        mb="70px"
        css={{
          "&::-webkit-scrollbar": {
            width: "4px",
          },
          "&::-webkit-scrollbar-track": {
            width: "6px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "var(--chakra-colors-gray-200)",
            borderRadius: "24px",
          },
        }}
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </Box>
      <Box
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        bg="white"
        borderTop="1px"
        borderColor="gray.900"
      >
        <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
      </Box>
    </Flex>
  );
};
