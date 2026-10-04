import type { EmailMessage } from './resend';

/** What better-auth hands its send callbacks, narrowed to what the templates read. */
export type AuthEmailParams = {
  user: { email: string; name: string };
  url: string;
};

type AuthEmailCopy = {
  subject: string;
  intro: string;
  action: string;
  outro: string;
};

const APP_NAME = 'Nebula Chat';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildAuthEmail =
  ({ subject, intro, action, outro }: AuthEmailCopy) =>
  ({ user, url }: AuthEmailParams): EmailMessage => {
    const greeting = `Hi ${user.name},`;
    return {
      to: user.email,
      subject: `${subject} — ${APP_NAME}`,
      text: [greeting, intro, `${action}: ${url}`, outro].join('\n\n'),
      html: [
        `<p>${escapeHtml(greeting)}</p>`,
        `<p>${intro}</p>`,
        `<p><a href="${escapeHtml(url)}">${action}</a></p>`,
        `<p>${outro}</p>`,
      ].join('\n'),
    };
  };

/** Sent on sign-up and on a resend; following the link marks the email verified. */
export const verificationEmail = buildAuthEmail({
  subject: 'Verify your email',
  intro: `Confirm this is your email address to finish setting up your ${APP_NAME} account.`,
  action: 'Verify email',
  outro:
    "The link expires in one hour. If you didn't create an account, you can ignore this email.",
});

/** Sent on "forgot password"; the link opens the client's reset form. */
export const passwordResetEmail = buildAuthEmail({
  subject: 'Reset your password',
  intro: `We received a request to reset the password for your ${APP_NAME} account.`,
  action: 'Choose a new password',
  outro:
    "The link expires in one hour. If you didn't ask to reset your password, you can ignore this email.",
});
