import { Route, Routes } from 'react-router';
import { route } from '@/routing/routes';
import { ChatPage } from '@/modules/chat/ChatPage';
import { AuthPage } from '@/modules/auth/AuthPage';
import { ForgotPasswordPage } from '@/modules/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/modules/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@/modules/auth/VerifyEmailPage';
import { AuthGate } from '@/modules/auth/components/AuthGate';
import { SettingsPage } from '@/modules/settings/SettingsPage';
import { NotFound } from '@/shared/pages/NotFound';

export const RouterProvider = () => (
  <AuthGate>
    <Routes>
      <Route path={route.chat.root()} element={<ChatPage />} />
      <Route path={route.chat.conversation(':id')} element={<ChatPage />} />
      <Route path={route.auth.root()} element={<AuthPage />} />
      <Route path={route.auth.forgotPassword()} element={<ForgotPasswordPage />} />
      <Route path={route.auth.resetPassword()} element={<ResetPasswordPage />} />
      <Route path={route.auth.verifyEmail()} element={<VerifyEmailPage />} />
      <Route path={route.settings.root()} element={<SettingsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AuthGate>
);
