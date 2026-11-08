import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AuthForm } from '@/modules/auth/components/AuthForm';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { CHANGE_PASSWORD_FORM } from '@/modules/auth/utils/authForms';
import {
  ACCOUNTS_KEY,
  useHasPassword,
  usePasswordChangedAt,
} from '@/modules/settings/hooks/useHasPassword';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { usePasswordChangeStore } from '@/modules/settings/stores/usePasswordChangeStore';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { useOnUnmount } from '@/shared/hooks/useOnUnmount';
import { formatRelativeTime } from '@/shared/utils/relativeTime';

const { changePassword } = resources.settings;

/** The Password row; its button unfolds the Password change form beneath it. */
export const PasswordSetting = () => {
  const { isPasswordFormOpen, togglePasswordForm, closePasswordForm } = usePasswordChangeStore();
  const { hidePassword } = usePasswordVisibilityStore();
  const queryClient = useQueryClient();
  const { data: hasPassword } = useHasPassword();
  const { data: changedAt } = usePasswordChangedAt();
  // The form folds away again whenever Settings leaves the Security section.
  const foldOnLeave = useOnUnmount(closePasswordForm);

  const toggle = () => {
    hidePassword();
    togglePasswordForm();
  };

  const onChanged = () => {
    closePasswordForm();
    void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    toast.success(changePassword.done);
  };

  // Unknown (still loading, or the lookup failed) keeps the row; only a known social-only user loses it.
  if (hasPassword === false) return null;

  const description = changedAt
    ? changePassword.changedAgo(formatRelativeTime(changedAt, Date.now()))
    : changePassword.description;

  return (
    <div ref={foldOnLeave} className="contents">
      <SettingsRow label={changePassword.title} description={description}>
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
