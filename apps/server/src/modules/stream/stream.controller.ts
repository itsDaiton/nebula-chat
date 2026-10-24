import type { FastifyReply, FastifyRequest } from 'fastify';
import { setSseHeaders } from '@server/config/headers.config';
import type { StreamParams } from '@server/modules/stream/stream.types';
import { streamService } from '@server/modules/stream/stream.service';
import { getSessionData } from '@server/plugins/authGate.plugin';

export const streamController = {
  async relay(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { streamId } = req.params as StreamParams;
    const { user } = getSessionData(req);
    // Before hijacking, so a 404 still goes through the error handler as the JSON envelope.
    await streamService.assertOwner(streamId, user.id);

    reply.hijack();
    const raw = reply.raw;
    setSseHeaders(reply);
    raw.flushHeaders?.();

    const disconnected = new AbortController();
    raw.on('close', () => disconnected.abort());

    await streamService.relay(streamId, (chunk) => raw.write(chunk), disconnected.signal, req.log);
    raw.end();
  },
};
