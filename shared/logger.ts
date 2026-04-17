/**
 * Platform-agnostic structured logger.
 *
 * This module provides types and a factory for creating loggers that work
 * identically in Node (Vercel serverless) and in the browser. The actual
 * output formatting is supplied by the caller via a `LogWriter` function,
 * so the core has zero dependencies on `console`, `process`, or any
 * browser/Node API — keeping it safe for `shared/`.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** Flat, serialisable key-value context attached to every log entry. */
export interface LogContext {
  [key: string]: string | number | boolean | null | undefined
}

export interface Logger {
  debug(msg: string, ctx?: LogContext): void
  info(msg: string, ctx?: LogContext): void
  warn(msg: string, ctx?: LogContext): void
  error(msg: string, ctx?: LogContext): void
  /** Return a child logger that merges `defaultCtx` into every entry. */
  child(defaultCtx: LogContext): Logger
}

/**
 * A write function that receives the fully-assembled log entry.
 * Implementations decide how to render it (JSON, console, etc.).
 */
export type LogWriter = (entry: { level: LogLevel; msg: string } & LogContext) => void

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

export interface CreateLoggerOptions {
  /** Minimum level to emit. Defaults to `'debug'`. */
  minLevel?: LogLevel
  /** Context fields merged into every log entry from this logger. */
  defaultContext?: LogContext
}

export function createLogger(
  write: LogWriter,
  opts?: CreateLoggerOptions,
): Logger {
  const minLevel = opts?.minLevel ?? 'debug'
  const defaultCtx = opts?.defaultContext ?? {}

  function log(level: LogLevel, msg: string, ctx?: LogContext): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return
    write({ level, msg, ...defaultCtx, ...ctx })
  }

  return {
    debug: (msg, ctx) => log('debug', msg, ctx),
    info: (msg, ctx) => log('info', msg, ctx),
    warn: (msg, ctx) => log('warn', msg, ctx),
    error: (msg, ctx) => log('error', msg, ctx),
    child: (childCtx) =>
      createLogger(write, {
        minLevel,
        defaultContext: { ...defaultCtx, ...childCtx },
      }),
  }
}

/** Safely extract a message string from an unknown caught value. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
