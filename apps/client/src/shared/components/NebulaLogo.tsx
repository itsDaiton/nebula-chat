import { resources } from '@/resources';
import type { NebulaLogoProps } from '@/shared/types/types';
import { cn } from '@/shared/utils/cn';

/** Tabler's `galaxy` icon, inlined: Lucide has no galaxy. */
export const NebulaLogo = ({ className }: NebulaLogoProps) => (
  <span className={cn('flex items-center gap-2 pr-1.5', className)}>
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[22px] shrink-0"
      aria-hidden="true"
    >
      <path d="M12 3c-1.333 1 -2 2.5 -2 4.5c0 3 2 4.5 2 4.5s2 1.5 2 4.5c0 2 -.667 3.5 -2 4.5" />
      <path d="M19.794 16.5c-.2 -1.655 -1.165 -2.982 -2.897 -3.982c-2.597 -1.5 -4.897 -.518 -4.897 -.518s-2.299 .982 -4.897 -.518c-1.732 -1 -2.698 -2.327 -2.897 -3.982" />
      <path d="M19.794 7.5c-1.532 -.655 -3.165 -.482 -4.897 .518c-2.597 1.5 -2.897 3.982 -2.897 3.982s-.299 2.482 -2.897 3.982c-1.732 1 -3.365 1.173 -4.897 .518" />
    </svg>
    <span className="hidden text-sm font-semibold tracking-[-0.01em] sm:inline">
      {resources.chat.appName}
    </span>
  </span>
);
