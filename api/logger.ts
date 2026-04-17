/**
 * Server-side structured logger for Vercel serverless functions.
 *
 * Outputs JSON lines so Vercel's log viewer can parse and filter them.
 * Uses `console.error` / `console.warn` / `console.log` to preserve
 * Vercel's level-based colouring in the dashboard.
 */
import { createLogger, type LogLevel } from '../shared/logger'

const consoleMethods: Record<LogLevel, (...args: string[]) => void> = {
  debug: console.log,
  info: console.log,
  warn: console.warn,
  error: console.error,
}

export const log = createLogger((entry) => {
  const { level, ...rest } = entry
  const output = JSON.stringify({ level, ...rest, timestamp: new Date().toISOString() })
  consoleMethods[level](output)
})
