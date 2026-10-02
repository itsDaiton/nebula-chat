import type pino from 'pino';
import type { LevelWithSilent } from 'pino';
import type { LogComponent, LogLevelTarget } from './attributes';
import { logEvent } from './logEvent';
import type { LogLevel } from './logLevels';

/** Per-component levels, keyed by `nebula.component` name. */
export type LevelOverrides = Readonly<Record<string, LevelWithSilent>>;

/** A runtime level change: the root level, or one component's when `component` is set. */
export type LogLevelChange = {
  component?: LogComponent | undefined;
  level: LogLevel;
  /** How long the change holds before the boot-time level returns. */
  ttlSeconds: number;
  /** Who asked for it, stamped on the lines that record it. */
  operator: string;
};

/** The level state of one logger tree: its boot-time levels plus any runtime change. */
export type LevelControl = {
  /** The level a new child of `component` takes, or `undefined` to inherit its parent's. */
  levelFor: (component: LogComponent) => LevelWithSilent | undefined;
  /** Remembers a child `componentLogger` made, so a later change reaches it. */
  track: (component: LogComponent, child: object) => void;
  change: (change: LogLevelChange) => void;
};

const LEVEL_CONTROL = Symbol('nebula.levelControl');

type WithControl = { [LEVEL_CONTROL]?: LevelControl };

type Tracked = { component: LogComponent; ref: WeakRef<pino.Logger> };

type RuntimeLevel = { level: LogLevel; timer: ReturnType<typeof setTimeout> };

const createLevelControl = (root: pino.Logger, boot: LevelOverrides): LevelControl => {
  const bootRoot = root.level;
  const runtime = new Map<LogLevelTarget, RuntimeLevel>();
  // Component children are mostly per request, so they are held weakly and
  // forgotten once collected; a strong registry would grow with every request.
  const tracked = new Set<Tracked>();
  const forget = new FinalizationRegistry<Tracked>((entry) => tracked.delete(entry));
  let audit: pino.Logger | undefined;

  const levelFor = (component: LogComponent): LevelWithSilent | undefined =>
    runtime.get(component)?.level ?? boot[component];

  const track = (component: LogComponent, child: object): void => {
    const entry = { component, ref: new WeakRef(child as pino.Logger) };
    tracked.add(entry);
    forget.register(child, entry);
  };

  // Pino cannot unset a child's own level, so every tracked child gets one: its
  // component's level, else its parent's (the logger it was derived from is its prototype).
  const apply = (): void => {
    root.level = runtime.get('root')?.level ?? bootRoot;
    for (const { component, ref } of tracked) {
      const child = ref.deref();
      if (child) {
        child.level = levelFor(component) ?? (Object.getPrototypeOf(child) as pino.Logger).level;
      }
    }
  };

  const levelOf = (target: LogLevelTarget): LevelWithSilent =>
    (target === 'root' ? undefined : levelFor(target)) ?? (root.level as LevelWithSilent);

  // Forced to `info` on a child of its own, so even a switch to `error` is recorded.
  const auditLog = (): pino.Logger => {
    if (!audit) {
      audit = root.child({});
      audit.level = 'info';
    }
    return audit;
  };

  const revert = (target: LogLevelTarget, from: LogLevel, operator: string): void => {
    runtime.delete(target);
    apply();
    const to = levelOf(target);
    logEvent(
      auditLog(),
      'info',
      'log.level.reverted',
      {
        'nebula.log.target': target,
        'nebula.log.level.from': from,
        'nebula.log.level.to': to,
        'nebula.operator': operator,
      },
      `Log level of ${target} reverted from ${from} to ${to}`,
    );
  };

  const change = ({ component, level, ttlSeconds, operator }: LogLevelChange): void => {
    const target = component ?? 'root';
    const from = levelOf(target);
    clearTimeout(runtime.get(target)?.timer);
    // Unref'd: a pending revert must not keep a process alive that is shutting down.
    const timer = setTimeout(() => revert(target, level, operator), ttlSeconds * 1000).unref();
    runtime.set(target, { level, timer });
    apply();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    logEvent(
      auditLog(),
      'info',
      'log.level.changed',
      {
        'nebula.log.target': target,
        'nebula.log.level.from': from,
        'nebula.log.level.to': level,
        'nebula.log.level.expires_at': expiresAt,
        'nebula.operator': operator,
      },
      `Log level of ${target} changed from ${from} to ${level} until ${expiresAt}`,
    );
  };

  return { levelFor, track, change };
};

/**
 * Records the level state on the root logger. Pino builds every child with
 * `Object.create(parent)`, so the state is inherited down the whole chain —
 * Fastify's per-request `req.log`, bound children, all of them — without any
 * logger having to be told about it. `componentLogger.test.ts` pins this.
 */
export const attachLevelControl = (root: pino.Logger, overrides: LevelOverrides): void => {
  (root as WithControl)[LEVEL_CONTROL] = createLevelControl(root, overrides);
};

/** The level state of the tree a logger belongs to, if `createLogger` built it. */
export const levelControlOf = (logger: object): LevelControl | undefined =>
  (logger as WithControl)[LEVEL_CONTROL];
