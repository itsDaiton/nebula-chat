import type { FastifyServerOptions } from 'fastify';
import { env } from '@server/env';

type TrustProxy = NonNullable<FastifyServerOptions['trustProxy']>;

/**
 * Trusts the first `hops` proxies in X-Forwarded-For, as the predicate @fastify/proxy-addr takes in place of Fastify's old hop count.
 */
const trustHops =
  (hops: number): TrustProxy =>
  (_address: string, hop: number) =>
    hop < hops;

export const resolveTrustProxy = (): TrustProxy => {
  const trustProxy = env.TRUST_PROXY?.trim();
  if (!trustProxy || trustProxy === '0' || trustProxy.toLowerCase() === 'false') {
    return false;
  }

  if (trustProxy.toLowerCase() === 'true') {
    return trustHops(1);
  }

  const proxyHops = Number.parseInt(trustProxy, 10);
  if (!Number.isNaN(proxyHops) && proxyHops > 0) {
    return trustHops(proxyHops);
  }

  return trustProxy;
};
