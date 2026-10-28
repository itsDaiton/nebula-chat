/** `count` distinct items from `pool` in random order (partial Fisher-Yates); `random` is injectable for tests. */
export const pickStarters = <T>(pool: readonly T[], count = 4, random = Math.random): T[] => {
  const items = [...pool];
  const picked = Math.min(count, items.length);
  for (let i = 0; i < picked; i += 1) {
    const j = i + Math.floor(random() * (items.length - i));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, picked);
};
