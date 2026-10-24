import type { RouteObject } from 'react-router';
import { ChatPage } from '@/modules/chat/ChatPage';
import { route } from '@/routing/routes';

/** The routes still served by react-router, behind TanStack Router's catch-all bridge (`routes/$.tsx`). */
export const BRIDGED_ROUTES: RouteObject[] = [
  { path: route.chat.root(), element: <ChatPage /> },
  { path: route.chat.session(':id'), element: <ChatPage /> },
];
