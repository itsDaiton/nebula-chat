import type { FastifyReply, FastifyRequest } from 'fastify';
import { setSseHeaders } from '@backend/config/headers.config';
import type {
  ReplyStreamHeaders,
  ReplyStreamQuery,
  StreamParams,
} from '@backend/modules/stream/stream.types';
import { streamService } from '@backend/modules/stream/stream.service';
import { getSessionData } from '@backend/plugins/authGate.plugin';

export const streamController = {
  async relay(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { streamId } = req.params as StreamParams;
    const { lastEventId } = req.query as ReplyStreamQuery;
    // An EventSource resends the last id it saw as a header; a hand-rolled reconnect uses the query.
    const afterId = (req.headers as ReplyStreamHeaders)['last-event-id'] ?? lastEventId ?? '0';
    const { user } = getSessionData(req);
    // Before hijacking, so a 404 still goes through the error handler as the JSON envelope.
    await streamService.assertReadable(streamId, user.id);

    reply.hijack();
    const raw = reply.raw;
    setSseHeaders(reply);
    raw.flushHeaders?.();

    const disconnected = new AbortController();
    raw.on('close', () => disconnected.abort());

    await streamService.relay(
      streamId,
      afterId,
      (chunk) => raw.write(chunk),
      disconnected.signal,
      req.log,
    );
    raw.end();
  },

  async cancel(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { streamId } = req.params as StreamParams;
    const { user } = getSessionData(req);
    await streamService.cancel(streamId, user.id, req.log);
    return reply.status(204).send();
  },
};
