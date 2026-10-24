import fp from 'fastify-plugin';
import { db, closeDb } from '@server/db';

export default fp(async (app) => {
  app.decorate('db', db);
  app.addHook('onClose', closeDb);
});
