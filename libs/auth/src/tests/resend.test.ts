import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createResendEmailSender } from '../resend';

const { send, Resend } = vi.hoisted(() => {
  const sendEmail = vi.fn();
  return {
    send: sendEmail,
    // A real constructor, since the sender calls `new Resend(apiKey)`.
    Resend: vi.fn(function (this: { emails: { send: typeof sendEmail } }) {
      this.emails = { send: sendEmail };
    }),
  };
});

vi.mock('resend', () => ({ Resend }));

const MESSAGE = {
  to: 'ada@example.com',
  subject: 'Verify your email',
  html: '<p>Hi</p>',
  text: 'Hi',
};

beforeEach(() => {
  send.mockReset();
  Resend.mockClear();
});

describe('createResendEmailSender', () => {
  it('authenticates the Resend client with the injected API key', () => {
    createResendEmailSender({ apiKey: 're_test_key', from: 'Nebula Chat <hello@example.com>' });

    expect(Resend).toHaveBeenCalledWith('re_test_key');
  });

  it('sends the message from the injected from-address', async () => {
    send.mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const sendEmail = createResendEmailSender({
      apiKey: 're_test_key',
      from: 'Nebula Chat <hello@example.com>',
    });

    await sendEmail(MESSAGE);

    expect(send).toHaveBeenCalledWith({ from: 'Nebula Chat <hello@example.com>', ...MESSAGE });
  });

  it('rejects when Resend refuses the email, so better-auth logs the failure', async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Invalid `to` field.', statusCode: 422 },
    });
    const sendEmail = createResendEmailSender({ apiKey: 're_test_key', from: 'a@example.com' });

    await expect(sendEmail(MESSAGE)).rejects.toThrow('Invalid `to` field.');
  });
});
