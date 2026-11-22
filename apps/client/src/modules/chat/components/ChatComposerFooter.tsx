import { MessageAllowanceCounter } from '@/modules/chat/components/MessageAllowanceCounter';
import { useMessageAllowance } from '@/modules/chat/hooks/useMessageAllowance';
import { useSpendAllowance } from '@/modules/chat/hooks/useSpendAllowance';
import { resources } from '@/resources';

/** The line under the composer: an allowance, otherwise the usual disclaimer. */
export const ChatComposerFooter = () => {
  const { allowance, isSpent } = useMessageAllowance();
  const spend = useSpendAllowance();
  const showsCounter = (allowance && !isSpent) || (spend.allowance && !spend.isSpent);

  return (
    <>
      {showsCounter && <MessageAllowanceCounter />}
      {!showsCounter && (
        <p className="px-1.5 pt-2 text-center text-[11.5px] text-faint">
          {resources.chat.composer.disclaimer}
        </p>
      )}
    </>
  );
};
