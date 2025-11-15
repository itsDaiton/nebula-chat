import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { route } from "@/routes";
import type { ChatMessage } from "../types/types";

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { id: chatId } = useParams();

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
    }
  }, [chatId]);

  const sendMessage = async (content: string) => {
    if (!chatId) {
      const newChatId = crypto.randomUUID();
      void navigate(route.chat.conversation(newChatId));
    }
    const newUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content,
      type: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const messageId = crypto.randomUUID();

      const thinkingMessage: ChatMessage = {
        id: messageId,
        content: "",
        type: "bot",
        timestamp: new Date(),
        isThinking: true,
      };
      setMessages((prev) => [...prev, thinkingMessage]);

      await new Promise((resolve) => setTimeout(resolve, 500));

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, isThinking: false, isLoading: true }
            : msg,
        ),
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content:
                  "This is a simulated bot response. After integrating with a real backend, this will be replaced with actual responses. Have a great day!",
                isLoading: false,
                isThinking: false,
              }
            : msg,
        ),
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error getting bot response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
  };
};
