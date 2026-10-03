import { IconButton, Input, InputGroup } from '@chakra-ui/react';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import type { PasswordInputProps } from '@/shared/types/types';
import { resources } from '@/resources';

// Chakra's password-input snippet, made controlled and with a focusable, named toggle.
export const PasswordInput = ({
  visible,
  onToggleVisibility,
  ...inputProps
}: PasswordInputProps) => (
  <InputGroup
    endElement={
      <IconButton
        type="button"
        variant="ghost"
        size="sm"
        me="-2"
        aria-label={
          visible ? resources.passwordInput.hidePassword : resources.passwordInput.showPassword
        }
        onClick={onToggleVisibility}
        disabled={inputProps.disabled}
      >
        {visible ? <LuEyeOff /> : <LuEye />}
      </IconButton>
    }
  >
    <Input {...inputProps} type={visible ? 'text' : 'password'} />
  </InputGroup>
);
