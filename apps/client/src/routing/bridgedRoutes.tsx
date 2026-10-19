import type { RouteObject } from 'react-router';
import { ChatPage } from '@/modules/chat/ChatPage';
import { AuthPage } from '@/modules/auth/AuthPage';
import { ForgotPasswordPage } from '@/modules/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/modules/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@/modules/auth/VerifyEmailPage';
import { route } from '@/routing/routes';

/** The routes still served by react-router, behind TanStack Router's catch-all bridge (`routes/$.tsx`). */
export const BRIDGED_ROUTES: RouteObject[] = [
  { path: route.chat.root(), element: <ChatPage /> },
  { path: route.chat.session(':id'), element: <ChatPage /> },
  { path: route.auth.root(), element: <AuthPage /> },
  { path: route.auth.forgotPassword(), element: <ForgotPasswordPage /> },
  { path: route.auth.resetPassword(), element: <ResetPasswordPage /> },
  { path: route.auth.verifyEmail(), element: <VerifyEmailPage /> },
];
