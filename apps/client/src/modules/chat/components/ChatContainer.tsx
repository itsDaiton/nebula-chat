import { useEffect, useRef } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useParams } from '@tanstack/react-router';
import { ChatContainerBox } from '@/modules/chat/components/ChatContainerBox';
import { ChatMessagesSkeletons } from '@/modules/chat/components/ChatMessagesSkeletons';
import { ChatInputBar } from '@/modules/chat/components/ChatInputBar';
import { ChatEmptyState } from '@/modules/chat/components/ChatEmptyState';
import { ChatMessageList } from '@/modules/chat/components/ChatMessageList';
import { useChatStream } from '@/modules/chat/hooks/useChatStream';
import { useHandleSendMessage } from '@/modules/chat/hooks/useHandleSendMessage';
import { useModel } from '@/modules/chat/hooks/useModel';
import { useChatSession } from '@/modules/sessions/hooks/useChatSession';
import { chatScrollBar } from '@/shared/components/scrollbar';
import { scrollToBottom } from '@/shared/utils/scrollUtils';
import { resources } from '@/resources';

export const ChatContainer = () => {
  const { id: sessionId } = useParams({ strict: false });
  const {
    error: sessionError,
    isLoading: isSessionLoading,
    activeStreamId,
  } = useChatSession(sessionId);
  const {
    history,
    isStreaming,
    isPostStreamNavigation,
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

  if (sessionId && isSessionLoading && chatSessionId !== sessionId) {
    return (
      <ChatContainerBox>
        <Box flex="1" overflowY="auto" p={4} mb="120px" css={chatScrollBar}>
          <ChatMessagesSkeletons count={5} />
        </Box>
        <ChatInputBar
          onSend={(msg) => void handleSendMessage(msg, selectedModel)}
          isLoading={false}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </ChatContainerBox>
    );
  }

  if (sessionId && sessionError) {
    return (
      <ChatContainerBox>
        <Flex h="100%" align="center" justify="center">
          <Flex direction="column" align="center" gap={2} maxW="400px" textAlign="center">
            <Text fontSize="md" fontWeight="medium" color="red.500">
              {resources.sessions.single.error}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              {sessionError.message}
            </Text>
          </Flex>
        </Flex>
      </ChatContainerBox>
    );
  }

  return (
    <ChatContainerBox>
      <Box flex="1" overflowY="auto" p={4} mb="120px" css={chatScrollBar}>
        {(sessionId || isStreaming) && history.length > 0 ? (
          <ChatMessageList history={history} isStreaming={isStreaming} />
        ) : (
          <ChatEmptyState sessionId={sessionId} />
        )}
        <div ref={scrollRef} style={{ height: '0px' }} />
      </Box>
      <ChatInputBar
        onSend={(msg) => void handleSendMessage(msg, selectedModel)}
        isLoading={isStreaming}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onStop={() => void stop()}
      />
    </ChatContainerBox>
  );
};
