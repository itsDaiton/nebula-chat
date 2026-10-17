// The cap is configurable, so the warning scales with it: 30% left, but never below one message.
const LOW_ALLOWANCE_SHARE = 0.3;

export const isMessageAllowanceLow = (remaining: number, limit: number) =>
  remaining <= Math.max(1, Math.floor(limit * LOW_ALLOWANCE_SHARE));
