/** A picked file MSW can receive: bytes posing as a File, as vitest can't send this jsdom's Blobs. */
export const aSendableFile = (name: string, type: string, size: number): File =>
  Object.assign(new Uint8Array(size), { name, type, size, lastModified: 0 }) as unknown as File;
