export type TilePattern = 'stripe' | 'dot' | 'cross' | 'wave' | 'solid'

export interface TileSpec {
  hue: number
  sat: number
  l: number
  pattern: TilePattern
}

/**
 * Known ingredient → tile mappings from the design spec.
 * Keys are lowercase for case-insensitive matching.
 */
const KNOWN_TILES: Record<string, TileSpec> = {
  'oats': { hue: 40, sat: 30, l: 72, pattern: 'dot' },
  'oatmeal': { hue: 40, sat: 30, l: 72, pattern: 'dot' },
  'honey': { hue: 45, sat: 60, l: 62, pattern: 'solid' },
  'blueberries': { hue: 235, sat: 35, l: 44, pattern: 'cross' },
  'blueberry': { hue: 235, sat: 35, l: 44, pattern: 'cross' },
  'coffee': { hue: 25, sat: 30, l: 34, pattern: 'solid' },
  'cortado': { hue: 25, sat: 30, l: 34, pattern: 'solid' },
  'espresso': { hue: 25, sat: 30, l: 34, pattern: 'solid' },
  'latte': { hue: 25, sat: 30, l: 48, pattern: 'solid' },
  'chicken': { hue: 30, sat: 28, l: 58, pattern: 'stripe' },
  'romaine': { hue: 90, sat: 32, l: 56, pattern: 'wave' },
  'caesar': { hue: 90, sat: 32, l: 56, pattern: 'wave' },
  'lettuce': { hue: 90, sat: 32, l: 56, pattern: 'wave' },
  'parmesan': { hue: 50, sat: 30, l: 80, pattern: 'dot' },
  'cheese': { hue: 50, sat: 40, l: 74, pattern: 'dot' },
  'croutons': { hue: 35, sat: 34, l: 66, pattern: 'cross' },
  'water': { hue: 200, sat: 10, l: 88, pattern: 'stripe' },
  'almonds': { hue: 30, sat: 20, l: 62, pattern: 'dot' },
  'almond': { hue: 30, sat: 20, l: 62, pattern: 'dot' },
  'apple': { hue: 8, sat: 55, l: 54, pattern: 'solid' },
  // Additional common foods
  'salmon': { hue: 12, sat: 55, l: 58, pattern: 'stripe' },
  'rice': { hue: 42, sat: 15, l: 88, pattern: 'dot' },
  'bread': { hue: 35, sat: 35, l: 68, pattern: 'cross' },
  'toast': { hue: 35, sat: 35, l: 62, pattern: 'cross' },
  'egg': { hue: 48, sat: 50, l: 78, pattern: 'solid' },
  'eggs': { hue: 48, sat: 50, l: 78, pattern: 'solid' },
  'banana': { hue: 52, sat: 65, l: 68, pattern: 'solid' },
  'avocado': { hue: 85, sat: 35, l: 48, pattern: 'wave' },
  'tomato': { hue: 5, sat: 60, l: 50, pattern: 'solid' },
  'pasta': { hue: 42, sat: 28, l: 74, pattern: 'stripe' },
  'steak': { hue: 0, sat: 30, l: 38, pattern: 'stripe' },
  'beef': { hue: 0, sat: 30, l: 38, pattern: 'stripe' },
  'pork': { hue: 15, sat: 25, l: 55, pattern: 'stripe' },
  'shrimp': { hue: 10, sat: 45, l: 62, pattern: 'wave' },
  'yogurt': { hue: 40, sat: 10, l: 90, pattern: 'solid' },
  'milk': { hue: 40, sat: 8, l: 92, pattern: 'solid' },
  'butter': { hue: 48, sat: 55, l: 76, pattern: 'solid' },
  'mushroom': { hue: 30, sat: 15, l: 52, pattern: 'dot' },
  'broccoli': { hue: 120, sat: 35, l: 40, pattern: 'cross' },
  'carrot': { hue: 28, sat: 65, l: 56, pattern: 'stripe' },
  'spinach': { hue: 130, sat: 35, l: 38, pattern: 'wave' },
  'potato': { hue: 38, sat: 25, l: 66, pattern: 'dot' },
  'onion': { hue: 45, sat: 20, l: 72, pattern: 'cross' },
  'garlic': { hue: 50, sat: 12, l: 82, pattern: 'dot' },
  'pepper': { hue: 0, sat: 55, l: 48, pattern: 'solid' },
  'corn': { hue: 52, sat: 60, l: 66, pattern: 'dot' },
  'beans': { hue: 20, sat: 25, l: 42, pattern: 'cross' },
  'chocolate': { hue: 20, sat: 40, l: 28, pattern: 'solid' },
  'sugar': { hue: 40, sat: 5, l: 90, pattern: 'solid' },
  'olive oil': { hue: 65, sat: 40, l: 52, pattern: 'solid' },
  'salad': { hue: 100, sat: 30, l: 54, pattern: 'wave' },
  'soup': { hue: 30, sat: 30, l: 48, pattern: 'wave' },
  'sandwich': { hue: 35, sat: 30, l: 62, pattern: 'cross' },
  'pizza': { hue: 8, sat: 50, l: 52, pattern: 'cross' },
  'taco': { hue: 42, sat: 40, l: 58, pattern: 'cross' },
  'sushi': { hue: 160, sat: 20, l: 48, pattern: 'stripe' },
  'fish': { hue: 195, sat: 20, l: 58, pattern: 'stripe' },
}

const PATTERNS: TilePattern[] = ['stripe', 'dot', 'cross', 'wave', 'solid']

/**
 * Simple string hash → unsigned 32-bit integer.
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Generate a tile spec from a food name by hashing.
 * Produces deterministic, visually distinct tiles.
 */
function generateTile(name: string): TileSpec {
  const hash = hashString(name)
  const hue = hash % 360
  const sat = 20 + (hash >> 8) % 35        // 20–54
  const l = 40 + (hash >> 16) % 40          // 40–79
  const pattern = PATTERNS[(hash >> 24) % PATTERNS.length]
  return { hue, sat, l, pattern }
}

/**
 * Look up a tile spec for an ingredient description.
 * Tries exact match first, then substring match against known keys,
 * then falls back to hash-based generation.
 */
export function getTileSpec(description: string): TileSpec {
  const lower = description.toLowerCase().trim()

  // Exact match
  if (KNOWN_TILES[lower]) return KNOWN_TILES[lower]

  // Substring match — check if any known key is contained in the description
  for (const [key, spec] of Object.entries(KNOWN_TILES)) {
    if (lower.includes(key) || key.includes(lower)) return spec
  }

  // Hash-based fallback
  return generateTile(lower)
}
