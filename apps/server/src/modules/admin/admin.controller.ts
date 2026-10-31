import type { FastifyReply, FastifyRequest } from 'fastify';
import { adminService } from '@server/modules/admin/admin.service';
import type { AdminEmailParams, GrantAdminDTO } from '@server/modules/admin/admin.types';

export const adminController = {
  async grant(req: FastifyRequest<{ Body: GrantAdminDTO }>, reply: FastifyReply) {
    const admin = await adminService.grant(req.body.email);
    return reply.status(201).send(admin);
  },
  async revoke(req: FastifyRequest<{ Params: AdminEmailParams }>, reply: FastifyReply) {
    await adminService.revoke(req.params.email);
    return reply.status(204).send();
  },
  async list(_req: FastifyRequest, reply: FastifyReply) {
    const admins = await adminService.list();
    return reply.status(200).send(admins);
  },
};
