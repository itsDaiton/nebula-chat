import type { NavigationAction } from '@/shared/types/types';
import { FiEdit, FiSearch } from 'react-icons/fi';
import { FaWandMagicSparkles } from 'react-icons/fa6';
import { IoDocumentOutline } from 'react-icons/io5';

export const navigationActions: NavigationAction[] = [
  {
    id: 'new-chat',
    icon: <FiEdit />,
    label: 'New Chat',
    action: 'newChat',
  },
  {
    id: 'search',
    icon: <FiSearch />,
    label: 'Search chats',
    action: 'search',
  },
  {
    id: 'files',
    icon: <IoDocumentOutline />,
    label: 'Files',
    badge: { text: 'Soon', colorPalette: 'purple', variant: 'subtle' },
    action: 'files',
  },
  {
    id: 'ai-studio',
    icon: <FaWandMagicSparkles />,
    label: 'AI Studio',
    badge: { text: 'Soon', colorPalette: 'purple', variant: 'subtle' },
    action: 'aiStudio',
  },
];
