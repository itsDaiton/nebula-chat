import { useState } from 'react';
import { toast } from 'sonner';
import { AuthForm } from '@/modules/auth/components/AuthForm';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { CHANGE_PASSWORD_FORM } from '@/modules/auth/utils/authForms';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { changePassword } = resources.settings;

/** The Password row; its button unfolds the Password change form beneath it. */
export const PasswordSetting = () => {
  const [isOpen, setOpen] = useState(false);
  const { hidePassword } = usePasswordVisibilityStore();

  const toggle = () => {
    hidePassword();
    setOpen((open) => !open);
  };

  const onChanged = () => {
    setOpen(false);
    toast.success(changePassword.done);
  };

  return (
    <>
      <SettingsRow label={changePassword.title} description={changePassword.description}>
        <Button variant="outline" onClick={toggle} aria-expanded={isOpen}>
          {isOpen ? changePassword.cancel : changePassword.open}
        </Button>
      </SettingsRow>
      {isOpen && (
        <div className="max-w-md px-4 pb-4">
          <AuthForm config={CHANGE_PASSWORD_FORM} header="none" onSuccess={onChanged} />
        </div>
      )}
    </>
  );
};
