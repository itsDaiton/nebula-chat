import { useState, type FormEvent } from 'react';
import type { PasswordPromptProps } from '@/modules/settings/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

const { twoFactor } = resources.settings.security;

/** Asks for the password the two-factor actions require, with the failure shown beneath. */
export const PasswordPrompt = ({
  prompt,
  submitLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: PasswordPromptProps) => {
  const [password, setPassword] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (password) onSubmit(password);
  };

  return (
    <form onSubmit={submit} className="flex max-w-sm flex-col gap-2">
      <label htmlFor="two-factor-password" className="text-[13px] text-muted-foreground">
        {prompt}
      </label>
      <Input
        id="two-factor-password"
        type="password"
        autoComplete="current-password"
        value={password}
        aria-invalid={Boolean(error)}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !password}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {twoFactor.cancel}
        </Button>
      </div>
    </form>
  );
};
