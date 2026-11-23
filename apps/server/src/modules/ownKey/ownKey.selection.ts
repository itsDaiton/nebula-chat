import { getModel, RUN_PROVIDERS } from '@nebula-chat/contracts';
import type { ModelProvider, OwnKeyRefs } from '@nebula-chat/contracts';
import { ownKeyRepository } from '@server/modules/ownKey/ownKey.repository';

type ReplyTarget = { model: string; replyMode: string };

/** The providers a reply calls: a Run's Agents, or a Direct reply's Session Model. */
export const providersOf = ({ model, replyMode }: ReplyTarget): readonly ModelProvider[] =>
  replyMode === 'run' ? RUN_PROVIDERS : [getModel(model).provider];

/**
 * The one answer to "which of these providers does the User have a usable Own key for": the references the job carries and
 * whether the reply is exempt from the Spend allowance. A key not yet `valid`, or `invalid`, counts as absent for both (ADR-0037).
 */
export const selectOwnKeys = async (
  userId: string,
  providers: readonly ModelProvider[],
): Promise<{ keyRefs: OwnKeyRefs | undefined; exempt: boolean }> => {
  const rows = await ownKeyRepository.findValid(userId);
  const keyRefs: OwnKeyRefs = {};
  for (const { id, provider } of rows) {
    if (providers.includes(provider)) keyRefs[provider] = id;
  }
  return {
    keyRefs: Object.keys(keyRefs).length > 0 ? keyRefs : undefined,
    exempt: providers.every((provider) => keyRefs[provider] !== undefined),
  };
};
