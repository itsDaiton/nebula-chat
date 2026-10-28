import { ChevronDownIcon } from 'lucide-react';
import { getModelLabel, modelOptions } from '@/modules/chat/utils/modelOptions';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export const ModelSelect = ({
  selectedModel,
  onModelChange,
}: {
  selectedModel: string;
  onModelChange: (model: string) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-full px-2.5 text-[12.5px] text-foreground-secondary"
        />
      }
    >
      {getModelLabel(selectedModel)}
      <ChevronDownIcon className="size-3.5" />
    </DropdownMenuTrigger>
    <DropdownMenuContent side="top" align="end" className="w-48">
      <DropdownMenuRadioGroup
        value={selectedModel}
        onValueChange={(value) => onModelChange(String(value))}
      >
        {modelOptions.map(({ label, value }) => (
          <DropdownMenuRadioItem key={value} value={value}>
            {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);
