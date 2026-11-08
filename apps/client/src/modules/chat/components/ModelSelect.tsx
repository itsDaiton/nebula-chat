import { ChevronDownIcon } from 'lucide-react';
import { useModelPickerStore } from '@/modules/chat/stores/useModelPickerStore';
import { useModelCatalog } from '@/modules/chat/hooks/useModelCatalog';
import { formatContextWindow } from '@/modules/chat/utils/formatContextWindow';
import type { ModelOption, ModelSelectProps } from '@/modules/chat/types/types';
import { resources } from '@/resources';
import { ProviderLogo, providerNames } from '@/shared/components/ProviderLogo';
import { Button } from '@/shared/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
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

const { modelPicker: text } = resources.chat;

export const ModelSelect = ({ selectedModel, onModelChange }: ModelSelectProps) => {
  const { isOpen, search, setOpen, setSearch } = useModelPickerStore();
  const { options, isPending, isError, refetch } = useModelCatalog();
  const current = options.find((option) => option.value === selectedModel);

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
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
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
              {groupByProvider(options).map(([provider, models]) => (
                <CommandGroup
                  key={provider}
                  className="p-0 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pt-2 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:text-faint"
                  heading={
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true">
                        <ProviderLogo provider={provider} className="size-3" />
                      </span>
                      {providerNames[provider]}
                    </span>
                  }
                >
                  {models.map((model) => (
                    <CommandItem
                      key={model.value}
                      value={model.value}
                      keywords={[model.label, providerNames[provider]]}
                      data-checked={model.value === selectedModel}
                      onSelect={() => {
                        onModelChange(model.value);
                        setOpen(false);
                      }}
                      className="h-[42px] gap-2.5 rounded-lg px-2.5"
                    >
                      <span aria-hidden="true">
                        <ProviderLogo provider={provider} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[13px] leading-tight">{model.label}</span>
                        <span className="truncate font-mono text-[10.5px] text-faint">
                          {model.value}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatContextWindow(model.contextWindow)}
                      </span>
                    </CommandItem>
                  ))}
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
