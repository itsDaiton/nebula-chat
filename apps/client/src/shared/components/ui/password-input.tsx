import { EyeIcon, EyeOffIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/components/ui/input-group';
import type { PasswordInputProps } from '@/shared/types/types';
import { resources } from '@/resources';

/** A password field with a focusable, named toggle that shows or hides the value. */
export const PasswordInput = ({
  visible,
  onToggleVisibility,
  ...inputProps
}: PasswordInputProps) => (
  <InputGroup>
    <InputGroupInput {...inputProps} type={visible ? 'text' : 'password'} />
    <InputGroupAddon align="inline-end">
      <InputGroupButton
        size="icon-xs"
        aria-label={
          visible ? resources.passwordInput.hidePassword : resources.passwordInput.showPassword
        }
        onClick={onToggleVisibility}
        disabled={inputProps.disabled}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </InputGroupButton>
    </InputGroupAddon>
  </InputGroup>
);
