/**
 * Client-side structured logger.
 *
 * Uses LogLayer with its built-in ConsoleTransport. In development all
 * levels are emitted; in production only `warn` and `error` are emitted
 * (matching the previous behaviour of bare `console.error` / `console.warn`
 * calls).
 */
import { LogLayer, ConsoleTransport, LogLevel } from 'loglayer'

const isDev = import.meta.env.DEV

export const log = new LogLayer({
  transport: new ConsoleTransport({
    logger: console,
    level: isDev ? LogLevel.debug : LogLevel.warn,
  }),
  prefix: '[food-journal]',
})
