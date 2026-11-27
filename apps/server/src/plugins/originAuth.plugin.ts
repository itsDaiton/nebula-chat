import { createHash, timingSafeEqual } from 'node:crypto';
import fp from 'fastify-plugin';
import { ForbiddenError } from '@nebula-chat/errors';
import { env } from '@server/env';

// Digests give timingSafeEqual equal lengths without leaking the secret's length.
const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

// Cloudflare adds X-Origin-Auth to every request, so one without it reached Render directly (docs/origin-access.md).
export default fp(
  (app, _options, done) => {
    const secret = env.ORIGIN_AUTH_SECRET;
    if (secret === undefined) {
      done();
      return;
    }
    const expected = digest(secret);
    app.addHook('onRequest', (req, _reply, next) => {
      // Render's health check comes from inside Render and can't send the header.
      if (req.routeOptions.url === '/health') {
        next();
        return;
      }
      const presented = req.headers['x-origin-auth'];
      if (typeof presented !== 'string' || !timingSafeEqual(digest(presented), expected)) {
        next(new ForbiddenError('Requests must come through Cloudflare'));
        return;
      }
      next();
    });
    done();
  },
  { name: 'originAuth' },
);
