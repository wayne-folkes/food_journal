import * as chrono from 'chrono-node'

export interface ParsedEntry {
  description: string
  consumed_at: Date
}

/**
 * Rule-based parser. Extracts a time from natural language input and treats
 * the rest as the food description. One input = one entry (no multi-item splitting).
 *
 * Examples:
 *   "coffee at 9am"           → { description: "coffee", consumed_at: <today 9:00> }
 *   "grilled chicken salad"   → { description: "grilled chicken salad", consumed_at: <now> }
 *   "pizza at noon"           → { description: "pizza", consumed_at: <today 12:00> }
 */
export function parseEntry(raw: string, referenceDate = new Date()): ParsedEntry {
  const trimmed = raw.trim()

  const results = chrono.parse(trimmed, referenceDate, { forwardDate: false })

  if (results.length === 0) {
    return { description: trimmed, consumed_at: referenceDate }
  }

  const match = results[0]
  const consumed_at = match.date()

  // Strip the matched time text from the description
  const before = trimmed.slice(0, match.index).trim()
  const after = trimmed.slice(match.index + match.text.length).trim()
  const description = [before, after].filter(Boolean).join(' ').trim() || trimmed

  return { description, consumed_at }
}
