export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
};

export type ConversationsState = {
  conversations: Conversation[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  fetchConversations: (showLoading?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  prependConversation: (conversation: Conversation) => void;
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

export type UseInfiniteScrollOptions = {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void | Promise<void>;
  threshold?: number;
};

export type ConversationsListProps = {
  onClose?: () => void;
  inDrawer?: boolean;
  toggleSearch?: () => void;
  closeSearch?: () => void;
};
