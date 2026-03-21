import '@/modules/chat/stores/chatConversationSync';
import { ChatContainer } from '@/modules/chat/components/ChatContainer';
import { Layout } from '@/shared/components/layout/Layout';

export const ChatPage = () => (
  <Layout>
    <ChatContainer />
  </Layout>
);
