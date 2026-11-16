import { Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { AuthForm } from '@/modules/auth/components/AuthForm';
import { useAfterSignOut } from '@/modules/auth/hooks/useAfterSignOut';
import { CONFIRM_DELETE_ACCOUNT_FORM, DELETE_ACCOUNT_FORM } from '@/modules/auth/utils/authForms';
import { useHasPassword } from '@/modules/settings/hooks/useHasPassword';
import { resources } from '@/resources';

/** Confirms the deletion: with the password if the user has one, else with their recent sign-in. */
export const DeleteAccountForm = () => {
  const { data: hasPassword, isPending } = useHasPassword();
  const afterSignOut = useAfterSignOut();

  const onDeleted = () => {
    toast.success(resources.settings.account.deleteAccount.done);
    afterSignOut();
  };

  if (isPending) return <Loader2Icon className="animate-spin" />;

  // If the lookup fails, ask for a password: most accounts have one, and the server checks anyway.
  return hasPassword === false ? (
    <AuthForm
      config={CONFIRM_DELETE_ACCOUNT_FORM}
      header="description"
      compact
      onSuccess={onDeleted}
    />
  ) : (
    <AuthForm config={DELETE_ACCOUNT_FORM} header="description" compact onSuccess={onDeleted} />
  );
};
