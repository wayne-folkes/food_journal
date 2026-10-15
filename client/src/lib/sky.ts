/**
 * Liquid Glass — time-of-day "sky" palettes.
 *
 * The whole UI is tinted by the real clock: morning → afternoon → evening →
 * night. Pure data + functions only so the palette logic is unit-testable.
 */

export type SkyPhase = 'morning' | 'afternoon' | 'evening' | 'night'
export type ThemePref = 'auto' | 'light' | 'dark'

export interface SkyPalette {
  /** Full-screen gradient (165deg). */
  bg: string
  /** Solid mid-tone of the gradient — fallback for body / opaque surfaces. */
  bgSolid: string
  /** Opaque surface for modals and menus (glass is too see-through there). */
  surface: string
  ink: string
  mute: string
  glass: string
  edge: string
  line: string
  /** Aurora ribbon opacity. */
  aurora: number
  dark: boolean
}

export const ACCENT = '#8C7BFF'

export const SKY_PALETTES: Record<SkyPhase, SkyPalette> = {
  morning: {
    bg: 'linear-gradient(165deg,#FFE1CF 0%,#F7D8EC 48%,#D8E3FF 100%)',
    bgSolid: '#F7D8EC',
    surface: '#FCF3F8',
    ink: '#221C33',
    mute: 'rgba(34,28,51,.58)',
    glass: 'rgba(255,255,255,.42)',
    edge: 'rgba(255,255,255,.75)',
    line: 'rgba(34,28,51,.08)',
    aurora: 0.55,
    dark: false,
  },
  afternoon: {
    bg: 'linear-gradient(165deg,#D6E8FF 0%,#EAF3FF 50%,#F1E6FF 100%)',
    bgSolid: '#EAF3FF',
    surface: '#F5F9FF',
    ink: '#1A2238',
    mute: 'rgba(26,34,56,.56)',
    glass: 'rgba(255,255,255,.44)',
    edge: 'rgba(255,255,255,.8)',
    line: 'rgba(26,34,56,.08)',
    aurora: 0.5,
    dark: false,
  },
  evening: {
    bg: 'linear-gradient(165deg,#2E2049 0%,#5C3460 52%,#B4605A 100%)',
    bgSolid: '#5C3460',
    surface: '#3A2750',
    ink: '#FFF5EF',
    mute: 'rgba(255,245,239,.66)',
    glass: 'rgba(255,255,255,.11)',
    edge: 'rgba(255,255,255,.24)',
    line: 'rgba(255,255,255,.1)',
    aurora: 0.45,
    dark: true,
  },
  night: {
    bg: 'linear-gradient(165deg,#090D22 0%,#131838 55%,#221445 100%)',
    bgSolid: '#131838',
    surface: '#181C3E',
    ink: '#EEF0FF',
    mute: 'rgba(238,240,255,.6)',
    glass: 'rgba(255,255,255,.07)',
    edge: 'rgba(255,255,255,.16)',
    line: 'rgba(255,255,255,.08)',
    aurora: 0.38,
    dark: true,
  },
}

export const SKY_PHASES: SkyPhase[] = ['morning', 'afternoon', 'evening', 'night']

export const PHASE_LABELS: Record<SkyPhase, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
}

/** 5–11 morning, 11–17 afternoon, 17–21 evening, otherwise night. */
export function phaseOf(hour: number): SkyPhase {
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

/**
 * Auto follows the clock. Light keeps the current phase if it is light,
 * otherwise falls back to afternoon; dark keeps the phase if dark, else night.
 */
export function resolvePhase(theme: ThemePref, hour: number): SkyPhase {
  const phase = phaseOf(hour)
  const dark = SKY_PALETTES[phase].dark
  if (theme === 'light') return dark ? 'afternoon' : phase
  if (theme === 'dark') return dark ? phase : 'night'
  return phase
}

/**
 * CSS custom properties for a palette. Includes the legacy token names
 * (--paper, --ink-muted, --sep …) that the older sheets and modals still use,
 * so they re-tint with the sky instead of staying night-colored.
 */
export function skyCssVars(p: SkyPalette): Record<string, string> {
  return {
    '--sky': p.bg,
    '--bg': p.bgSolid,
    '--ink': p.ink,
    '--mute': p.mute,
    '--glass': p.glass,
    '--glass2': p.dark ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.7)',
    '--edge': p.edge,
    '--line': p.line,
    '--inv': p.dark ? '#14112A' : '#FFFFFF',
    '--bo': String(p.aurora),
    // legacy aliases
    '--cream': p.bgSolid,
    '--cream-mid': p.surface,
    '--cream-dark': `color-mix(in srgb, ${p.surface} 88%, ${p.ink})`,
    '--paper': p.surface,
    '--card': p.surface,
    '--ink-mid': `color-mix(in srgb, ${p.ink} 78%, transparent)`,
    '--ink-muted': p.mute,
    '--ter': `color-mix(in srgb, ${p.ink} 40%, transparent)`,
    '--sep': p.line,
    '--border': p.dark ? p.edge : p.line,
    '--overlay-bg': p.dark ? 'rgba(8,6,20,.62)' : 'rgba(34,28,51,.38)',
    '--header-bg': p.surface,
  }
}
