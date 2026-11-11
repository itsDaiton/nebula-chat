import {
  BotIcon,
  ChartColumnIcon,
  LayoutGridIcon,
  MessageSquareIcon,
  ScrollTextIcon,
  ServerIcon,
  UsersIcon,
  WorkflowIcon,
} from 'lucide-react';
import { resources } from '@/resources';
import type { AdminNavGroup } from '@/modules/admin/types/types';

const { nav } = resources.admin;

export const adminNavigation: AdminNavGroup[] = [
  {
    label: nav.insights,
    pages: [
      { id: 'overview', label: nav.overview, icon: LayoutGridIcon },
      { id: 'usage', label: nav.modelUsage, icon: ChartColumnIcon },
    ],
  },
  {
    label: nav.manage,
    pages: [
      { id: 'users', label: nav.users, icon: UsersIcon },
      { id: 'sessions', label: nav.sessions, icon: MessageSquareIcon },
      { id: 'runs', label: nav.runs, icon: WorkflowIcon },
      { id: 'agents', label: nav.agents, icon: BotIcon },
    ],
  },
  {
    label: nav.system,
    pages: [
      { id: 'operations', label: nav.operations, icon: ServerIcon },
      { id: 'audit', label: nav.audit, icon: ScrollTextIcon, to: '/admin/audit', hasDetail: true },
    ],
  },
];
