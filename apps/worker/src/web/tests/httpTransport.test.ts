import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { nodeRequest } from '@worker/web/httpTransport';

// The real transport, against a server in this process: the hostname never reaches DNS.
describe('nodeRequest', () => {
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(`host ${req.headers.host}`);
  });
  let port = 0;

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('connects to the given address while sending the URL’s own hostname', async () => {
    const response = await nodeRequest(
      new URL(`http://not-a-real-host.invalid:${port}/page`),
      { address: '127.0.0.1', family: 4 },
      AbortSignal.timeout(1_000),
    );

    let body = '';
    for await (const chunk of response.body) body += Buffer.from(chunk).toString();
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('text/plain');
    expect(body).toBe(`host not-a-real-host.invalid:${port}`);
  });
});
