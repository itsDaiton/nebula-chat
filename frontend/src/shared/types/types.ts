import type { ButtonProps } from '@chakra-ui/react';
import type { ReactElement, ReactNode } from 'react';
import type { BadgeActionButton } from '../components/navigation/BadgeActionButton';

export interface LayoutProps {
  children: ReactNode;
}

export interface SidePanelProps {
  children?: ReactNode;
}

export interface HeaderProps {
  onMenuClick?: () => void;
}

export interface NebulaButtonProps extends ButtonProps {}

export interface NebulaMenuItemProps {
  id: number;
  value: string;
  label: string;
  onClick?: () => void;
}

export interface NavigationAction {
  id: string;
  icon: ReactElement;
  label: string;
  badge?: React.ComponentProps<typeof BadgeActionButton>['badge'];
  action: 'newChat' | 'search' | 'files' | 'aiStudio';
}

export interface BadgeActionButtonProps {
  icon: ReactElement;
  label: string;
  onClick: () => void;
  badge?: {
    text: string;
    colorPalette?: string;
    variant?: 'solid' | 'subtle' | 'outline' | 'surface' | 'plain';
  };
}
