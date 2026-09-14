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

  // Only an all-digits value is a hop count. Number.parseInt would stop at the
  // first non-digit and read '10.0.0.0/8' as 10 hops, silently trusting more of
  // the X-Forwarded-For chain than the operator configured — which would let a
  // client spoof its rate-limit key by prepending entries to the header.
  if (/^\d+$/.test(trustProxy)) {
    const proxyHops = Number.parseInt(trustProxy, 10);
    if (proxyHops > 0) {
      return trustHops(proxyHops);
    }
  }

  // Anything else is an address expression for @fastify/proxy-addr: a CIDR, an
  // IP, a comma-separated list, or a predicate name like 'loopback'.
  return trustProxy;
};
