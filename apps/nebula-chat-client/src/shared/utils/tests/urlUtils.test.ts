import { describe, expect, it } from 'vitest';
import { isSafeUrl } from '@/shared/utils/urlUtils';

describe('isSafeUrl', () => {
  it.each([
    'http://example.com',
    'https://example.com/path?q=1',
    'mailto:a@b.com',
    'tel:+123',
    'ftp://files.example.com',
  ])('allows %s', (url) => {
    expect(isSafeUrl(url)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ])('blocks %s', (url) => {
    // These are the protocols that turn a rendered markdown link into script
    // execution, so the allow-list must reject them.
    expect(isSafeUrl(url)).toBe(false);
  });

  it('allows root-relative links', () => {
    expect(isSafeUrl('/conversations/123')).toBe(true);
  });

  it('allows in-page anchors', () => {
    expect(isSafeUrl('#section')).toBe(true);
  });

  it('rejects undefined and empty input', () => {
    expect(isSafeUrl(undefined)).toBe(false);
    expect(isSafeUrl('')).toBe(false);
  });

  it('rejects a bare string that is not a URL', () => {
    expect(isSafeUrl('not a url')).toBe(false);
  });

  it('ignores surrounding whitespace when deciding', () => {
    expect(isSafeUrl('   https://example.com  ')).toBe(true);
    expect(isSafeUrl('  javascript:alert(1) ')).toBe(false);
  });

  it('is case-insensitive about the protocol, as the URL parser normalises it', () => {
    expect(isSafeUrl('HTTPS://example.com')).toBe(true);
    expect(isSafeUrl('JavaScript:alert(1)')).toBe(false);
  });
});
