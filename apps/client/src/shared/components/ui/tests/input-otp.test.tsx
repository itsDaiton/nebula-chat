import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { describe, expect, it } from 'vitest';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/shared/components/ui/input-otp';
import { renderWithProviders } from '@/test/render';

const Code = () => (
  <InputOTP
    aria-label="Code"
    maxLength={4}
    pattern={REGEXP_ONLY_DIGITS}
    pasteTransformer={(text) => text.replaceAll(/\D/g, '')}
  >
    <InputOTPGroup>
      <InputOTPSlot index={0} />
      <InputOTPSlot index={1} />
    </InputOTPGroup>
    <InputOTPSeparator />
    <InputOTPGroup>
      <InputOTPSlot index={2} />
      <InputOTPSlot index={3} />
    </InputOTPGroup>
  </InputOTP>
);

describe('InputOTP', () => {
  it('shows each typed digit in its own slot', async () => {
    renderWithProviders(<Code />);

    await userEvent.type(screen.getByLabelText('Code'), '4821');

    expect(screen.getByLabelText('Code')).toHaveValue('4821');
    const slots = document.querySelectorAll('[data-slot="input-otp-slot"]');
    expect([...slots].map((slot) => slot.textContent)).toEqual(['4', '8', '2', '1']);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('ignores anything but digits', async () => {
    renderWithProviders(<Code />);

    await userEvent.type(screen.getByLabelText('Code'), 'a4b2');

    expect(screen.getByLabelText('Code')).toHaveValue('42');
  });

  it('cleans a pasted code of its spaces', async () => {
    renderWithProviders(<Code />);

    await userEvent.click(screen.getByLabelText('Code'));
    await userEvent.paste('48 21');

    expect(screen.getByLabelText('Code')).toHaveValue('4821');
  });
});
