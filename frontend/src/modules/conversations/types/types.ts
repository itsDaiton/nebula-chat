export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
}

export interface ConversationListItemProps {
  conversation: Conversation;
  onClick: (id: string) => void;
}
