import type { FastifyServerOptions } from 'fastify';
import { env } from '@backend/env';

type TrustProxy = NonNullable<FastifyServerOptions['trustProxy']>;

/**
 * Trust the first `hops` proxies in the X-Forwarded-For chain.
 *
 * Fastify used to accept a hop count directly, but @fastify/proxy-addr only
 * understands addresses and predicates, so the count is expressed as the
 * predicate proxy-addr used to compile it into.
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
