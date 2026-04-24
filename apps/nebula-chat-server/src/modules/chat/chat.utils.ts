import OpenAI from 'openai';
import type { ServerResponse } from 'node:http';
import { env } from '@backend/env';
import type { UsageData } from './chat.types';
import { SYSTEM_PROMPT } from 'prompts/prompt';

export const createClient: () => OpenAI = () => {
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
  return client;
};

export const getSystemPrompt = (): string => SYSTEM_PROMPT;

export const streamFormatter = {
  writeConversationCreated(res: ServerResponse, conversationId: string): void {
    res.write(`event: conversation-created\n`);
    res.write(`data: ${JSON.stringify({ conversationId })}\n\n`);
  },
  writeUserMessageCreated(res: ServerResponse, messageId: string): void {
    res.write(`event: user-message-created\n`);
    res.write(`data: ${JSON.stringify({ messageId })}\n\n`);
  },
  writeAssistantMessageCreated(res: ServerResponse, messageId: string): void {
    res.write(`event: assistant-message-created\n`);
    res.write(`data: ${JSON.stringify({ messageId })}\n\n`);
  },
  writeError(res: ServerResponse, error: string): void {
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error })}\n\n`);
  },
  writeToken(res: ServerResponse, token: string): void {
    res.write(`event: token\n`);
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  },
  writeUsage(res: ServerResponse, usageData: UsageData): void {
    res.write(`event: usage\n`);
    res.write(`data: ${JSON.stringify(usageData)}\n\n`);
  },
  writeEnd(res: ServerResponse): void {
    res.write('event: end\n');
    res.write('data: end\n\n');
  },
  writeCacheHit(res: ServerResponse): void {
    res.write(`event: cache-hit\n`);
    res.write(`data: true\n\n`);
  },
  formatUsageEvent(usageData: UsageData): string {
    return `event: usage\ndata: ${JSON.stringify(usageData)}\n\n`;
  },
  formatEndEvent(): string {
    return 'event: end\ndata: end\n\n';
  },
  extractUsageFromStream(stream: string): UsageData | null {
    const lines = stream.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];
      if (
        currentLine &&
        nextLine &&
        currentLine.startsWith('event: usage') &&
        nextLine.startsWith('data: ')
      ) {
        try {
          const dataStr = nextLine.substring(6);
          const data = JSON.parse(dataStr);
          return {
            promptTokens: data.promptTokens,
            completionTokens: data.completionTokens,
            totalTokens: data.totalTokens,
          };
        } catch {
          return null;
        }
      }
    }
    return null;
  },
};
