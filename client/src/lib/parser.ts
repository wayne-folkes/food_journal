import * as chrono from 'chrono-node'

export interface ParsedMeal {
  /** Individual item descriptions (one per chip the user typed). */
  items: string[]
  /** Resolved meal timestamp. Extracted from the last chip that contained a time phrase,
   *  otherwise defaults to referenceDate (now). */
  consumed_at: Date
}

/**
 * Parses a single chip's raw text, returning a clean description and an
 * optional extracted timestamp.
 *
 * Examples:
 *   "coffee at 9am"  → { description: "coffee", consumed_at: <today 9:00> }
 *   "scrambled eggs" → { description: "scrambled eggs", consumed_at: null }
 */
export function parseChip(
  raw: string,
  referenceDate = new Date()
): { description: string; consumed_at: Date | null } {
  const trimmed = raw.trim()
  const results = chrono.parse(trimmed, referenceDate, { forwardDate: false })

  if (results.length === 0) {
    return { description: trimmed, consumed_at: null }
  }

  const match = results[0]
  const consumed_at = match.date()

  const before = trimmed.slice(0, match.index).trim()
  const after = trimmed.slice(match.index + match.text.length).trim()
  const description = [before, after].filter(Boolean).join(' ').trim() || trimmed

  return { description, consumed_at }
}

/**
 * Parses a free-text sentence into a ParsedMeal, splitting items on commas
 * and the standalone word "and".
 *
 *   "salmon, brown rice and ginger tea" → ["salmon", "brown rice", "ginger tea"]
 *   "ham sandwich and coffee at 9am"    → ["ham sandwich", "coffee"] @ 9:00
 */
export function parseSentence(raw: string, referenceDate = new Date()): ParsedMeal {
  const pieces = raw
    .split(/,|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean)
  return parseMeal(pieces, referenceDate)
}

/**
 * Parses an array of raw chip strings into a unified ParsedMeal.
 * The last chip containing a time phrase wins for consumed_at.
 */
export function parseMeal(rawChips: string[], referenceDate = new Date()): ParsedMeal {
  let consumed_at: Date = referenceDate
  const items: string[] = []

  for (const chip of rawChips) {
    const { description, consumed_at: t } = parseChip(chip, referenceDate)
    if (description) items.push(description)
    if (t) consumed_at = t
  }

  return { items, consumed_at }
}
