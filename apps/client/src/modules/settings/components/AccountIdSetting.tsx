import { Clipboard, Code, HStack, IconButton } from '@chakra-ui/react';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import type { AccountIdSettingProps } from '@/modules/settings/types/types';
import { resources } from '@/resources';

const { accountId } = resources.settings.account;

export const AccountIdSetting = ({ id }: AccountIdSettingProps) => (
  <SettingsRow label={accountId.label} description={accountId.description}>
    <HStack gap={1}>
      <Code size="md">{id}</Code>
      <Clipboard.Root value={id}>
        <Clipboard.Trigger asChild>
          <IconButton aria-label={accountId.copy} variant="ghost" size="xs">
            <Clipboard.Indicator />
          </IconButton>
        </Clipboard.Trigger>
      </Clipboard.Root>
    </HStack>
  </SettingsRow>
);
