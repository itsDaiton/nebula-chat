import { useCallback, useMemo, useRef } from 'react';
import {
  BookOpenIcon,
  CalendarDaysIcon,
  LightbulbIcon,
  MoonIcon,
  PenLineIcon,
  ScaleIcon,
  SmileIcon,
  UtensilsCrossedIcon,
  WalletIcon,
} from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { pickStarters } from '@/modules/chat/utils/pickStarters';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { resources } from '@/resources';

const ICONS = {
  pen: PenLineIcon,
  book: BookOpenIcon,
  calendar: CalendarDaysIcon,
  utensils: UtensilsCrossedIcon,
  lightbulb: LightbulbIcon,
  smile: SmileIcon,
  scale: ScaleIcon,
  moon: MoonIcon,
  wallet: WalletIcon,
};

/** Four random starter prompts for a new chat: picking one fills the composer, ready to send or edit. A Guest sees none, so a capped allowance is not spent on a throwaway prompt. */
export const ChatStarters = () => {
  const { isGuest } = useAuth();
  const setMessage = useMessageStore((state) => state.setMessage);
  const starters = useMemo(() => pickStarters(resources.chat.starters), []);

  const filled = useRef<string | null>(null);

  // A starter is a suggestion, not a draft: it goes when the chat leaves the screen, unless edited.
  const watchLeaving = useCallback(
    (node: HTMLDivElement | null) =>
      node
        ? () => {
            if (useMessageStore.getState().message === filled.current) {
              useMessageStore.getState().setMessage('');
            }
          }
        : undefined,
    [],
  );

  const fill = (prompt: string) => {
    filled.current = prompt;
    setMessage(prompt);
    document.querySelector<HTMLTextAreaElement>('[data-slot="prompt-input-textarea"]')?.focus();
  };

  if (isGuest) return null;

  return (
    <div ref={watchLeaving} className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {starters.map(({ icon, prompt }) => {
        const Icon = ICONS[icon];
        return (
          <button
            key={prompt}
            type="button"
            className="flex items-start gap-2.5 rounded-[10px] border border-border bg-panel px-3 py-2.5 text-left text-[12.5px] text-foreground-secondary transition-colors hover:bg-hover focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            onClick={() => fill(prompt)}
          >
            <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span>{prompt}</span>
          </button>
        );
      })}
    </div>
  );
};
