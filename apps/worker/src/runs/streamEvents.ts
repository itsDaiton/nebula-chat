import type { BaseMessage } from '@langchain/core/messages';
import type { ReplyStreamEvent } from '@nebula-chat/contracts';
import { OUTPUT_NODE } from '@worker/runs/runGraph';

/** One chunk of the graph's stream in `messages` and `custom` modes, with nested graphs. */
export type RunStreamChunk =
  | [namespace: string[], mode: 'custom', event: ReplyStreamEvent]
  | [
      namespace: string[],
      mode: 'messages',
      message: [chunk: BaseMessage, metadata: Record<string, unknown>],
    ];

// Step events come from the nodes' custom writer; only the Output node's tokens are the answer.
export const toReplyStreamEvents = ([, mode, data]: RunStreamChunk): ReplyStreamEvent[] => {
  if (mode === 'custom') return [data];
  const [chunk, metadata] = data;
  if (metadata['langgraph_node'] !== OUTPUT_NODE || !chunk.text) return [];
  return [{ type: 'token', token: chunk.text }];
};
