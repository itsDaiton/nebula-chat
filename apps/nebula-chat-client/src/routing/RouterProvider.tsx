import { Route, Routes } from 'react-router';
import { route } from '@/routing/routes';
import { ChatPage } from '@/modules/chat/ChatPage';
import { AuthPage } from '@/modules/auth/AuthPage';
import { NotFound } from '@/shared/pages/NotFound';

export const RouterProvider = () => (
  <Routes>
    <Route path={route.chat.root()} element={<ChatPage />} />
    <Route path={route.chat.conversation(':id')} element={<ChatPage />} />
    <Route path={route.auth()} element={<AuthPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);
