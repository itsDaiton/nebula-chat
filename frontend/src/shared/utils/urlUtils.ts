const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'ftp:']);

export const isSafeUrl = (url: string | undefined): boolean => {
  if (!url) return false;

  const trimmed = url.trim();

  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;

  try {
    const { protocol } = new URL(trimmed);
    return SAFE_PROTOCOLS.has(protocol);
  } catch {
    return false;
  }
};
