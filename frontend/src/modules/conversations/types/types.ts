export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
};

export type ConversationWithMessages = Conversation & {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string;
  }>;
};

export type ConversationListItemProps = {
  conversation: Conversation;
  onClick: (id: string) => void;
};

export type ConversationsSearchProps = {
  conversations: Conversation[];
  onConversationClick: (id: string) => void;
  onClose: () => void;
};

export type ConversationsContextValue = {
  conversations: Conversation[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
};

export type ConversationListSkeletonsProps = {
  count?: number;
};
