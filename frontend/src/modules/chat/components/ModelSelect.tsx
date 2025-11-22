import { Icon, Select } from '@chakra-ui/react';
import { modelOptions } from '../utils/chatUtils';
import { IoChevronDown } from 'react-icons/io5';

export const ModelSelect = ({
  selectedModel,
  onModelChange,
  isSelectOpen,
  setIsSelectOpen,
  triggerWidth,
}: {
  selectedModel: string;
  onModelChange: (model: string) => void;
  isSelectOpen: boolean;
  setIsSelectOpen: (isOpen: boolean) => void;
  triggerWidth?: number;
}) => (
  <Select.Root
    collection={modelOptions}
    value={[selectedModel]}
    onValueChange={(details) => details.value[0] && onModelChange(details.value[0])}
    onOpenChange={(details) => setIsSelectOpen(details.open)}
    positioning={{ placement: 'top', flip: false }}
    size="sm"
    width={triggerWidth ? `${triggerWidth}px` : 'auto'}
    minW="120px"
  >
    <Select.Control>
      <Select.Trigger
        bg="transparent"
        border="none"
        color="fg.muted"
        fontSize="sm"
        fontWeight="medium"
        height="32px"
        px={2}
        cursor="pointer"
        width="100%"
        _hover={{
          bg: 'bg.subtle',
          color: 'fg.soft',
        }}
        _focus={{
          outline: 'none',
          boxShadow: 'none',
          bg: 'transparent',
        }}
        _focusVisible={{
          outline: 'none',
          boxShadow: 'none',
          bg: 'transparent',
        }}
      >
        <Select.ValueText />
      </Select.Trigger>
      <Select.IndicatorGroup>
        <Icon
          as={IoChevronDown}
          boxSize="16px"
          color="fg.muted"
          transform={isSelectOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
          transition="transform 0.2s"
        />
      </Select.IndicatorGroup>
    </Select.Control>
    <Select.Positioner>
      <Select.Content bg="bg.input" borderColor="border.default">
        {modelOptions.items.map((item) => (
          <Select.Item key={item.value} item={item}>
            {item.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Positioner>
  </Select.Root>
);
