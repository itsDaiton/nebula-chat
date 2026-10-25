import type { FastifyReply, FastifyRequest } from 'fastify';
import { modelService } from '@server/modules/models/models.service';

// The catalog only changes with a deploy, so an hour of staleness is harmless.
const CATALOG_CACHE_CONTROL = 'public, max-age=3600';

export const modelController = {
  list(_req: FastifyRequest, reply: FastifyReply) {
    void reply.header('Cache-Control', CATALOG_CACHE_CONTROL);
    return modelService.listModels();
  },
};
