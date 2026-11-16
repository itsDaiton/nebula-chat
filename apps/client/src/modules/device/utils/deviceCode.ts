/** A user code as the CLI prints it: `wdjbmjht` and `WDJB-MJHT` both read `WDJB-MJHT`. */
export const formatUserCode = (code: string) => {
  const plain = code.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return plain.length === 8 ? `${plain.slice(0, 4)}-${plain.slice(4)}` : plain;
};

/** Seconds as `m:ss`. */
export const formatCountdown = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
