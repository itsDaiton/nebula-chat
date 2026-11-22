import helmet from '@fastify/helmet';
import fp from 'fastify-plugin';
import { env } from '@server/env';

// The better-auth Scalar page (docs only) runs an inline script and loads Scalar from jsDelivr.
const AUTH_REFERENCE_PATH = '/api/auth/reference';
const AUTH_REFERENCE_CSP =
  "default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'unsafe-inline' https:; img-src data: https:; font-src https: data:; connect-src 'self'; frame-ancestors 'none'";

/** Helmet's headers on every response; the CSP is `default-src 'none'`, relaxed only for the docs UIs. */
export default fp(
  async (app) => {
    await app.register(helmet, {
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: env.NODE_ENV === 'production',
      // The client is another origin of the same site and loads Profile images from the API.
      crossOriginResourcePolicy: { policy: 'same-site' },
    });

    if (env.API_DOCS_ENABLED) {
      app.addHook('onRequest', async (req, reply) => {
        if (req.url.split('?')[0]?.startsWith(AUTH_REFERENCE_PATH)) {
          reply.header('content-security-policy', AUTH_REFERENCE_CSP);
        }
      });
    }
  },
  { name: 'securityHeaders' },
);
