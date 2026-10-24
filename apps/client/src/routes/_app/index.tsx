import { createFileRoute } from '@tanstack/react-router';
import { ChatPage } from '@/modules/chat/ChatPage';

export const Route = createFileRoute('/_app/')({
  component: ChatPage,
});
