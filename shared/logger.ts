/**
 * Platform-agnostic logging helpers.
 *
 * Logger instances are created per-platform (see `api/logger.ts` and
 * `client/src/lib/logger.ts`) using LogLayer with the appropriate
 * transport. This module only exports helpers that are safe to use in
 * `shared/` — no runtime deps on `console`, `process`, or any
 * browser/Node API.
 */

/** Safely extract a message string from an unknown caught value. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
