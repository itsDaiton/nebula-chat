import { MessageAllowanceCounter } from '@/modules/chat/components/MessageAllowanceCounter';
import { useMessageAllowance } from '@/modules/chat/hooks/useMessageAllowance';
import { resources } from '@/resources';

/** The line under the composer: a Metered user's allowance, otherwise the usual disclaimer. */
export const ChatComposerFooter = () => {
  const { allowance, isSpent } = useMessageAllowance();

  if (allowance && !isSpent) return <MessageAllowanceCounter />;

  return (
    <p className="px-1.5 pt-2 text-center text-[11.5px] text-faint">
      {resources.chat.composer.disclaimer}
    </p>
  );
};
