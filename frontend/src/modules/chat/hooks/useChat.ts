import { useState } from "react";
import { ChatMessage } from "../types/types";

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      type: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "This is a simulated bot response.",
        type: "bot",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
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
