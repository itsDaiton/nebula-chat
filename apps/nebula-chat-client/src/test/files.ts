/** A picked file MSW can receive: Node's own Blob, as vitest can't bridge this jsdom's Blob to fetch. */
export const aSendableFile = async (name: string, type: string, size: number): Promise<File> => {
  const blob = await new Response(new Uint8Array(size), {
    headers: { 'content-type': type },
  }).blob();
  return Object.assign(blob, { name, lastModified: 0, webkitRelativePath: '' }) as File;
};
