import { useListMessages } from '@/libs/api/generated/messages/messages';
import { useModelCatalog } from '@/modules/chat/hooks/useModelCatalog';
import type { ContextLevel, ContextUsage } from '@/modules/chat/types/types';

const WARNING_FROM = 70;
const CRITICAL_FROM = 90;

const levelFor = (percent: number): ContextLevel => {
  if (percent >= CRITICAL_FROM) return 'critical';
  return percent >= WARNING_FROM ? 'warning' : 'normal';
};

export const useContextUsage = (sessionId: string | undefined): ContextUsage | null => {
  const { data: messages } = useListMessages(
    { sessionId },
    { query: { enabled: Boolean(sessionId) } },
  );
  const { options } = useModelCatalog();

  // Run answers and replies from before the numbers were kept carry none, so they never count.
  const reply = messages?.findLast(
    (message) => !message.runId && message.model && message.contextTokens != null,
  );
  const model = options.find((option) => option.value === reply?.model);
  if (!sessionId || !messages || !reply || !model) return null;

  const { contextTokens: used, contextMessages: messagesIncluded } = reply;
  if (used == null || messagesIncluded == null) return null;
  const budget = model.contextWindow - model.maxOutput;
  const share = Math.min(used / budget, 1);
  // The colour follows the percent shown, so "70%" is never muted.
  const percent = Math.round(share * 100);

  return {
    model,
    used,
    budget,
    share,
    percent,
    level: levelFor(percent),
    messagesIncluded,
    messagesTotal: messages.length,
  };
};
