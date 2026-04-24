export type PdfVoice = 'magazine' | 'clinical' | 'fieldnotes'
export type PdfTileMode = 'textured' | 'solid' | 'mono'

export interface PdfTheme {
  pageBg: string
  coverBg: string
  ink: string
  mute: string
  ter: string
  sep: string
  serif: string
  body: string
  sans: string
  accent: string
}

export const VOICES: Record<PdfVoice, Omit<PdfTheme, 'accent'>> = {
  magazine: {
    pageBg: '#FFFDF8',
    coverBg: '#F5F0E6',
    ink: '#1C1A16',
    mute: 'rgba(60,50,38,0.62)',
    ter: 'rgba(60,50,38,0.32)',
    sep: 'rgba(28,26,22,0.09)',
    serif: '"Playfair Display", Georgia, serif',
    body: '"EB Garamond", Georgia, serif',
    sans: '-apple-system, "Inter", system-ui, sans-serif',
  },
  clinical: {
    pageBg: '#FFFFFF',
    coverBg: '#F4F4F2',
    ink: '#111111',
    mute: 'rgba(20,20,20,0.50)',
    ter: 'rgba(20,20,20,0.22)',
    sep: 'rgba(0,0,0,0.07)',
    serif: '"Inter", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    sans: '"Inter", system-ui, sans-serif',
  },
  fieldnotes: {
    pageBg: '#F9F4EC',
    coverBg: '#EDE5D5',
    ink: '#2A2318',
    mute: 'rgba(42,35,24,0.55)',
    ter: 'rgba(42,35,24,0.28)',
    sep: 'rgba(42,35,24,0.08)',
    serif: '"DM Mono", "Courier New", monospace',
    body: '"DM Mono", "Courier New", monospace',
    sans: '"DM Mono", "Courier New", monospace',
  },
}

export const ACCENT_PRESETS: Record<string, string> = {
  'Editorial red': '#A32F22',
  'Forest':        '#2E5D3C',
  'Slate':         '#2B4462',
  'Ochre':         '#B2711F',
  'Ink':           '#1C1A16',
}

export function buildTheme(voice: PdfVoice, accent: string): PdfTheme {
  return { ...VOICES[voice], accent }
}
