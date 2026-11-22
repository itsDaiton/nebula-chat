import type { FastifyPluginAsync } from 'fastify';
import adminRoutes from '@server/modules/admin/admin.routes';
import adminOverviewRoutes from '@server/modules/admin/adminOverview.routes';
import adminSessionsRoutes from '@server/modules/admin/adminSessions.routes';
import adminUsersRoutes from '@server/modules/admin/adminUsers.routes';
import auditRoutes from '@server/modules/audit/audit.routes';
import logLevelRoutes from '@server/modules/logLevel/logLevel.routes';
import usageRoutes from '@server/modules/usage/usage.routes';

const INTERNAL_RATE_LIMIT = { max: 10, timeWindow: '1 minute' };
const ADMIN_RATE_LIMIT = { max: 120, timeWindow: '1 minute' };

// `/api/internal/*` and `/api/admin/*`, one rate-limit bucket per scope. An instance hook runs before the gate's route hook, so a wrong token counts too.
const privilegedRoutes: FastifyPluginAsync = async (app) => {
  await app.register(async (internal) => {
    internal.addHook('onRequest', internal.rateLimit(INTERNAL_RATE_LIMIT));
    await internal.register(logLevelRoutes, { prefix: '/api/internal/log-level' });
    await internal.register(adminRoutes, { prefix: '/api/internal/admins' });
  });
  await app.register(async (admin) => {
    admin.addHook('onRequest', admin.rateLimit(ADMIN_RATE_LIMIT));
    await admin.register(adminOverviewRoutes, { prefix: '/api/admin/overview' });
    await admin.register(usageRoutes, { prefix: '/api/admin/usage' });
    await admin.register(adminUsersRoutes, { prefix: '/api/admin/users' });
    await admin.register(adminSessionsRoutes, { prefix: '/api/admin/sessions' });
    await admin.register(auditRoutes, { prefix: '/api/admin/audit' });
  });
};

export default privilegedRoutes;
