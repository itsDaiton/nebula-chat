export type MessageRole = 'user' | 'assistant' | 'system';

export type CreateMessageDTO = {
  conversationId: string;
  content: string;
  role: MessageRole;
  tokens?: number;
};
