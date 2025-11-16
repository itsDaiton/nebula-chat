export interface ChatRequestBody {
  message: string;
  model: string;
}

export interface ChatErrorResponse {
  success: false;
  error: string;
}

export interface ChatSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export type ChatResponse<T = unknown> = ChatErrorResponse | ChatSuccessResponse<T>;

export type ValidationResult =
  | { valid: false; error: string }
  | { valid: true; data: ChatRequestBody };
