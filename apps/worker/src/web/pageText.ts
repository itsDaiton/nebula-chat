import { convert } from 'html-to-text';
import { header } from '@worker/web/httpTransport';
import type { HttpResponse } from '@worker/web/httpTransport';
import { WebToolError } from '@worker/web/webToolError';

// The cap is checked as each chunk arrives, so an oversized body is never held whole.
const readCapped = async (response: HttpResponse, maxBytes: number): Promise<Uint8Array[]> => {
  const declared = Number(header(response, 'content-length'));
  const tooLarge = new WebToolError('too-large', `The page is larger than ${maxBytes} bytes.`);
  if (declared > maxBytes) {
    response.discard();
    throw tooLarge;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.byteLength;
    if (total > maxBytes) {
      response.discard();
      throw tooLarge;
    }
    chunks.push(chunk);
  }
  return chunks;
};

const decode = (chunks: Uint8Array[], contentType: string): string => {
  const charset = /charset=([^;]+)/i.exec(contentType)?.[1]?.trim() ?? 'utf-8';
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset);
  } catch {
    decoder = new TextDecoder();
  }
  return decoder.decode(Buffer.concat(chunks));
};

const toText = (body: string, contentType: string): string => {
  if (!/html/i.test(contentType)) return body;
  return convert(body, {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'noscript', format: 'skip' },
    ],
  });
};

/** A successful response's body as readable text, refusing what is compressed, not text, or past `maxBytes`. */
export const readPageText = async (response: HttpResponse, maxBytes: number): Promise<string> => {
  const encoding = header(response, 'content-encoding') ?? 'identity';
  if (encoding !== 'identity') {
    response.discard();
    throw new WebToolError('unsupported-content', `Cannot read a ${encoding}-encoded page.`);
  }
  const contentType = header(response, 'content-type') ?? 'text/plain';
  if (!/^text\/|html|xml/i.test(contentType)) {
    response.discard();
    throw new WebToolError('unsupported-content', `Cannot read ${contentType} as text.`);
  }
  return toText(decode(await readCapped(response, maxBytes), contentType), contentType).trim();
};

export const cutToBudget = (text: string, maxChars: number): string =>
  text.length > maxChars
    ? `${text.slice(0, maxChars)}\n\n[Truncated: the page is longer than ${maxChars} characters.]`
    : text;
