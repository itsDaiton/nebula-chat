# M-8 — Real-time (SSE + WebSockets)

## Ticket metadata

| Field          | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| **ID**         | M-8                                                                 |
| **Scope**      | `apps/server` only                                                  |
| **Depends on** | M-1 (Fastify)                                                       |
| **Blocks**     | Nothing                                                             |
| **Standalone** | Partial — SSE and WebSocket infrastructure can be added without M-7 |

## Objective

Add Server-Sent Events for LLM token streaming and WebSockets for presence/notifications. SSE is preferred over WebSockets for LLM streaming because it works reliably through Render's reverse proxy.

## Acceptance criteria

- [ ] `GET /api/chat/stream?message=...` streams LLM tokens as SSE events
- [ ] SSE stream ends with a `[DONE]` event
- [ ] `GET /ws` accepts WebSocket connections
- [ ] WebSocket handles `ping` → `pong`
- [ ] WebSocket can receive job completion notifications from M-7 workers

## Packages to add to `apps/server/package.json`

```json
{
  "dependencies": {
    "@fastify/websocket": "^11.0.0"
  }
}
```

## Implementation

### SSE route for LLM streaming

```ts
// apps/server/src/modules/chat/chat.routes.ts (add to existing plugin)
app.get('/stream', {
  onRequest: [app.authenticate],
  handler: async (req, reply) => {
    const { message, conversationId } = req.query as {
      message: string;
      conversationId?: string;
    };

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering on Render

    const chain = buildChatChain({
      apiKey: env.OPENAI_API_KEY,
      streaming: true,
    });

    try {
      const stream = await chain.stream({ history: [], input: message });

      for await (const chunk of stream) {
        reply.raw.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
      }

      reply.raw.write('data: [DONE]\n\n');
    } catch (err) {
      reply.raw.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    } finally {
      reply.raw.end();
    }
  },
});
```

### WebSocket plugin

```ts
// apps/server/src/plugins/ws.plugin.ts
import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';

// In-memory connection store (use Redis pub/sub for multi-instance)
const connections = new Map<string, Set<WebSocket>>();

export default fp(async (app) => {
  await app.register(websocket);

  app.get('/ws', { websocket: true }, (socket, req) => {
    const userId = (req as any).user?.id ?? 'anonymous';

    if (!connections.has(userId)) connections.set(userId, new Set());
    connections.get(userId)!.add(socket as any);

    socket.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // ignore malformed messages
      }
    });

    socket.on('close', () => {
      connections.get(userId)?.delete(socket as any);
    });
  });

  // Expose broadcast helper for workers
  app.decorate('broadcast', (userId: string, payload: unknown) => {
    const sockets = connections.get(userId);
    if (!sockets) return;
    const message = JSON.stringify(payload);
    for (const socket of sockets) {
      (socket as any).send(message);
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    broadcast: (userId: string, payload: unknown) => void;
  }
}
```

Register in `server.ts`:

```ts
await app.register(import('./plugins/ws.plugin'));
```

---

---
