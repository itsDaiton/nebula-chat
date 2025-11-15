import type { ValidationResult } from '@backend/types/chat.types';
import { validModels } from '@backend/utils/models';

export function validateChatRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const message = (body as any).message;
  const model = (body as any).model;

  if (typeof message !== 'string' || message.trim() === '') {
    return { valid: false, error: '`message` must be a non-empty string.' };
  }

  if (typeof model !== 'string' || model.trim() === '') {
    return { valid: false, error: '`model` must be a string.' };
  }

  if (!validModels.includes(model)) {
    return { valid: false, error: `\`model\` must be supported.` };
  }

  return {
    valid: true,
    data: {
      message,
      model,
    },
  };
}
