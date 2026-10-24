import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { readReplyStream } from '@/libs/api/generated/streams/streams';
import { streamClient } from '@/libs/api/streamClient';
import { API_ROUTE } from '@/test/api';
import { server } from '@/test/msw';

const STREAM_ID = '44444444-4444-4444-8444-444444444444';

const asResponse = (value: unknown) => value as Response;

describe('streamClient', () => {
  it('opens the stream with the session cookie and no request body', async () => {
    let received: { contentType: string | null; body: string } | undefined;
    // msw 3 no longer exposes `credentials` on the intercepted request, so read it off `fetch`.
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    server.use(
      http.get(API_ROUTE.replyStream, async ({ request }) => {
        received = { contentType: request.headers.get('Content-Type'), body: await request.text() };
        return new HttpResponse('ok');
      }),
    );

    await readReplyStream(STREAM_ID);

    // No JSON content type on a GET, so the browser sends it without a CORS preflight.
    expect(received).toEqual({ contentType: null, body: '' });
    expect(fetchSpy.mock.calls[0]?.[1]?.credentials).toBe('include');
  });

  it('sends its query parameters, so a reconnect can say where it got to', async () => {
    let lastEventId: string | null | undefined;
    server.use(
      http.get(API_ROUTE.replyStream, ({ request }) => {
        lastEventId = new URL(request.url).searchParams.get('lastEventId');
        return new HttpResponse('ok');
      }),
    );

    await readReplyStream(STREAM_ID, { lastEventId: '1700000000000-3' });

    expect(lastEventId).toBe('1700000000000-3');
  });

  it('sends a JSON body when the request has one', async () => {
    let received: { contentType: string | null; body: unknown } | undefined;
    server.use(
      http.post('*/api/echo', async ({ request }) => {
        received = { contentType: request.headers.get('Content-Type'), body: await request.json() };
        return new HttpResponse('ok');
      }),
    );

    await streamClient({ url: '/api/echo', method: 'POST', data: { hello: 'world' } });

    expect(received).toEqual({ contentType: 'application/json', body: { hello: 'world' } });
  });

  it('returns the Response unread so the caller can stream its body', async () => {
    server.use(http.get(API_ROUTE.replyStream, () => new HttpResponse('event: end\n\n')));

    const response = asResponse(await readReplyStream(STREAM_ID));

    expect(response.bodyUsed).toBe(false);
    await expect(response.text()).resolves.toBe('event: end\n\n');
  });

  it('hands back a non-2xx response instead of throwing', async () => {
    server.use(
      http.get(API_ROUTE.replyStream, () =>
        HttpResponse.json({ success: false, error: 'NotFound', message: 'No.' }, { status: 404 }),
      ),
    );

    const response = asResponse(await readReplyStream(STREAM_ID));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: 'NotFound' });
  });

  it('cancels the request when the abort signal fires', async () => {
    server.use(http.get(API_ROUTE.replyStream, () => new HttpResponse('ok')));
    const controller = new AbortController();
    controller.abort();

    await expect(
      readReplyStream(STREAM_ID, undefined, undefined, controller.signal),
    ).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
