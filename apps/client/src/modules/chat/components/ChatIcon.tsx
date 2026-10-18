import { Circle, Icon } from '@chakra-ui/react';
import { IoSparkles } from 'react-icons/io5';
import { LuUser } from 'react-icons/lu';

export const ChatIcon = ({ isUser }: { isUser: boolean }) => (
  <Circle
    size="10"
    bg={isUser ? 'bg.subtle' : 'bg.input'}
    color="fg.soft"
    borderWidth={{ base: '1px', _dark: '1.5px' }}
    borderColor="border.default"
    display="flex"
    alignItems="center"
    justifyContent="center"
    flexShrink={0}
  >
    <Icon
      as={isUser ? LuUser : IoSparkles}
      boxSize="5"
      position="relative"
      left="0.5px"
      top="0.5px"
    />
  </Circle>
);
