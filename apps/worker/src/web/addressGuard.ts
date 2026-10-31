import { BlockList, isIP } from 'node:net';
import type { DnsLookup, ResolvedAddress } from '@worker/web/httpTransport';
import { WebToolError } from '@worker/web/webToolError';

// Everything that is not the public internet. BlockList checks an IPv4-mapped IPv6 address against
// the IPv4 rules, so `::ffff:0:0/96` must not be listed: it would match every IPv4 address.
const BLOCKED = new BlockList();
for (const [prefix, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
] as const) {
  BLOCKED.addSubnet(prefix, bits, 'ipv4');
}
for (const [prefix, bits] of [
  ['::', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  BLOCKED.addSubnet(prefix, bits, 'ipv6');
}

const isBlocked = (address: string): boolean => {
  const family = isIP(address);
  return family === 0 || BLOCKED.check(address, family === 4 ? 'ipv4' : 'ipv6');
};

const blocked = (url: string): WebToolError =>
  new WebToolError('blocked-url', `Refused: ${url} is not a public HTTP(S) address.`);

/** The address to connect to: every address the hostname resolves to must be public, and the first is used. */
export const checkedAddress = async (url: URL, lookup: DnsLookup): Promise<ResolvedAddress> => {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw blocked(url.href);
  // Only web ports, so a URL cannot speak HTTP at a mail or database server.
  if (url.port !== '' && url.port !== '80' && url.port !== '443') throw blocked(url.href);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const literal = isIP(host);
  let addresses: ResolvedAddress[];
  if (literal) {
    addresses = [{ address: host, family: literal as 4 | 6 }];
  } else {
    addresses = await lookup(host).catch(() => {
      throw new WebToolError('invalid-url', `Could not resolve ${host}.`);
    });
  }
  if (addresses.length === 0 || addresses.some((a) => isBlocked(a.address))) {
    throw blocked(url.href);
  }
  return addresses[0]!;
};
