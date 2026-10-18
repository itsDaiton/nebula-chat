import type { NavigationAction } from '@/shared/types/types';
import { FiEdit, FiSearch } from 'react-icons/fi';
import { FaWandMagicSparkles } from 'react-icons/fa6';
import { IoDocumentOutline } from 'react-icons/io5';
import { resources } from '@/resources';

export const navigationActions: NavigationAction[] = [
  {
    id: 'new-chat',
    icon: <FiEdit />,
    label: resources.sidebar.newChat,
    action: 'newChat',
    shortcut: { key: 'E', ctrl: true },
  },
  {
    id: 'search',
    icon: <FiSearch />,
    label: resources.sidebar.searchChats,
    action: 'search',
    shortcut: { key: 'K', ctrl: true },
  },
  {
    id: 'files',
    icon: <IoDocumentOutline />,
    label: resources.sidebar.files,
    badge: { text: 'Soon', colorPalette: 'purple', variant: 'subtle' },
    action: 'files',
  },
  {
    id: 'ai-studio',
    icon: <FaWandMagicSparkles />,
    label: resources.sidebar.aiStudio,
    badge: { text: 'Soon', colorPalette: 'purple', variant: 'subtle' },
    action: 'aiStudio',
  },
];
