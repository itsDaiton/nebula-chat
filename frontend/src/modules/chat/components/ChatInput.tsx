import { Box, Input, Button, Flex, Icon } from "@chakra-ui/react";
import { useState, useRef, useEffect } from "react";
import { ChatInputProps } from "../types/types";
import { IoSendSharp } from "react-icons/io5";

export const ChatInput = ({
  onSendMessage,
  isLoading = false,
  autoFocus = true,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.ctrlKey ||
        e.metaKey
      ) {
        return;
      }

      if (e.key.length === 1) {
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          autoFocus
          placeholder="Ask me anything..."
          size="lg"
          pr="44px"
          disabled={isLoading}
          bg="white"
          borderRadius="lg"
          borderColor="gray.200"
          transition="all 0.2s"
          _hover={{
            borderColor: "gray.300",
          }}
          _focus={{
            borderColor: "gray.300",
            boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.05)",
            outline: "none",
            ring: "0",
            ringOffset: "0",
          }}
          _disabled={{
            bg: "gray.50",
            cursor: "not-allowed",
          }}
        />
        <Button
          type="submit"
          position="absolute"
          right={2}
          top="50%"
          transform="translateY(-50%)"
          aria-label="Send message"
          variant="ghost"
          color="gray.600"
          loading={isLoading}
          minW="auto"
          height="40px"
          width="40px"
          p={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          _hover={{ color: "gray.900" }}
          _active={{ color: "gray.700" }}
          _disabled={{ color: "gray.400" }}
          disabled={!message.trim() || isLoading}
        >
          <Icon
            as={IoSendSharp}
            transform="rotate(-45deg)"
            position="relative"
            top="1px"
            right="-1px"
            boxSize="20px"
          />
        </Button>
      </Flex>
    </Box>
  );
};
