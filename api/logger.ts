/**
 * Server-side structured logger for Vercel serverless functions.
 *
 * Uses LogLayer with Pino transport. Pino outputs JSON lines that
 * Vercel's log viewer can parse and filter automatically.
 */
import { LogLayer } from 'loglayer'
import { PinoTransport } from '@loglayer/transport-pino'
import pino from 'pino'

export const log = new LogLayer({
  transport: new PinoTransport({
    logger: pino({ level: 'debug' }),
  }),
})
