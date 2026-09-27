import type { ListConversations200ConversationsItem } from '@/libs/api/generated/model/listConversations200ConversationsItem';

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
};

/** A conversation as the API returns it: list, search and detail share this shape. */
export type ConversationResponse = ListConversations200ConversationsItem;

export type ConversationListItemProps = {
  conversation: Conversation;
  onClick: (id: string) => void;
};

export type ConversationsSearchState = {
  searchQuery: string;
  debouncedQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
};

export type UseConversationsSearchParams = {
  localConversations: Conversation[];
  onClose: () => void;
  onConversationClick: (conversationId: string) => void;
};

export type ConversationsSearchProps = {
  conversations: Conversation[];
  onConversationClick: (id: string) => void;
  onClose: () => void;
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
