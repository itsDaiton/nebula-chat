import { useSpendAllowance } from '@/modules/chat/hooks/useSpendAllowance';
import { formatResetDate } from '@/modules/chat/utils/formatResetDate';
import { resources } from '@/resources';

/** Shown once a verified user's spend allowance is used up (or a send was refused at it); it resets with the UTC month. */
export const SpendAllowancePrompt = () => {
  const { allowance, isSpent } = useSpendAllowance();

  if (!isSpent) return null;

  const { title, description, resets } = resources.chat.spendAllowance;

  return (
    <p role="alert" className="mb-3 px-1.5 text-center text-[12.5px] text-muted-foreground">
      <span className="font-medium text-foreground">{title}</span> {description}
      {allowance && ` It ${resets(formatResetDate(allowance.resetsAt))}.`}
    </p>
  );
};
