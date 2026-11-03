import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProviderLogo } from '@/shared/components/ProviderLogo';

describe('ProviderLogo', () => {
  it('names the provider and uses the foreground colour for OpenAI', () => {
    render(<ProviderLogo provider="openai" />);

    expect(screen.getByRole('img', { name: 'OpenAI' })).toHaveClass('text-foreground');
  });

  it('names the provider and uses the brand orange for Anthropic', () => {
    render(<ProviderLogo provider="anthropic" />);

    expect(screen.getByRole('img', { name: 'Anthropic' })).toHaveClass('text-anthropic');
  });
});
