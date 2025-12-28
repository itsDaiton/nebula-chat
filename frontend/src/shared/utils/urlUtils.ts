export const isSafeUrl = (url: string | undefined): boolean => {
  if (!url) return false;

  const trimmedUrl = url.trim().toLowerCase();
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:', 'ftp:', 'ftps:'];
  const hasSafeProtocol = safeProtocols.some((protocol) => trimmedUrl.startsWith(protocol));
  const isRelativeUrl = trimmedUrl.startsWith('/') || trimmedUrl.startsWith('#');
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
  const hasDangerousProtocol = dangerousProtocols.some((protocol) =>
    trimmedUrl.startsWith(protocol),
  );

  return (hasSafeProtocol || isRelativeUrl) && !hasDangerousProtocol;
};
