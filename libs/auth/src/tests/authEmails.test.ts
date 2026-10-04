import { describe, expect, it } from 'vitest';
import { passwordResetEmail, verificationEmail } from '../authEmails';

const URL_WITH_QUERY =
  'http://localhost:3000/api/auth/verify-email?token=abc&callbackURL=http%3A%2F%2Flocalhost%3A5173';

describe.each([
  ['verificationEmail', verificationEmail, 'Verify your email'],
  ['passwordResetEmail', passwordResetEmail, 'Reset your password'],
] as const)('%s', (_name, build, subject) => {
  const user = { email: 'ada@example.com', name: 'Ada' };

  it('is addressed to the user', () => {
    expect(build({ user, url: URL_WITH_QUERY }).to).toBe('ada@example.com');
  });

  it('names its purpose in the subject', () => {
    expect(build({ user, url: URL_WITH_QUERY }).subject).toContain(subject);
  });

  it('carries the link in both the HTML and the plain-text body', () => {
    const { html, text } = build({ user, url: URL_WITH_QUERY });

    expect(text).toContain(URL_WITH_QUERY);
    // `&` is escaped inside the href attribute, as HTML requires.
    expect(html).toContain(`href="${URL_WITH_QUERY.replaceAll('&', '&amp;')}"`);
  });

  it('escapes a user-chosen name in the HTML body', () => {
    const { html } = build({ user: { ...user, name: '<script>x</script>' }, url: URL_WITH_QUERY });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
