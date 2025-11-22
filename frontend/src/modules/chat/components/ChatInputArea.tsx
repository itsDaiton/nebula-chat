import { Textarea } from '@chakra-ui/react';

export const ChatInputArea = ({
  inputRef,
  message,
  setMessage,
  isLoading,
  chatScrollBar,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  chatScrollBar: any;
}) => (
  <Textarea
    ref={inputRef}
    value={message}
    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
    autoFocus
    placeholder="Ask me anything..."
    size="lg"
    px={4}
    py={3}
    pb={1}
    disabled={isLoading}
    bg="transparent"
    border="none"
    color="fg.soft"
    resize="none"
    minH="auto"
    maxH="200px"
    overflow="hidden"
    rows={1}
    css={chatScrollBar}
    _focus={{
      outline: 'none',
      boxShadow: 'none',
    }}
    _disabled={{
      cursor: 'not-allowed',
      opacity: 0.7,
    }}
    _placeholder={{
      color: 'fg.muted',
    }}
  />
);
