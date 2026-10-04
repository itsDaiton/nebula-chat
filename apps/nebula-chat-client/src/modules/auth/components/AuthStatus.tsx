import { Heading, Stack } from '@chakra-ui/react';
import { AuthFormAlert } from '@/modules/auth/components/AuthFormAlert';
import type { AuthStatusProps } from '@/modules/auth/types/types';

/** A titled outcome in place of a form, with any follow-up actions beneath it. */
export const AuthStatus = ({ title, status, message, children }: AuthStatusProps) => (
  <Stack gap={4}>
    <Heading as="h1" size="xl">
      {title}
    </Heading>
    <AuthFormAlert status={status} message={message} />
    {children}
  </Stack>
);
