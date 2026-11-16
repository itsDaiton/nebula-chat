/** The codes as a text file, one per line, offered as a download. */
export const downloadBackupCodes = (codes: string[], filename: string) => {
  const url = URL.createObjectURL(new Blob([`${codes.join('\n')}\n`], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
