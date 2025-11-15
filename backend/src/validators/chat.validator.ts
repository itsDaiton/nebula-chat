import type { ValidationResult } from '@backend/types/chat.types';

export function validateChatRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const message = (body as any).message;
  const model = (body as any).model;

  if (typeof message !== 'string') {
    return { valid: false, error: '`message` must be a string.' };
  }

  if (typeof model !== 'string') {
    return { valid: false, error: '`model` must be a string.' };
  }

  return {
    valid: true,
    data: {
      message,
      model,
    },
  };
}
