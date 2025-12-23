import type { ReactElement } from 'react';

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string;
  }>;
}

export interface ConversationListItemProps {
  conversation: Conversation;
  onClick: (id: string) => void;
}

export interface ConversationsSearchProps {
  conversations: Conversation[];
  onConversationClick: (id: string) => void;
  onClose: () => void;
}

export interface ConversationActionButtonProps {
  icon: ReactElement;
  label: string;
  onClick: () => void;
}

export interface ConversationsContextValue {
  conversations: Conversation[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}
