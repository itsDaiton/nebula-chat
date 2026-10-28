import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import {
  formatContextWindow,
  getModelOption,
  modelOptions,
} from '@/modules/chat/utils/modelOptions';
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

const groupByProvider = (options: ModelOption[]) => {
  const groups = new Map<ModelProvider, ModelOption[]>();
  for (const option of options) {
    groups.set(option.provider, [...(groups.get(option.provider) ?? []), option]);
  }
  return [...groups];
};

export const ModelSelect = ({
  selectedModel,
  onModelChange,
  options = modelOptions,
}: ModelSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((option) => option.value === selectedModel);
  const current = selected ?? getModelOption(selectedModel);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-full px-2.5 text-[12.5px] text-foreground-secondary"
          />
        }
      >
        {current && <ProviderLogo provider={current.provider} className="size-3.5" />}
        {current?.label ?? selectedModel}
        <ChevronDownIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-95 max-w-[calc(100vw-2rem)]"
      >
        <Command defaultValue={selectedModel} className="p-0">
          <CommandInput
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder={resources.chat.modelPicker.search}
          />
          <CommandList className="p-1.5">
            <CommandEmpty className="py-4 text-[12.5px] text-faint">
              {resources.chat.modelPicker.empty(search)}
            </CommandEmpty>
            {groupByProvider(options).map(([provider, models]) => (
              <CommandGroup
                key={provider}
                className="p-0"
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
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              {resources.chat.modelPicker.move}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>↵</Kbd>
              {resources.chat.modelPicker.select}
            </span>
            <span className="ml-auto">{resources.chat.modelPicker.contextSize}</span>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
