import type { ReactNode } from 'react';

export const ChatContainerBox = ({ children }: { children: ReactNode }) => (
  <div className="relative flex h-full w-full flex-col overflow-hidden">{children}</div>
);
