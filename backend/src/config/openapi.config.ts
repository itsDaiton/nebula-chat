import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from 'openapi3-ts/oas30';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export const generateOpenAPIDocument = (): OpenAPIObject => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Nebula Chat API',
      version: '1.0.0',
      description: 'REST API for Nebula Chat',
      contact: {
        name: 'Nebula Chat',
      },
    },
    servers: [
      {
        url: process.env.SERVER_URL ?? '/',
      },
    ],
    tags: [
      { name: 'Chat', description: 'Chat streaming endpoints' },
      { name: 'Conversations', description: 'Conversation management' },
      { name: 'Messages', description: 'Message management' },
      { name: 'Cache', description: 'Cache inspection and management' },
    ],
  });
};
