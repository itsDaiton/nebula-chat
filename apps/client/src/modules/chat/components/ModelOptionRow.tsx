import { StarIcon } from 'lucide-react';
import { formatContextWindow } from '@/modules/chat/utils/formatContextWindow';
import type { ModelOptionRowProps } from '@/modules/chat/types/types';
import { resources } from '@/resources';
import { ProviderLogo, providerNames } from '@/shared/components/ProviderLogo';
import { CommandItem } from '@/shared/components/ui/command';
import { IconButton } from '@/shared/components/ui/icon-button';
import { cn } from '@/shared/utils/cn';

const { modelPicker: text } = resources.chat;

export const ModelOptionRow = ({
  model,
  valuePrefix,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: ModelOptionRowProps) => (
  <CommandItem
    value={`${valuePrefix}${model.value}`}
    keywords={[model.label, providerNames[model.provider]]}
    data-checked={isSelected}
    onSelect={() => onSelect(model.value)}
    className="h-[42px] gap-2.5 rounded-lg px-2.5"
  >
    <span aria-hidden="true">
      <ProviderLogo provider={model.provider} />
    </span>
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-[13px] leading-tight">{model.label}</span>
      <span className="truncate font-mono text-[10.5px] text-faint">{model.value}</span>
    </span>
    <IconButton
      type="button"
      variant="ghost"
      size="icon-xs"
      // Mouse only: a focused star would hand Enter to cmdk, which picks the Model instead.
      tabIndex={-1}
      label={isFavorite ? text.removeFavorite(model.label) : text.addFavorite(model.label)}
      onClick={(event) => {
        event.stopPropagation();
        onToggleFavorite(model.value);
      }}
      className={cn(
        'text-muted-foreground opacity-0 group-hover/command-item:opacity-100 group-data-[selected=true]/command-item:opacity-100 pointer-coarse:opacity-100',
        isFavorite && 'text-warning opacity-100 hover:text-warning',
      )}
    >
      <StarIcon className={cn('size-3', isFavorite && 'fill-current')} />
    </IconButton>
    <span className="font-mono text-[11px] text-muted-foreground">
      {formatContextWindow(model.contextWindow)}
    </span>
  </CommandItem>
);
