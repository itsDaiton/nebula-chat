import { registry } from '@backend/config/openapi.config';
import { chatStreamResponseSchema, createChatStreamSchema } from './chat.validation';
import { errorResponseSchema } from '@backend/openapi/schemas';

export function registerChatRoutes() {
  registry.registerPath({
    method: 'post',
    path: '/api/chat/stream',
    description: `Stream a chat completion response from an AI model with automatic conversation and message persistence.`,
    summary: 'Stream chat completion',
    tags: ['Chat'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: createChatStreamSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Successful streaming response with Server-Sent Events',
        content: {
          'text/event-stream': {
            schema: chatStreamResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request body or validation error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      404: {
        description: 'Conversation not found (if conversationId provided)',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      413: {
        description:
          'Payload too large - user message exceeds token limit or conversation context exceeds limit',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      429: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });
}
