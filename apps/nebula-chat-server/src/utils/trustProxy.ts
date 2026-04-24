import { env } from '@backend/env';

export const resolveTrustProxy = (): boolean | number | string => {
  const trustProxy = env.TRUST_PROXY?.trim();
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
