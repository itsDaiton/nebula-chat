import { Box, Flex, Spinner, Circle, Icon } from '@chakra-ui/react';
import type { ChatMessage } from '../types/types'; // Ensure correct type is imported
import { ChatInput } from './ChatInput';
import { useChatStream } from '../hooks/useChatStream';
import { useEffect, useRef, useState } from 'react';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import { IoSparkles } from 'react-icons/io5';

export const ChatContainer = () => {
  const { history, isStreaming, streamMessage, setHistory, usage } = useChatStream();
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (usage) {
      // eslint-disable-next-line no-console
      console.log('Token Usage:', {
        prompt: usage.promptTokens,
        completion: usage.completionTokens,
        total: usage.totalTokens,
      });
    }
  }, [usage]);

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSendMessage = async (message: string) => {
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: message,
    };

    const updatedMessages = [...history, newUserMessage];
    setHistory(updatedMessages);

    try {
      await streamMessage({ messages: updatedMessages, model: selectedModel });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Streaming error:', err);
    }
  };

  return (
    <Flex
      direction="column"
      h="calc(100vh - 120px)"
      maxW="1000px"
      mx="auto"
      bg="bg.default"
      borderWidth={{ base: '1px', _dark: '1.5px' }}
      borderColor="border.default"
      borderRadius="lg"
      position="relative"
      boxShadow={{ base: 'sm', _dark: 'none' }}
    >
      <Box
        flex="1"
        overflowY="auto"
        p={4}
        mb="70px"
        css={{
          '&::-webkit-scrollbar': {
            width: '4px',
            background: 'transparent',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'var(--chakra-colors-border-default)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'var(--chakra-colors-border-emphasized)',
          },
        }}
      >
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
              Welcome to Nebula Chat! 👋
            </Box>
            <Box fontSize="md" maxW="600px" lineHeight="tall">
              I'm your AI assistant, ready to help you with any questions or tasks you might have.
              Feel free to start a conversation by typing a message below!
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
              return <ChatMessageComponent key={index} message={message} />;
            })}
            {isStreaming &&
              history[history.length - 1]?.role === 'assistant' &&
              !history[history.length - 1]?.content && (
                <Flex direction="row" gap={4} mb={6} align="center">
                  <Circle
                    size="10"
                    bg="bg.input"
                    color="fg.soft"
                    borderWidth={{ base: '1px', _dark: '1.5px' }}
                    borderColor="border.default"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    <Icon
                      as={IoSparkles}
                      boxSize="5"
                      position="relative"
                      left="0.5px"
                      top="0.5px"
                    />
                  </Circle>
                  <Box
                    bg="bg.input"
                    color="fg.soft"
                    borderRadius="lg"
                    px={4}
                    py={3}
                    borderWidth={{ base: '1px', _dark: '1.5px' }}
                    borderColor="border.default"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Spinner size="sm" color="fg.soft" />
                  </Box>
                </Flex>
              )}
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
          onSendMessage={(message) => void handleSendMessage(message)}
          isLoading={isStreaming}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </Box>
    </Flex>
  );
};
