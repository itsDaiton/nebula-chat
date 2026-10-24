import type { LogComponent } from './attributes';
import { levelControlOf } from './levelControl';

type ComponentParent<T> = {
  child: (bindings: { 'nebula.component': LogComponent }, options?: { level: string }) => T;
};

/**
 * A child logger for one subsystem: binds `nebula.component`, takes its level from `levelOverrides` or inherits it, and is tracked for `changeLogLevel`.
 * An override may sit below the root (Pino filters per instance); derive it from a logger with no component bound yet.
 */
export const componentLogger = <T extends ComponentParent<T>>(
  logger: T,
  component: LogComponent,
): T => {
  const control = levelControlOf(logger);
  const level = control?.levelFor(component);
  const bindings = { 'nebula.component': component };
  const child = level === undefined ? logger.child(bindings) : logger.child(bindings, { level });
  control?.track(component, child);
  return child;
};
