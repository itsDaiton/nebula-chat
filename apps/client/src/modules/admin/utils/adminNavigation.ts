import {
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
      { id: 'overview', label: nav.overview, icon: LayoutGridIcon, to: '/admin' },
      {
        id: 'usage',
        label: nav.modelUsage,
        icon: ChartColumnIcon,
        to: '/admin/usage',
        hasDetail: true,
      },
    ],
  },
  {
    label: nav.manage,
    pages: [
      { id: 'users', label: nav.users, icon: UsersIcon, to: '/admin/users', hasDetail: true },
      { id: 'sessions', label: nav.sessions, icon: MessageSquareIcon, to: '/admin/sessions' },
      {
        id: 'runs',
        label: nav.runs,
        icon: WorkflowIcon,
        to: '/admin/runs',
        hasDetail: true,
      },
    ],
  },
  {
    label: nav.system,
    pages: [
      {
        id: 'operations',
        label: nav.operations,
        icon: ServerIcon,
        to: '/admin/operations',
        hasDetail: true,
      },
      { id: 'audit', label: nav.audit, icon: ScrollTextIcon, to: '/admin/audit', hasDetail: true },
    ],
  },
];
