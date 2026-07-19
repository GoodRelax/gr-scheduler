/**
 * Framework layer: namespaced structured dev logger (ARCH-C-034,
 * observability-lite). Emits JSON records at DEBUG/INFO/WARN/ERROR levels under
 * a namespace (e.g. "grsch:render"). All console access in the codebase is
 * funnelled through here so `no-console` can stay enforced elsewhere.
 *
 * In production builds `import.meta.env.DEV` is false, so the emit branch is
 * statically dead and stripped by the bundler (dead-code elimination), matching
 * the "removed in production build" observability requirement.
 */

/** Diagnostic severity levels. */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/** Structured fields attached to a log record (domain-qualified keys only). */
export type LogFields = Record<string, unknown>;

/** True only in dev/serve; false in production single-file builds. */
const isDevBuild = import.meta.env.DEV;

interface LogRecord {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly namespace: string;
  readonly message: string;
  readonly fields?: LogFields;
}

function emit(record: LogRecord): void {
  if (!isDevBuild) {
    return;
  }
  const serialized = JSON.stringify(record);
  /* eslint-disable-next-line no-console -- sole sanctioned console boundary */
  const sink = record.level === 'ERROR' ? console.error : console.log;
  sink(serialized);
}

/** A logger bound to a fixed namespace. */
export interface NamespacedLogger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

/**
 * Create a logger bound to a namespace.
 *
 * @param namespace - Dotted/colon namespace, e.g. "grsch:render".
 * @returns A logger exposing the four severity methods.
 */
export function createLogger(namespace: string): NamespacedLogger {
  const write = (level: LogLevel, message: string, fields?: LogFields): void => {
    emit({
      timestamp: new Date().toISOString(),
      level,
      namespace,
      message,
      ...(fields ? { fields } : {}),
    });
  };
  return {
    debug: (message, fields) => write('DEBUG', message, fields),
    info: (message, fields) => write('INFO', message, fields),
    warn: (message, fields) => write('WARN', message, fields),
    error: (message, fields) => write('ERROR', message, fields),
  };
}
