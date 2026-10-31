import { tool } from '@langchain/core/tools';
import { interrupt } from '@langchain/langgraph';
import { z } from 'zod';
import { stepIdFor } from '@worker/runs/steps';

export const ASK_USER = 'askUser';

/** What pauses the graph: read at the root to persist the wait and tell the client. */
export type ClarifyingQuestion = { questionMessageId: string; question: string };

/** What resumes it: the answer text, or nothing when the wait ran out. */
export type ClarifyingAnswer = { answered: true; text: string } | { answered: false };

export type AskUserDeps = {
  runId: string;
  /** Upserts the question as an assistant Message: the tool re-runs from its start on resume. */
  saveQuestion: (question: { id: string; content: string }) => Promise<void>;
};

export const askUserTool = ({ runId, saveQuestion }: AskUserDeps) =>
  tool(
    async ({ question }, config) => {
      const id = stepIdFor(runId, 'orchestrator', `ask:${config.toolCall?.id ?? ''}`);
      await saveQuestion({ id, content: question });
      const answer = interrupt<ClarifyingQuestion, ClarifyingAnswer>({
        questionMessageId: id,
        question,
      });
      return answer.answered
        ? `The user answered: ${answer.text}`
        : 'The user did not answer in time. Carry on without the answer, stating any assumption you make.';
    },
    {
      name: ASK_USER,
      description:
        'Ask the user one clarifying question and wait for the reply. Only when the input is so ambiguous that a wrong guess would waste the Run. At most once per Run.',
      schema: z.object({
        question: z.string().min(1).describe('The single question to put to the user'),
      }),
    },
  );
