import { toast } from 'sonner';
import { AuthForm } from '@/modules/auth/components/AuthForm';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { CHANGE_PASSWORD_FORM } from '@/modules/auth/utils/authForms';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { usePasswordChangeStore } from '@/modules/settings/stores/usePasswordChangeStore';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { useOnUnmount } from '@/shared/hooks/useOnUnmount';

const { changePassword } = resources.settings;

/** The Password row; its button unfolds the Password change form beneath it. */
export const PasswordSetting = () => {
  const { isPasswordFormOpen, togglePasswordForm, closePasswordForm } = usePasswordChangeStore();
  const { hidePassword } = usePasswordVisibilityStore();
  // The form folds away again whenever Settings leaves the Security section.
  const foldOnLeave = useOnUnmount(closePasswordForm);

  const toggle = () => {
    hidePassword();
    togglePasswordForm();
  };

  const onChanged = () => {
    closePasswordForm();
    toast.success(changePassword.done);
  };

  return (
    <div ref={foldOnLeave} className="contents">
      <SettingsRow label={changePassword.title} description={changePassword.description}>
        <Button variant="outline" onClick={toggle} aria-expanded={isPasswordFormOpen}>
          {isPasswordFormOpen ? changePassword.cancel : changePassword.open}
        </Button>
      </SettingsRow>
      {isPasswordFormOpen && (
        <div className="px-4 py-4">
          <div className="max-w-sm">
            <AuthForm config={CHANGE_PASSWORD_FORM} header="none" compact onSuccess={onChanged} />
          </div>
        </div>
      )}
    </div>
  );
};
