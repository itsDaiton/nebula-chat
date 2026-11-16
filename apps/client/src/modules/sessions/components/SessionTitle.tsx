import { useCallback, useRef } from 'react';
import { useSessionRename } from '@/modules/sessions/hooks/useSessionRename';
import { useSessionTitleEditStore } from '@/modules/sessions/stores/useSessionTitleEditStore';
import { resources } from '@/resources';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import type { SessionTitleProps } from '@/modules/sessions/types/types';

const TITLE_CLASS = 'min-w-0 truncate text-[13px] font-normal text-foreground-secondary';
const MAX_TITLE_LENGTH = 200;

export const SessionTitle = ({ sessionId, title }: SessionTitleProps) => {
  const { editingSessionId, startEditing, stopEditing } = useSessionTitleEditStore();
  const editing = editingSessionId === sessionId;
  const rename = useSessionRename();
  // Enter and Escape unmount the input, which can still blur: only the first outcome counts.
  const settled = useRef(false);

  const focusAndSelect = useCallback((input: HTMLInputElement | null) => {
    input?.focus();
    input?.select();
  }, []);

  const finish = (value: string | null) => {
    if (settled.current) return;
    settled.current = true;
    stopEditing();
    const next = value?.trim();
    if (next && next !== title) rename(sessionId, next);
  };

  if (!editing) {
    return (
      <h1 className="min-w-0">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className={`${TITLE_CLASS} block max-w-full rounded-md px-1.5 py-1 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring`}
                onClick={() => {
                  settled.current = false;
                  startEditing(sessionId);
                }}
              />
            }
          >
            {title}
          </TooltipTrigger>
          <TooltipContent side="bottom">{resources.sessions.rename.tooltip}</TooltipContent>
        </Tooltip>
      </h1>
    );
  }

  return (
    <input
      ref={focusAndSelect}
      aria-label={resources.sessions.rename.label}
      defaultValue={title}
      maxLength={MAX_TITLE_LENGTH}
      className={`${TITLE_CLASS} w-64 max-w-full rounded-md bg-accent px-1.5 py-1 outline-none`}
      onBlur={(event) => finish(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') finish(event.currentTarget.value);
        if (event.key === 'Escape') finish(null);
      }}
    />
  );
};
