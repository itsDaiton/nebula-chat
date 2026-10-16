type EnvValues = Readonly<Record<string, string | undefined>>;

const apply = (values: EnvValues): void => {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};

/** Sets each variable (`undefined` unsets it) and returns a function that puts them all back. */
export const setEnv = (values: EnvValues): (() => void) => {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  apply(values);
  return () => apply(previous);
};
