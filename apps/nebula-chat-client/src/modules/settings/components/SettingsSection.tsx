import { Heading, Stack } from '@chakra-ui/react';
import type { SettingsSectionProps } from '@/modules/settings/types/types';

export const SettingsSection = ({ title, hidden, children }: SettingsSectionProps) => (
  <Stack as="section" gap={0} hidden={hidden}>
    <Heading as="h2" size={{ base: 'md', md: 'lg' }} mb={2}>
      {title}
    </Heading>
    {children}
  </Stack>
);
