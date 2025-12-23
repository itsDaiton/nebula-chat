import type { ButtonProps } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface LayoutProps {
  children: ReactNode;
}

export interface SidePanelProps {
  children?: ReactNode;
}

export interface NebulaButtonProps extends ButtonProps {}

export interface NebulaMenuItemProps {
  id: number;
  value: string;
  label: string;
  onClick?: () => void;
}
