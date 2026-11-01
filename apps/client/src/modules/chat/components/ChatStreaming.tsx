import { LoaderCircleIcon } from 'lucide-react';

export const ChatStreaming = () => (
  <output className="mb-[26px] flex items-center py-1 text-muted-foreground">
    <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
  </output>
);
