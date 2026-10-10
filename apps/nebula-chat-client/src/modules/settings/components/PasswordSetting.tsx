import { Box, Button } from '@chakra-ui/react';
import { AuthForm } from '@/modules/auth/components/AuthForm';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { CHANGE_PASSWORD_FORM } from '@/modules/auth/utils/authForms';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { usePasswordChangeStore } from '@/modules/settings/stores/usePasswordChangeStore';
import { resources } from '@/resources';
import { toaster } from '@/shared/components/ui/toaster';

const { changePassword } = resources.settings;

/** The Password row; its button unfolds the Password change form beneath it. */
export const PasswordSetting = () => {
  const { isPasswordFormOpen, togglePasswordForm, closePasswordForm } = usePasswordChangeStore();
  const { hidePassword } = usePasswordVisibilityStore();

  const toggle = () => {
    hidePassword();
    togglePasswordForm();
  };

  const onChanged = () => {
    closePasswordForm();
    toaster.create({ type: 'success', title: changePassword.done });
  };

  return (
    <>
      <SettingsRow label={changePassword.title} description={changePassword.description}>
        {/* Fixed width, so swapping its label doesn't reflow the description beside it. */}
        <Button variant="outline" minW="36" onClick={toggle} aria-expanded={isPasswordFormOpen}>
          {isPasswordFormOpen ? changePassword.cancel : changePassword.open}
        </Button>
      </SettingsRow>
      {isPasswordFormOpen && (
        <Box maxW="md" py={4}>
          <AuthForm config={CHANGE_PASSWORD_FORM} header="none" onSuccess={onChanged} />
        </Box>
      )}
    </>
  );
};
