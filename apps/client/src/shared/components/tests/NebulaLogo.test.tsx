import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NebulaLogo } from '@/shared/components/NebulaLogo';
import { resources } from '@/resources';
import { renderInRouter } from '@/test/renderRoute';

describe('NebulaLogo', () => {
  it('links the brand back to the chat root, named even when the text is hidden', async () => {
    await renderInRouter(<NebulaLogo />);

    expect(screen.getByRole('link', { name: resources.chat.appName })).toHaveAttribute('href', '/');
  });
});
