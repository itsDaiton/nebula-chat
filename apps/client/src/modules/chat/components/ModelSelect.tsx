import { ChevronDownIcon, StarIcon } from 'lucide-react';
import { ModelOptionRow } from '@/modules/chat/components/ModelOptionRow';
import { useFavoriteModelsStore } from '@/modules/chat/stores/useFavoriteModelsStore';
import { useModelPickerStore } from '@/modules/chat/stores/useModelPickerStore';
import { useModelCatalog } from '@/modules/chat/hooks/useModelCatalog';
import type { ModelOption, ModelSelectProps } from '@/modules/chat/types/types';
import { resources } from '@/resources';
import { ProviderLogo, providerNames } from '@/shared/components/ProviderLogo';
import { Button } from '@/shared/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/shared/components/ui/command';
import { Kbd } from '@/shared/components/ui/kbd';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import type { ModelProvider } from '@/shared/types/types';

// The mockup's key hints carry a border; Kbd's own fill matches the footer and would vanish.
const kbdClass = 'border border-border-strong bg-raised';

const groupByProvider = (options: ModelOption[]) => {
  const groups = new Map<ModelProvider, ModelOption[]>();
  for (const option of options) {
    groups.set(option.provider, [...(groups.get(option.provider) ?? []), option]);
  }
  return [...groups];
};

const groupClass =
  'p-0 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pt-2 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:text-faint';

// cmdk values must be unique and are fuzzy-matched, so the prefix is a character nobody types.
const FAVORITE_VALUE_PREFIX = '★';

const { modelPicker: text } = resources.chat;

export const ModelSelect = ({ selectedModel, onModelChange }: ModelSelectProps) => {
  const { isOpen, search, setOpen, setSearch } = useModelPickerStore();
  const { options, isPending, isError, refetch } = useModelCatalog();
  const current = options.find((option) => option.value === selectedModel);
  const { favorites, toggleFavorite } = useFavoriteModelsStore();
  // A stored id the catalog no longer serves is skipped, not pruned: it returns with the Model.
  const favoriteOptions = favorites.flatMap(
    (id) => options.find((option) => option.value === id) ?? [],
  );

  const renderRow = (model: ModelOption, valuePrefix = '') => (
    <ModelOptionRow
      key={`${valuePrefix}${model.value}`}
      model={model}
      valuePrefix={valuePrefix}
      isSelected={model.value === selectedModel}
      isFavorite={favorites.includes(model.value)}
      onSelect={(modelId) => {
        onModelChange(modelId);
        setOpen(false);
      }}
      onToggleFavorite={toggleFavorite}
    />
  );

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="group h-7 gap-1.5 rounded-full px-2.5 text-[12.5px] text-foreground-secondary aria-expanded:bg-hover aria-expanded:text-foreground"
          />
        }
      >
        {current && <ProviderLogo provider={current.provider} className="size-3.5" />}
        {current?.label ?? selectedModel}
        <ChevronDownIcon className="size-3.5 transition-transform group-aria-expanded:rotate-180" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-95 max-w-[calc(100vw-2rem)]"
      >
        {options.length === 0 && isPending && (
          <p className="px-3.5 py-4 text-[12.5px] text-faint">{text.loading}</p>
        )}
        {options.length === 0 && isError && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-3 text-[12.5px] text-faint">
            <p>{text.error}</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => void refetch()}>
              {text.retry}
            </Button>
          </div>
        )}
        {options.length > 0 && (
          <Command defaultValue={selectedModel} className="p-0">
            <CommandInput
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder={text.search}
            />
            <CommandList className="px-1.5 pt-1 pb-1.5">
              <CommandEmpty className="py-4 text-[12.5px] text-faint">
                {text.empty(search)}
              </CommandEmpty>
              {favoriteOptions.length > 0 && (
                <CommandGroup
                  className={groupClass}
                  heading={
                    <span className="flex items-center gap-1.5">
                      <StarIcon aria-hidden="true" className="size-3" />
                      {text.favorites}
                    </span>
                  }
                >
                  {favoriteOptions.map((model) => renderRow(model, FAVORITE_VALUE_PREFIX))}
                </CommandGroup>
              )}
              {groupByProvider(options).map(([provider, models]) => (
                <CommandGroup
                  key={provider}
                  className={groupClass}
                  heading={
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true">
                        <ProviderLogo provider={provider} className="size-3" />
                      </span>
                      {providerNames[provider]}
                    </span>
                  }
                >
                  {models.map((model) => renderRow(model))}
                </CommandGroup>
              ))}
            </CommandList>
            <div className="flex items-center gap-4 border-t border-border bg-raised px-3.5 py-2 text-[11.5px] text-faint">
              <span className="inline-flex items-center gap-1.5">
                <Kbd className={kbdClass}>↑</Kbd>
                <Kbd className={kbdClass}>↓</Kbd>
                {text.move}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd className={kbdClass}>↵</Kbd>
                {text.select}
              </span>
              <span className="ml-auto">{text.contextSize}</span>
            </div>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
};
