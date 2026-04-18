import { describe, it, expect } from 'vitest'
import { getTileSpec } from './tileMap'
import type { TileSpec } from './tileMap'

describe('getTileSpec', () => {
  it('returns known spec for exact match', () => {
    const spec = getTileSpec('oats')
    expect(spec).toEqual({ hue: 40, sat: 30, l: 72, pattern: 'dot' })
  })

  it('is case-insensitive', () => {
    const spec = getTileSpec('Coffee')
    expect(spec).toEqual({ hue: 25, sat: 30, l: 34, pattern: 'solid' })
  })

  it('matches substring — "chicken breast" matches "chicken"', () => {
    const spec = getTileSpec('chicken breast')
    expect(spec.pattern).toBe('stripe')
    expect(spec.hue).toBe(30)
  })

  it('generates deterministic tile for unknown foods', () => {
    const a = getTileSpec('dragon fruit')
    const b = getTileSpec('dragon fruit')
    expect(a).toEqual(b)
  })

  it('generates different tiles for different unknown foods', () => {
    const a = getTileSpec('dragon fruit')
    const b = getTileSpec('passion fruit')
    // They should differ in at least one property
    const same = a.hue === b.hue && a.sat === b.sat && a.l === b.l && a.pattern === b.pattern
    expect(same).toBe(false)
  })

  it('generated tiles have valid ranges', () => {
    const spec = getTileSpec('some random unusual ingredient xyz')
    expect(spec.hue).toBeGreaterThanOrEqual(0)
    expect(spec.hue).toBeLessThan(360)
    expect(spec.sat).toBeGreaterThanOrEqual(20)
    expect(spec.sat).toBeLessThanOrEqual(54)
    expect(spec.l).toBeGreaterThanOrEqual(40)
    expect(spec.l).toBeLessThanOrEqual(79)
    expect(['stripe', 'dot', 'cross', 'wave', 'solid']).toContain(spec.pattern)
  })
})
