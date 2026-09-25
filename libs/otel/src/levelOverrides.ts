import type { LevelWithSilent } from 'pino';

/** Per-component levels, keyed by `nebula.component` name. */
export type LevelOverrides = Readonly<Record<string, LevelWithSilent>>;

const LEVEL_OVERRIDES = Symbol('nebula.levelOverrides');

type WithOverrides = { [LEVEL_OVERRIDES]?: LevelOverrides };

/**
 * Records the override map on the root logger. Pino builds every child with
 * `Object.create(parent)`, so the map is inherited down the whole chain —
 * Fastify's per-request `req.log`, bound children, all of them — without any
 * logger having to be told about it. `componentLogger.test.ts` pins this.
 */
export const attachLevelOverrides = (logger: object, overrides: LevelOverrides): void => {
  (logger as WithOverrides)[LEVEL_OVERRIDES] = overrides;
};

/** The override map a logger (or any ancestor) was created with, if any. */
export const levelOverridesOf = (logger: object): LevelOverrides | undefined =>
  (logger as WithOverrides)[LEVEL_OVERRIDES];
