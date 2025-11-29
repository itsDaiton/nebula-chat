import { CHAT_ERRORS } from '@backend/shared/errors/chat.errors';
import type { ChatMessage, ValidationResult } from '@backend/modules/chat/chat.types';
import { validModels } from '@backend/shared/utils/chat.utils';

export function validateChatRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: CHAT_ERRORS.INVALID_REQUEST_BODY };
  }

  const { messages, model } = body as any;

  if (typeof model !== 'string' || model.trim() === '') {
    return { valid: false, error: CHAT_ERRORS.INVALID_MODEL_FORMAT };
  }

  if (!validModels.includes(model)) {
    return { valid: false, error: CHAT_ERRORS.INVALID_MODEL };
  }

  if (!Array.isArray(messages)) {
    return { valid: false, error: CHAT_ERRORS.INVALID_MESSAGES };
  }

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: CHAT_ERRORS.INVALID_MESSAGE_OBJECT };
    }

    const { role, content } = msg as ChatMessage;

    if (!['user', 'assistant', 'system'].includes(role)) {
      return { valid: false, error: CHAT_ERRORS.INVALID_ROLE };
    }

    if (typeof content !== 'string' || content.trim() === '') {
      return { valid: false, error: CHAT_ERRORS.INVALID_CONTENT };
    }
  }

  return {
    valid: true,
    data: {
      messages,
      model,
    },
  };
}
