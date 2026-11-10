/** A phrase from `phrases` other than `previous`; `random` is injectable for tests. */
export const pickWaitingPhrase = (
  phrases: readonly string[],
  previous?: string,
  random = Math.random,
): string => {
  const options = phrases.filter((phrase) => phrase !== previous);
  return options[Math.floor(random() * options.length)];
};
