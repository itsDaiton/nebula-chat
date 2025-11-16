export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatHistoryRequestBody {
  model: string;
  messages: ChatMessage[];
}

export type ChatRequestBody = ChatHistoryRequestBody;

export interface ChatErrorResponse {
  success: false;
  error: string;
}

export interface ChatSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export type ValidationResult =
  | { valid: false; error: string }
  | { valid: true; data: ChatRequestBody };
