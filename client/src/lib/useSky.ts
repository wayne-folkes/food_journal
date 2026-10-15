import { useEffect, useLayoutEffect, useState } from 'react'
import { ACCENT, PHASE_LABELS, phaseOf, resolvePhase, SKY_PALETTES, skyCssVars, type SkyPhase, type ThemePref } from './sky'

const THEME_KEY = 'fj-theme'

/** Current wall-clock time, refreshed on an interval. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

/** Write a phase's palette onto <html> so everything (modals, toasts) re-tints. */
export function applySky(phase: SkyPhase): void {
  const root = document.documentElement
  for (const [k, v] of Object.entries(skyCssVars(SKY_PALETTES[phase]))) root.style.setProperty(k, v)
  root.style.setProperty('--acc', ACCENT)
  root.dataset.sky = phase
  root.style.colorScheme = SKY_PALETTES[phase].dark ? 'dark' : 'light'
}

/**
 * Apply the current palette before React mounts, so the first paint is already
 * the right color and the 2s color transition only runs on real phase changes.
 */
export function initSky(now = new Date()): void {
  applySky(resolvePhase(readThemePref(), now.getHours()))
}

export interface Sky {
  /** Phase whose palette is on screen (honors the theme preference). */
  phase: SkyPhase
  /** Lower-case name of the actual clock's phase, for "Good morning". */
  greeting: string
}

/**
 * Applies the time-of-day palette as CSS custom properties on <html> so
 * everything (including portals and toasts) re-tints, and returns the phase.
 */
export function useSky(now: Date, theme: ThemePref = readThemePref()): Sky {
  const hour = now.getHours()
  const phase = resolvePhase(theme, hour)

  useLayoutEffect(() => {
    applySky(phase)
  }, [phase])

  return { phase, greeting: PHASE_LABELS[phaseOf(hour)].toLowerCase() }
}
