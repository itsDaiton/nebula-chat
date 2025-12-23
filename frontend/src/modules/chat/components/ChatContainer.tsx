import { Box, Flex } from '@chakra-ui/react';
import { ChatInput } from './ChatInput';
import { useChatStream } from '../hooks/useChatStream';
import { useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { useHandleSendMessage } from '../hooks/useHandleSendMessage';
import { useModel } from '../hooks/useModel';
import { chatScrollBar } from '@/shared/components/scrollbar';
import { resources } from '@/resources';
import { ChatStreaming } from './ChatStreaming';
import { ChatContainerBox } from './ChatContainerBox';
import { useAutoScroll } from '../../../shared/hooks/useAutoScroll';

export const ChatContainer = () => {
  const { history, isStreaming, streamMessage, setHistory } = useChatStream();
  const { selectedModel, setSelectedModel } = useModel();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { handleSendMessage } = useHandleSendMessage({
    history,
    setHistory,
    streamMessage,
  });

  useAutoScroll(messagesEndRef, [history, isStreaming]);

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
            <Box fontSize="2xl" fontWeight="medium" color="fg.default" maxW="600px">
              {resources.chat.welcomeMessage}
            </Box>
            <Box fontSize="md" maxW="600px" lineHeight="tall">
              {resources.chat.welcomeIntro}
            </Box>
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
