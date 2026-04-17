/**
 * Client-side structured logger.
 *
 * In development, all levels are emitted. In production, only `warn` and
 * `error` are emitted (matching the previous behaviour of bare
 * `console.error` / `console.warn` calls).
 *
 * Context fields are passed as a second argument to the native console
 * method so they appear expandable in browser DevTools.
 */
import { createLogger, type LogLevel } from '@shared/logger'

const consoleMethods: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
}

const isDev = import.meta.env.DEV

export const log = createLogger(
  (entry) => {
    const { level, msg, ...ctx } = entry
    const fn = consoleMethods[level]
    if (Object.keys(ctx).length > 0) {
      fn(`[food-journal] ${msg}`, ctx)
    } else {
      fn(`[food-journal] ${msg}`)
    }
  },
  { minLevel: isDev ? 'debug' : 'warn' },
)
