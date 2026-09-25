import type { LogComponent } from './attributes';
import { levelOverridesOf } from './levelOverrides';

type ComponentParent<T> = {
  child: (bindings: { 'nebula.component': LogComponent }, options?: { level: string }) => T;
};

/**
 * A child logger for one subsystem: binds `nebula.component` and takes its
 * level from `createLogger`'s `levelOverrides` when the map names it, otherwise
 * inherits the level of the logger it is derived from.
 *
 * An override may sit below the root level: Pino filters per logger instance,
 * not at the destination, so a `debug` child under an `info` root still writes
 * its `debug` lines. `src/diag.ts` relies on the same property.
 *
 * Derive it from a logger with no component bound yet — a second
 * `nebula.component` binding would emit the key twice.
 */
export const componentLogger = <T extends ComponentParent<T>>(
  logger: T,
  component: LogComponent,
): T => {
  const level = levelOverridesOf(logger)?.[component];
  const bindings = { 'nebula.component': component };
  return level === undefined ? logger.child(bindings) : logger.child(bindings, { level });
};
