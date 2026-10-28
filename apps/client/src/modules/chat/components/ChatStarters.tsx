import { GaugeIcon, ListTreeIcon, TypeIcon, ZapIcon } from 'lucide-react';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { resources } from '@/resources';

const ICONS = { zap: ZapIcon, 'list-tree': ListTreeIcon, type: TypeIcon, gauge: GaugeIcon };

/** Starter prompts for a new chat: picking one fills the composer, ready to send or edit. */
export const ChatStarters = () => {
  const setMessage = useMessageStore((state) => state.setMessage);

  const fill = (prompt: string) => {
    setMessage(prompt);
    document.querySelector<HTMLTextAreaElement>('[data-slot="prompt-input-textarea"]')?.focus();
  };

  return (
    <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {resources.chat.starters.map(({ icon, prompt }) => {
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
