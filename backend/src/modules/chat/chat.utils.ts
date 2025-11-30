import 'dotenv/config';
import OpenAI from 'openai';
import type { Response } from 'express';
import type { UsageData } from './chat.types';

export const createClient: () => OpenAI = () => {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  return client;
};

export const validModels: string[] = [
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-5.1',
  'gpt-5',
  'gpt-5-mini',
];

export const streamFormatter = {
  writeToken(res: Response, token: string): void {
    res.write(`event: token\n`);
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  },
  writeUsage(res: Response, usageData: UsageData): void {
    res.write(`event: usage\n`);
    res.write(`data: ${JSON.stringify(usageData)}\n\n`);
  },
  writeEnd(res: Response): void {
    res.write('event: end\n');
    res.write('data: end\n\n');
  },
  writeCacheHit(res: Response): void {
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
