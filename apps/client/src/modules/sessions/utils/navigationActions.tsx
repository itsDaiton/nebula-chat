import { FolderIcon, SearchIcon, SparklesIcon, SquarePenIcon } from 'lucide-react';
import type { NavigationAction } from '@/modules/sessions/types/types';
import { resources } from '@/resources';

export const navigationActions: NavigationAction[] = [
  {
    id: 'new-chat',
    icon: <SquarePenIcon />,
    label: resources.sidebar.newChat,
    action: 'newChat',
    shortcut: 'E',
  },
  {
    id: 'search',
    icon: <SearchIcon />,
    label: resources.sidebar.searchChats,
    action: 'search',
    shortcut: 'K',
  },
  { id: 'files', icon: <FolderIcon />, label: resources.sidebar.files, action: 'files' },
  {
    id: 'ai-studio',
    icon: <SparklesIcon />,
    label: resources.sidebar.aiStudio,
    action: 'aiStudio',
  },
];
