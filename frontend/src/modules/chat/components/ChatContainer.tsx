import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import { ChatInput } from './ChatInput';
import { useChatStream } from '../hooks/useChatStream';
import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { useHandleSendMessage } from '../hooks/useHandleSendMessage';
import { useModel } from '../hooks/useModel';
import { chatScrollBar } from '@/shared/components/scrollbar';
import { resources } from '@/resources';
import { ChatStreaming } from './ChatStreaming';
import { ChatContainerBox } from './ChatContainerBox';
import { useAutoScroll } from '../../../shared/hooks/useAutoScroll';
import { useParams } from 'react-router';
import { useConversation } from '@/modules/conversations/hooks/useConversation';

export const ChatContainer = () => {
  const { id: conversationId } = useParams<{ id: string }>();
  const {
    conversation,
    isLoading: isLoadingConversation,
    error: conversationError,
  } = useConversation(conversationId);
  const { history, isStreaming, streamMessage, setHistory, setConversationId } = useChatStream();
  const { selectedModel, setSelectedModel } = useModel();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadedConversationId = useRef<string | null>(null);

  useEffect(() => {
    if (conversation && conversation.messages) {
      const isDifferentConversation = loadedConversationId.current !== conversation.id;
      if (isDifferentConversation) {
        const messages = conversation.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
        setHistory(messages);
        setConversationId(conversation.id);
        loadedConversationId.current = conversation.id;
      }
    } else if (!conversationId && !isStreaming && loadedConversationId.current !== null) {
      setHistory([]);
      setConversationId(undefined);
      loadedConversationId.current = null;
    }
  }, [conversation, conversationId, isStreaming, setHistory, setConversationId]);

  const { handleSendMessage } = useHandleSendMessage({
    history,
    setHistory,
    streamMessage,
  });

  useAutoScroll(messagesEndRef, [history, isStreaming]);

  if (conversationId && isLoadingConversation) {
    return (
      <ChatContainerBox>
        <Flex h="100%" align="center" justify="center">
          <Flex direction="column" align="center" gap={2}>
            <Spinner size="lg" color="fg.muted" />
            <Text fontSize="sm" color="fg.muted">
              {resources.conversations.single.loading}
            </Text>
          </Flex>
        </Flex>
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
          <Flex
            direction="column"
            align="center"
            justify="center"
            h="100%"
            textAlign="center"
            color="fg.muted"
            gap={4}
          >
            {conversationId ? (
              <>
                <Box fontSize="2xl" fontWeight="medium" color="fg.default" maxW="600px">
                  {resources.chat.emptyConversation}
                </Box>
                <Box fontSize="md" maxW="600px" lineHeight="tall">
                  {resources.chat.emptyConversationHint}
                </Box>
              </>
            ) : (
              <>
                <Box fontSize="2xl" fontWeight="medium" color="fg.default" maxW="600px">
                  {resources.chat.welcomeMessage}
                </Box>
                <Box fontSize="md" maxW="600px" lineHeight="tall">
                  {resources.chat.welcomeIntro}
                </Box>
              </>
            )}
          </Flex>
        ) : (
          <>
            {history.map((message, index) => {
              if (
                isStreaming &&
                index === history.length - 1 &&
                message.role === 'assistant' &&
                !message.content
              ) {
                return null;
              }
              return <ChatMessage key={index} message={message} />;
            })}
            {isStreaming &&
              history[history.length - 1]?.role === 'assistant' &&
              !history[history.length - 1]?.content && <ChatStreaming />}
          </>
        )}
        <div ref={messagesEndRef} style={{ height: '0px' }} />
      </Box>
      <Box
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        borderTop={{ base: '1px', _dark: '1.5px' }}
        borderColor="border.default"
      >
        <ChatInput
          onSendMessage={(message) => void handleSendMessage(message, selectedModel)}
          isLoading={isStreaming}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </Box>
    </ChatContainerBox>
  );
};
