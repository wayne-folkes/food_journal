import type { TileSpec, TilePattern } from '../lib/tileMap'
import { getTileSpec } from '../lib/tileMap'

interface EITileProps {
  /** Provide a TileSpec directly, or a food name to auto-resolve */
  tile?: TileSpec
  /** Food name — used if tile is not provided */
  name?: string
  /** Size in px (default 30) */
  size?: number
  /** Fill the parent instead of a fixed square (e.g. detail-sheet tile strip) */
  fluid?: boolean
}

function getPatternBackground(
  hue: number,
  sat: number,
  l: number,
  pattern: TilePattern,
): string {
  const bg = `hsl(${hue} ${sat}% ${l}%)`
  const fg = `hsl(${hue} ${sat}% ${Math.max(0, l - 14)}%)`

  switch (pattern) {
    case 'stripe':
      return `repeating-linear-gradient(45deg, ${fg} 0 2px, transparent 2px 7px), ${bg}`
    case 'dot':
      return `radial-gradient(${fg} 1.2px, transparent 1.6px) 0 0 / 7px 7px, ${bg}`
    case 'cross':
      return `repeating-linear-gradient(0deg, ${fg} 0 1px, transparent 1px 6px), repeating-linear-gradient(90deg, ${fg} 0 1px, transparent 1px 6px), ${bg}`
    case 'wave':
      return `repeating-radial-gradient(circle at 0 50%, ${fg} 0 1px, transparent 1px 5px), ${bg}`
    case 'solid':
    default:
      return bg
  }
}

export function EITile({ tile, name, size = 30, fluid = false }: EITileProps) {
  const spec = tile ?? (name ? getTileSpec(name) : { hue: 40, sat: 20, l: 70, pattern: 'solid' as TilePattern })

  return (
    <div
      style={{
        width: fluid ? '100%' : size,
        height: fluid ? '100%' : size,
        borderRadius: fluid ? 14 : 4,
        flexShrink: 0,
        background: getPatternBackground(spec.hue, spec.sat, spec.l, spec.pattern),
        border: '0.5px solid rgba(0,0,0,0.12)',
      }}
      aria-hidden="true"
    />
  )
}
