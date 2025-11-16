import { Box, Flex } from '@chakra-ui/react';
import type { ChatMessage } from '../types/types'; // Ensure correct type is imported
import { ChatInput } from './ChatInput';
import { useChatStream } from '../hooks/useChatStream';
import { useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';

export const ChatContainer = () => {
  const { history, isStreaming, streamMessage, setHistory } = useChatStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('Chat History:', history);
  }, [history]);

  const handleSendMessage = async (message: string) => {
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: message,
    };

    const updatedMessages = [...history, newUserMessage];
    setHistory(updatedMessages);

    try {
      await streamMessage({ messages: updatedMessages, model: 'gpt-4o-mini' });
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
          history.map((message) => <ChatMessageComponent key={message.content} message={message} />)
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
        />
      </Box>
    </Flex>
  );
};
