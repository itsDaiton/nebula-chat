import { Box, Flex, Text } from '@chakra-ui/react';
import { useParams } from 'react-router';
import { ChatContainerBox } from './ChatContainerBox';
import { ChatMessagesSkeletons } from './ChatMessageSkeleton';
import { ChatInputBar } from './ChatInputBar';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatMessageList } from './ChatMessageList';
import { useChatStream } from '../hooks/useChatStream';
import { useHandleSendMessage } from '../hooks/useHandleSendMessage';
import { useModel } from '../hooks/useModel';
import { useConversationSync } from '../hooks/useConversationSync';
import { useConversation } from '@/modules/conversations/hooks/useConversation';
import { chatScrollBar } from '@/shared/components/scrollbar';
import { resources } from '@/resources';

export const ChatContainer = () => {
  const { id: conversationId } = useParams<{ id: string }>();
  const {
    conversation,
    isLoading: isLoadingConversation,
    error: conversationError,
  } = useConversation(conversationId);
  const { history, isStreaming, streamMessage, setHistory, setConversationId } = useChatStream();
  const { selectedModel, setSelectedModel } = useModel();

  const { isLoadingDifferentConversation } = useConversationSync({
    conversationId,
    conversation,
    isLoadingConversation,
    isStreaming,
    setHistory,
    setConversationId,
  });

  const { handleSendMessage } = useHandleSendMessage({ history, setHistory, streamMessage });

  if (isLoadingDifferentConversation) {
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

  if (conversationId && conversationError) {
    return (
      <ChatContainerBox>
        <Flex h="100%" align="center" justify="center">
          <Flex direction="column" align="center" gap={2} maxW="400px" textAlign="center">
            <Text fontSize="md" fontWeight="medium" color="red.500">
              {resources.conversations.single.error}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              {conversationError}
            </Text>
          </Flex>
        </Flex>
      </ChatContainerBox>
    );
  }

  return (
    <ChatContainerBox>
      <Box flex="1" overflowY="auto" p={4} mb="120px" css={chatScrollBar}>
        {history.length === 0 ? (
          <ChatEmptyState conversationId={conversationId} />
        ) : (
          <ChatMessageList history={history} isStreaming={isStreaming} />
        )}
        <div
          key={`scroll-${history.length}-${String(isStreaming)}`}
          ref={(node) => node?.scrollIntoView({ behavior: 'smooth' })}
          style={{ height: '0px' }}
        />
      </Box>
      <ChatInputBar
        onSend={(msg) => void handleSendMessage(msg, selectedModel)}
        isLoading={isStreaming}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
    </ChatContainerBox>
  );
};
