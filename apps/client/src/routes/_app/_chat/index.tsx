import { createFileRoute } from '@tanstack/react-router';
import { ChatPage } from '@/modules/chat/ChatPage';

export const Route = createFileRoute('/_app/_chat/')({
  component: ChatPage,
});
