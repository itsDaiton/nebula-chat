import * as React from 'react';
import { ArrowDownIcon } from 'lucide-react';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { useScrollPositionStore } from '@/shared/stores/useScrollPositionStore';
import { cn } from '@/shared/utils/cn';

const BOTTOM_TOLERANCE_PX = 48;

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
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const isAtBottom = useScrollPositionStore((state) => state.isAtBottom);
  const markAtBottom = useScrollPositionStore((state) => state.markAtBottom);

  return (
    <div data-slot="chat-scroller" className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={viewportRef}
        data-slot="chat-scroller-viewport"
        className={cn(
          'min-h-0 flex-1 overflow-y-auto [&>*:not([data-slot=chat-scroller-anchor])]:[overflow-anchor:none]',
          className,
        )}
        onScroll={(event) => {
          const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
          markAtBottom(scrollHeight - scrollTop - clientHeight <= BOTTOM_TOLERANCE_PX);
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
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={resources.chat.scrollToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-panel shadow-sm"
          onClick={() =>
            viewportRef.current?.scrollTo({
              top: viewportRef.current.scrollHeight,
              behavior: 'smooth',
            })
          }
        >
          <ArrowDownIcon />
        </Button>
      )}
    </div>
  );
};

export { ChatScroller };
