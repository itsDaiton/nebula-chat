import type { BaseMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { createLLM } from '../providers/factory';
import type { LLMConfig } from '../providers/types';
import { SYSTEM_PROMPTS, type SystemPromptKey } from '../prompts/system';

type CustomSystemPrompt = string & { __customSystemPrompt?: never };

export type ChatChainInput = {
  history: BaseMessage[];
  input: string;
};

export type ChatChainConfig = LLMConfig & {
  systemPrompt?: SystemPromptKey | CustomSystemPrompt;
};

export const buildChatChain = (config: ChatChainConfig) => {
  const llm = createLLM(config);

  const systemPromptText =
    typeof config.systemPrompt === 'string' && config.systemPrompt in SYSTEM_PROMPTS
      ? SYSTEM_PROMPTS[config.systemPrompt as SystemPromptKey]
      : (config.systemPrompt ?? SYSTEM_PROMPTS.default);

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPromptText],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
  ]);

  return RunnableSequence.from([prompt, llm, new StringOutputParser()]);
};

export type ChatChain = ReturnType<typeof buildChatChain>;
