import { Box, Input, Button, Flex, Icon } from "@chakra-ui/react";
import { useState } from "react";
import { ChatInputProps } from "../types/types";
import { IoSendSharp } from "react-icons/io5";

export const ChatInput = ({
  onSendMessage,
  isLoading = false,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit} p={4}>
      <Flex position="relative" alignItems="center">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask me anything..."
          size="lg"
          pr="3rem"
          disabled={isLoading}
          bg="white"
          borderRadius="md"
          borderColor="gray.900"
          _focus={{
            borderColor: "black",
            boxShadow: "0 0 0 1px black",
          }}
        />
        <Button
          type="submit"
          position="absolute"
          right={5}
          aria-label="Send message"
          variant="ghost"
          color="gray.900"
          loading={isLoading}
          minW="auto"
          p={2}
          _hover={{ bg: "transparent", color: "black" }}
          _active={{ bg: "transparent", color: "gray.700" }}
          disabled={!message.trim() || isLoading}
        >
          <Icon as={IoSendSharp} />
        </Button>
      </Flex>
    </Box>
  );
};
