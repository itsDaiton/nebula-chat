export const route = {
  chat: {
    root: () => '/',
    session: (id: string) => `/c/${id}`,
  },
  auth: {
    root: () => '/auth',
    forgotPassword: () => '/auth/forgot-password',
    resetPassword: () => '/auth/reset-password',
    verifyEmail: () => '/auth/verify-email',
  },
  settings: {
    root: () => '/settings',
  },
};
