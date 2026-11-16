import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Later Tailwind classes win over conflicting earlier ones, so a caller's className overrides a variant.
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
