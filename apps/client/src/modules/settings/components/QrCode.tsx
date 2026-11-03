import { encode } from 'uqr';

/** The text as a QR code, drawn from its module matrix, in black on white so any scanner reads it in both themes. */
export const QrCode = ({ value, label }: { value: string; label: string }) => {
  const { data, size } = encode(value, { border: 2 });
  const path = data
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : '')))
    .join('');

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className="size-44 shrink-0 rounded-lg bg-white"
    >
      <path d={path} fill="#000" />
    </svg>
  );
};
