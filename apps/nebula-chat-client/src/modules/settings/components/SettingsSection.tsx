import { Heading, Stack } from '@chakra-ui/react';
import type { SettingsSectionProps } from '@/modules/settings/types/types';

export const SettingsSection = ({ title, children }: SettingsSectionProps) => (
  <Stack as="section" gap={0}>
    <Heading as="h2" size="lg" mb={2}>
      {title}
    </Heading>
    {children}
  </Stack>
);
