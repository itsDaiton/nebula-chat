/**
 * A picked file a request can carry. Vitest's bridge from jsdom's Blob to Node's fetch reads a
 * jsdom internal this jsdom no longer has, so a jsdom File fails to send under MSW; this one is
 * Node's own Blob (from Node's `Response`), named like a File.
 */
export const aSendableFile = async (name: string, type: string, size: number): Promise<File> => {
  const blob = await new Response(new Uint8Array(size), {
    headers: { 'content-type': type },
  }).blob();
  return Object.assign(blob, { name, lastModified: 0, webkitRelativePath: '' }) as File;
};
