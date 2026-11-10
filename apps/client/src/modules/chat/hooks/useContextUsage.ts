import { useListMessages } from '@/libs/api/generated/messages/messages';
import { useModelCatalog } from '@/modules/chat/hooks/useModelCatalog';
import type { ContextUsage } from '@/modules/chat/types/types';

const WARNING_FROM = 0.7;
const CRITICAL_FROM = 0.9;

export const useContextUsage = (sessionId: string | undefined): ContextUsage | null => {
  const { data: messages } = useListMessages(
    { sessionId },
    { query: { enabled: Boolean(sessionId) } },
  );
  const { options } = useModelCatalog();

  // Run answers and replies from before the numbers were kept carry none, so they never count.
  const reply = messages?.findLast((message) => message.contextTokens != null && message.model);
  const model = options.find((option) => option.value === reply?.model);
  if (!sessionId || !messages || !reply || !model) return null;

  const used = reply.contextTokens ?? 0;
  const budget = model.contextWindow - model.maxOutput;
  const share = Math.min(used / budget, 1);

  return {
    model,
    used,
    budget,
    share,
    percent: Math.round(share * 100),
    level: share >= CRITICAL_FROM ? 'critical' : share >= WARNING_FROM ? 'warning' : 'normal',
    messagesIncluded: reply.contextMessages ?? 0,
    messagesTotal: messages.length,
  };
};
