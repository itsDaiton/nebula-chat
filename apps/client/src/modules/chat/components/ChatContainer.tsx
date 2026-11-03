import { ArchiveIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useParams } from '@tanstack/react-router';
import { ArchivedSessionBar } from '@/modules/chat/components/ArchivedSessionBar';
import { ChatContainerBox } from '@/modules/chat/components/ChatContainerBox';
import { ChatEmptyState } from '@/modules/chat/components/ChatEmptyState';
import { ChatInputBar } from '@/modules/chat/components/ChatInputBar';
import { ChatMessageList } from '@/modules/chat/components/ChatMessageList';
import { ChatMessagesSkeletons } from '@/modules/chat/components/ChatMessagesSkeletons';
import { ChatStarters } from '@/modules/chat/components/ChatStarters';
import { useChatStream } from '@/modules/chat/hooks/useChatStream';
import { useHandleSendMessage } from '@/modules/chat/hooks/useHandleSendMessage';
import { useModel } from '@/modules/chat/hooks/useModel';
import { useChatSession } from '@/modules/sessions/hooks/useChatSession';
import { ChatScroller } from '@/shared/components/ui/chat-scroller';
import { scrollToBottom } from '@/shared/utils/scrollUtils';
import { resources } from '@/resources';

const COLUMN = 'mx-auto w-full max-w-(--transcript-width) px-3 sm:px-7';

export const ChatContainer = () => {
  const { id: sessionId } = useParams({ strict: false });
  const {
    error: sessionError,
    isLoading: isSessionLoading,
    activeStreamId,
    isArchived,
  } = useChatSession(sessionId);
  const {
    history,
    isStreaming,
    isPostStreamNavigation,
    isReplyStopped,
    streamMessage,
    resumeStream,
    stop,
    clearPostStream,
    sessionId: chatSessionId,
  } = useChatStream();
  const { selectedModel, setSelectedModel } = useModel();

  const { handleSendMessage } = useHandleSendMessage({ history, streamMessage });

  // Guarded render-time sync (no effect): a Session opened mid-reply re-attaches to it once its
  // history is in; `resumeStream` ignores a stream it is already following.
  if (sessionId && activeStreamId && chatSessionId === sessionId) {
    void resumeStream({ sessionId, streamId: activeStreamId });
  }
  const scrollRef = useRef<HTMLDivElement>(null);

  // Once the navigation has rendered (sessionId from URL params is set),
  // it's safe to clear the streaming state without causing an empty-state flicker.
  useEffect(() => {
    if (isPostStreamNavigation && sessionId) {
      clearPostStream();
    }
  }, [sessionId, isPostStreamNavigation, clearPostStream]);

  useEffect(() => {
    scrollToBottom(scrollRef);
  }, [history.length, isStreaming]);

  const composer =
    isArchived && sessionId ? (
      <ArchivedSessionBar sessionId={sessionId} />
    ) : (
      <ChatInputBar
        onSend={(msg) => void handleSendMessage(msg, selectedModel)}
        isLoading={isStreaming}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onStop={() => void stop()}
      />
    );

  if (sessionId && isSessionLoading && chatSessionId !== sessionId) {
    return (
      <ChatContainerBox>
        <ChatScroller anchorRef={scrollRef}>
          <div className={`${COLUMN} pt-7 pb-2`}>
            <ChatMessagesSkeletons count={5} />
          </div>
        </ChatScroller>
        {composer}
      </ChatContainerBox>
    );
  }

  if (sessionId && sessionError) {
    return (
      <ChatContainerBox>
        <div className="flex h-full items-center justify-center">
          <div className="flex max-w-[400px] flex-col items-center gap-2 text-center">
            <p className="font-medium text-destructive">{resources.sessions.single.error}</p>
            <p className="text-sm text-muted-foreground">{sessionError.message}</p>
          </div>
        </div>
      </ChatContainerBox>
    );
  }

  const isEmpty = history.length === 0;

  // The composer keeps one slot in both layouts: remounting it mid-send unsubscribes the allowance
  // footer and cancels the check the send is awaiting. A new chat centres it between the greeting
  // (above) and the starters (below).
  return (
    <ChatContainerBox>
      {isArchived && (
        <p
          role="note"
          className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 py-2.5 text-sm"
        >
          <ArchiveIcon className="size-4 text-muted-foreground" />
          {resources.settings.archived.notice}
        </p>
      )}
      {isEmpty ? (
        <div className="flex flex-1 items-end justify-center overflow-y-auto pb-9">
          <ChatEmptyState sessionId={sessionId} />
        </div>
      ) : (
        <ChatScroller anchorRef={scrollRef}>
          <div className={`${COLUMN} pt-7 pb-2`}>
            <ChatMessageList
              history={history}
              isStreaming={isStreaming}
              isReplyStopped={isReplyStopped}
              onRegenerate={
                isArchived ? undefined : (prompt) => void handleSendMessage(prompt, selectedModel)
              }
            />
          </div>
        </ChatScroller>
      )}
      {composer}
      {isEmpty && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!sessionId && (
            <div className={COLUMN}>
              <ChatStarters />
            </div>
          )}
        </div>
      )}
    </ChatContainerBox>
  );
};
