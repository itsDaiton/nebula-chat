import { useAuth } from '@/modules/auth/hooks/useAuth';
import { getGreeting } from '@/modules/chat/utils/greeting';
import { resources } from '@/resources';
import type { ChatEmptyStateProps } from '@/modules/chat/types/types';

export const ChatEmptyState = ({ sessionId }: ChatEmptyStateProps) => {
  const { user, isGuest } = useAuth();

  if (sessionId) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-lg font-medium">{resources.chat.emptySession}</p>
        <p className="text-sm text-muted-foreground">{resources.chat.emptySessionHint}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-[46px] leading-[1.05] font-light tracking-[-0.045em]">
        {getGreeting(new Date(), isGuest ? null : user?.name)}
      </h1>
      <p className="mt-3.5 flex items-center justify-center gap-1.5 text-[13.5px] text-muted-foreground">
        {isGuest ? resources.chat.guestHint : resources.chat.hint}
      </p>
    </div>
  );
};
