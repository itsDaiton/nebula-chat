/**
 * Maps TRUST_PROXY to a safe Express trust proxy value that remains compatible
 * with express-rate-limit:
 * - unset / "0" / "false" => false
 * - "true" => 1
 * - positive integer string => that hop count
 * - all other strings => pass through to Express (subnet/IP list support)
 */
export const resolveTrustProxy = (): boolean | number | string => {
  const trustProxy = process.env.TRUST_PROXY?.trim();
  if (!trustProxy || trustProxy === '0' || trustProxy.toLowerCase() === 'false') {
    return false;
  }

  if (trustProxy.toLowerCase() === 'true') {
    return 1;
  }

  const proxyHops = Number.parseInt(trustProxy, 10);
  if (!Number.isNaN(proxyHops) && proxyHops > 0) {
    return proxyHops;
  }

  return trustProxy;
};
