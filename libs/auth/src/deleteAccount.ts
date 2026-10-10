/** Why an Account deletion is refused; a code the client maps to a field error. */
export type DeleteAccountRejection = 'PASSWORD_REQUIRED';

export const DELETE_ACCOUNT_REJECTION_MESSAGES: Record<DeleteAccountRejection, string> = {
  PASSWORD_REQUIRED: 'Enter your password to delete your account.',
};

/**
 * Why a `/delete-user` request must be refused, or null. better-auth accepts a sign-in under a
 * day old in place of the password; a user who has a password must still send it.
 */
export const findDeleteAccountRejection = ({
  password,
  hasPassword,
}: {
  password?: string;
  hasPassword: boolean;
}): DeleteAccountRejection | null => (hasPassword && !password ? 'PASSWORD_REQUIRED' : null);
