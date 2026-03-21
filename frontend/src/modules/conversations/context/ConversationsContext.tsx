import { createContext, useContext } from 'react';
import type { ConversationsContextValue } from '@/modules/conversations/types/types';

export const ConversationsContext = createContext<ConversationsContextValue | undefined>(undefined);

export function useConversationsContext() {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error('useConversationsContext must be used within ConversationsProvider');
  }
  return context;
}
