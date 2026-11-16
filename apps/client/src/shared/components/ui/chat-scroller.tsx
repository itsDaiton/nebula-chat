import * as React from 'react';
import { ArrowDownIcon } from 'lucide-react';
import { resources } from '@/resources';
import { IconButton } from '@/shared/components/ui/icon-button';
import { useScrollPositionStore } from '@/shared/stores/useScrollPositionStore';
import { cn } from '@/shared/utils/cn';

const BOTTOM_TOLERANCE_PX = 48;

const distanceFromBottom = ({ scrollHeight, scrollTop, clientHeight }: HTMLElement) =>
  scrollHeight - scrollTop - clientHeight;

type ChatScrollerProps = React.ComponentProps<'div'> & {
  /** The element at the end of the thread: what scrolling to the newest Message reveals. */
  anchorRef?: React.Ref<HTMLDivElement>;
};

// Only the end anchor takes part in scroll anchoring, so a thread already at the bottom stays pinned to it as a reply streams in.
const ChatScroller = ({
  className,
  children,
  anchorRef,
  onScroll,
  ...props
}: ChatScrollerProps) => {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const isAtBottom = useScrollPositionStore((state) => state.isAtBottom);
  const markAtBottom = useScrollPositionStore((state) => state.markAtBottom);

  // The store outlives a thread, so a short new one must not inherit "scrolled up" from the last.
  const measureOnMount = React.useCallback(
    (element: HTMLDivElement | null) => {
      viewportRef.current = element;
      if (element) markAtBottom(distanceFromBottom(element) <= BOTTOM_TOLERANCE_PX);
    },
    [markAtBottom],
  );

  return (
    <div data-slot="chat-scroller" className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={measureOnMount}
        data-slot="chat-scroller-viewport"
        className={cn(
          'min-h-0 flex-1 overflow-y-auto [&>*:not([data-slot=chat-scroller-anchor])]:[overflow-anchor:none]',
          className,
        )}
        onScroll={(event) => {
          markAtBottom(distanceFromBottom(event.currentTarget) <= BOTTOM_TOLERANCE_PX);
          onScroll?.(event);
        }}
        {...props}
      >
        {children}
        <div
          ref={anchorRef}
          data-slot="chat-scroller-anchor"
          aria-hidden
          className="h-px [overflow-anchor:auto]"
        />
      </div>
      {!isAtBottom && (
        <IconButton
          variant="outline"
          size="icon-sm"
          label={resources.chat.scrollToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-panel shadow-sm"
          onClick={() =>
            viewportRef.current?.scrollTo({
              top: viewportRef.current.scrollHeight,
              behavior: 'smooth',
            })
          }
        >
          <ArrowDownIcon />
        </IconButton>
      )}
    </div>
  );
};

export { ChatScroller };
