import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { LoopEnding } from '@worker/runs/orchestrator';

const CUT_SHORT: Record<Exclude<LoopEnding, 'handoff'>, string> = {
  'turn-cap': 'it ran out of turns',
  budget: 'the Run budget was nearly spent',
};

/**
 * What the Output Agent works from: the Orchestrator's handoff reply, or, when a limit ended its loop,
 * its delegates' results so far under a note that they are partial.
 */
export const findingsOf = (messages: BaseMessage[], ending: LoopEnding | null): string => {
  if (ending === 'handoff' || ending === null) {
    return messages.findLast(AIMessage.isInstance)?.text ?? '';
  }
  const results = messages
    .filter(ToolMessage.isInstance)
    .filter((m) => m.status !== 'error')
    .map((m) => `## From the ${m.name ?? 'delegate'} Agent\n\n${m.text}`);
  return [
    `The orchestrator was stopped before it finished, because ${CUT_SHORT[ending]}. These findings are partial.`,
    ...(results.length ? results : ['No delegate Agent returned a result.']),
  ].join('\n\n');
};
