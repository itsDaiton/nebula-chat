export interface ChatRequestBody {
  message: string;
  model: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ChatResponseBody = ApiResponse<string>;

export type ValidationResult =
  | { valid: false; error: string }
  | { valid: true; data: ChatRequestBody };
