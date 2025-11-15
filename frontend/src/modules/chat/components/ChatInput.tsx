import { Box, Textarea, Button, Flex, Icon } from "@chakra-ui/react";
import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatInputProps } from "../types/types";
import { IoSendSharp } from "react-icons/io5";

export const ChatInput = ({
  onSendMessage,
  isLoading = false,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const resetTextarea = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "52px";
    }
  }, []);

  const handleMessageSend = useCallback(() => {
    onSendMessage(message);
    setMessage("");
    resetTextarea();
  }, [onSendMessage, message, resetTextarea]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && message.trim() && !isLoading) {
        e.preventDefault();
        handleMessageSend();
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
  }, [message, isLoading, onSendMessage, handleMessageSend]);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;

      // Only show scrollbar if we've reached max height
      textarea.style.overflowY = newHeight === 200 ? "auto" : "hidden";
    };

    textarea.addEventListener("input", adjustHeight);
    return () => textarea.removeEventListener("input", adjustHeight);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      handleMessageSend();
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit} p={4}>
      <Flex position="relative" alignItems="center">
        <Textarea
          ref={inputRef}
          value={message}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setMessage(e.target.value)
          }
          autoFocus
          placeholder="Ask me anything..."
          size="lg"
          pr="44px"
          disabled={isLoading}
          bg="bg.input"
          borderRadius="lg"
          borderColor="border.default"
          borderWidth={{ base: "1px", _dark: "1.5px" }}
          color="fg.soft"
          transition="all 0.2s"
          resize="none"
          minH="52px"
          maxH="200px"
          overflow="hidden"
          rows={1}
          css={{
            "&::-webkit-scrollbar": {
              width: "4px",
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
            transform="rotate(-50deg) translateY(1px)"
            boxSize="18px"
          />
        </Button>
      </Flex>
    </Box>
  );
};
