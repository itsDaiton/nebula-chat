import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { streamChat } from '@/libs/api/generated/chat/chat';
import { API_ROUTE } from '@/test/api';
import { server } from '@/test/msw';

const body = {
  messages: [{ role: 'user' as const, content: 'hello' }],
  model: 'gpt-4o-mini',
};

const asResponse = (value: unknown) => value as Response;

describe('streamClient', () => {
  it('posts the JSON body with the session cookie', async () => {
    let received: { contentType: string | null; body: unknown };
    // msw 3 no longer exposes `credentials` on the intercepted request, so read it off `fetch`.
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    server.use(
      http.post(API_ROUTE.chatStream, async ({ request }) => {
        received = {
          contentType: request.headers.get('Content-Type'),
          body: await request.json(),
        };
        return new HttpResponse('ok');
      }),
    );

    await streamChat(body);

    expect(fetchSpy.mock.calls[0]?.[1]?.credentials).toBe('include');
    expect(received!).toEqual({ contentType: 'application/json', body });
  });

  it('returns the Response unread so the caller can stream its body', async () => {
    server.use(http.post(API_ROUTE.chatStream, () => new HttpResponse('event: end\n\n')));

    const response = asResponse(await streamChat(body));

    expect(response.bodyUsed).toBe(false);
    await expect(response.text()).resolves.toBe('event: end\n\n');
  });

  it('hands back a non-2xx response instead of throwing', async () => {
    server.use(
      http.post(API_ROUTE.chatStream, () =>
        HttpResponse.json({ success: false, error: 'Forbidden', message: 'No.' }, { status: 403 }),
      ),
    );

    const response = asResponse(await streamChat(body));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: 'Forbidden' });
  });

  it('cancels the request when the abort signal fires', async () => {
    server.use(http.post(API_ROUTE.chatStream, () => new HttpResponse('ok')));
    const controller = new AbortController();
    controller.abort();

    await expect(streamChat(body, undefined, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
