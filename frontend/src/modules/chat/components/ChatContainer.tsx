import { Box, Flex, Text } from '@chakra-ui/react';
import { useParams } from 'react-router';
import { ChatContainerBox } from '@/modules/chat/components/ChatContainerBox';
import { ChatMessagesSkeletons } from '@/modules/chat/components/ChatMessagesSkeletons';
import { ChatInputBar } from '@/modules/chat/components/ChatInputBar';
import { ChatEmptyState } from '@/modules/chat/components/ChatEmptyState';
import { ChatMessageList } from '@/modules/chat/components/ChatMessageList';
import { useChatStream } from '@/modules/chat/hooks/useChatStream';
import { useHandleSendMessage } from '@/modules/chat/hooks/useHandleSendMessage';
import { useModel } from '@/modules/chat/hooks/useModel';
import { useConversation } from '@/modules/conversations/hooks/useConversation';
import { chatScrollBar } from '@/shared/components/scrollbar';
import { resources } from '@/resources';

export const ChatContainer = () => {
  const { id: conversationId } = useParams<{ id: string }>();
  const { error: conversationError } = useConversation(conversationId);
  const {
    history,
    isStreaming,
    streamMessage,
    setHistory,
    conversationId: chatConversationId,
  } = useChatStream();
  const { selectedModel, setSelectedModel } = useModel();

  const { handleSendMessage } = useHandleSendMessage({ history, setHistory, streamMessage });

  if (conversationId && conversationId !== chatConversationId) {
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
        {(conversationId || isStreaming) && history.length > 0 ? (
          <ChatMessageList history={history} isStreaming={isStreaming} />
        ) : (
          <ChatEmptyState conversationId={conversationId} />
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
