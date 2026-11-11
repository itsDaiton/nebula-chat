import { InfoIcon } from 'lucide-react';
import { MessageAllowanceCounter } from '@/modules/chat/components/MessageAllowanceCounter';
import { useMessageAllowance } from '@/modules/chat/hooks/useMessageAllowance';
import { useRunMode } from '@/modules/chat/hooks/useRunMode';
import { resources } from '@/resources';

/** The line under the composer: a Metered user's allowance, otherwise the usual disclaimer; a Run adds why the picker is dimmed. */
export const ChatComposerFooter = () => {
  const { allowance, isSpent } = useMessageAllowance();
  const { isModelUnused } = useRunMode();
  const showsCounter = allowance && !isSpent;

  return (
    <>
      {isModelUnused && (
        <p role="note" className="flex items-center gap-1.5 px-1.5 pt-2 text-[11.5px] text-faint">
          <InfoIcon className="size-[13px] shrink-0" />
          {resources.chat.run.modelHint}
        </p>
      )}
      {showsCounter && <MessageAllowanceCounter />}
      {!showsCounter && !isModelUnused && (
        <p className="px-1.5 pt-2 text-center text-[11.5px] text-faint">
          {resources.chat.composer.disclaimer}
        </p>
      )}
    </>
  );
};
