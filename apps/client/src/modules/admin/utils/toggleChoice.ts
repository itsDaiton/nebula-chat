/** `value` added to or removed from `chosen`; undefined once none is left, which a URL reads as no filter. */
export const toggleChoice = <T>(chosen: T[], value: T): T[] | undefined => {
  const next = chosen.includes(value)
    ? chosen.filter((other) => other !== value)
    : [...chosen, value];
  return next.length > 0 ? next : undefined;
};
