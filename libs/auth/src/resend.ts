import { Resend } from 'resend';

/** A transactional email, provider-agnostic: what the auth flows hand to an `EmailSender`. */
export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** Delivers one email, rejecting when the provider refuses it. */
export type EmailSender = (message: EmailMessage) => Promise<void>;

export type CreateResendEmailSenderConfig = {
  /** `RESEND_API_KEY`, resolved by the consumer — the lib never reads `process.env`. */
  apiKey: string;
  /** `EMAIL_FROM` — a verified Resend sender, e.g. `Nebula Chat <hello@example.com>`. */
  from: string;
};

/** An `EmailSender` backed by Resend's HTTP API (ADR-0021). */
export const createResendEmailSender = ({
  apiKey,
  from,
}: CreateResendEmailSenderConfig): EmailSender => {
  const resend = new Resend(apiKey);

  return async (message) => {
    // Resend resolves with `{ error }` rather than throwing, so surface it as a rejection.
    const { error } = await resend.emails.send({ from, ...message });
    if (error) throw new Error(`Resend refused the email: ${error.message}`, { cause: error });
  };
};
