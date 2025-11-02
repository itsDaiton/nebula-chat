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
      if (e.key === "Enter" && message.trim() && !isLoading) {
        e.preventDefault();
        onSendMessage(message);
        setMessage("");
        return;
      }
      if (
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) &&
        !e.ctrlKey &&
        !e.metaKey &&
        e.key.length === 1
      ) {
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [message, isLoading, onSendMessage]);

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
          bg="bg.input"
          borderRadius="lg"
          borderColor="border.emphasized"
          borderWidth="1.5px"
          color="fg.soft"
          transition="all 0.2s"
          _hover={{
            borderColor: "border.emphasized",
          }}
          _focus={{
            borderColor: "border.emphasized",
            boxShadow: "0 0 0 1px var(--chakra-colors-border-emphasized)",
            outline: "none",
            ring: "0",
            ringOffset: "0",
          }}
          _disabled={{
            bg: "bg.subtle",
            cursor: "not-allowed",
            opacity: 0.7,
          }}
          _placeholder={{
            color: "fg.muted",
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
          color="fg.soft"
          loading={isLoading}
          minW="auto"
          height="40px"
          width="40px"
          p={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          _hover={{ color: "fg.default" }}
          _active={{ color: "fg.soft" }}
          _disabled={{ opacity: 0.4 }}
          disabled={!message.trim() || isLoading}
        >
          <Icon
            as={IoSendSharp}
            transform="rotate(-45deg) translateY(1px)"
            boxSize="18px"
          />
        </Button>
      </Flex>
    </Box>
  );
};
