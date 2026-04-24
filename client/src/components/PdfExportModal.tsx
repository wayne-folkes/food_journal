import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { MealWithItems } from '@shared/types/database'
import { useEntriesStore, getWeekBounds } from '../lib/store'
import { PDFCover, PDFWeeklyArchive } from './PdfPages'
import { buildTheme, ACCENT_PRESETS } from '../lib/pdfThemes'
import type { PdfVoice, PdfTileMode } from '../lib/pdfThemes'

interface Props {
  onClose: () => void
}

const VOICE_LABELS: Record<PdfVoice, { label: string; desc: string }> = {
  magazine:   { label: 'Magazine',    desc: 'Playfair · Garamond · warm' },
  clinical:   { label: 'Clinical',    desc: 'Inter · clean · structured' },
  fieldnotes: { label: 'Field notes', desc: 'Mono · tactile · archival' },
}

const TILE_MODES: { key: PdfTileMode; label: string }[] = [
  { key: 'textured', label: 'Textured' },
  { key: 'solid',    label: 'Flat' },
  { key: 'mono',     label: 'Greyscale' },
]

export function PdfExportModal({ onClose }: Props) {
  const [voice, setVoice] = useState<PdfVoice>('magazine')
  const [accent, setAccent] = useState('#A32F22')
  const [tileMode, setTileMode] = useState<PdfTileMode>('textured')
  const [weekDays, setWeekDays] = useState<{ date: string; meals: MealWithItems[] }[]>([])

  const { dayCache, loadPriorItems } = useEntriesStore()

  // Load current week on open
  useEffect(() => {
    const today = new Date().toLocaleDateString('sv')
    const { start } = getWeekBounds(today)
    loadPriorItems(start)
  }, [loadPriorItems])

  // Build weekDays array from dayCache whenever cache updates
  useEffect(() => {
    const today = new Date().toLocaleDateString('sv')
    const { start } = getWeekBounds(today)
    const days: { date: string; meals: MealWithItems[] }[] = []
    const d = new Date(`${start}T12:00:00`)
    for (let i = 0; i < 7; i++) {
      const dateStr = d.toLocaleDateString('sv')
      days.push({ date: dateStr, meals: dayCache[dateStr] ?? [] })
      d.setDate(d.getDate() + 1)
    }
    setWeekDays(days)
  }, [dayCache])

  const theme = useMemo(() => buildTheme(voice, accent), [voice, accent])

  const mealCount = weekDays.reduce((s, d) => s + d.meals.length, 0)
  const itemCount  = weekDays.reduce((s, d) => s + d.meals.flatMap(m => m.items).length, 0)

  // Build the range label from weekDays
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length === 0) return ''
    const first = new Date(`${weekDays[0].date}T12:00:00`)
    const last  = new Date(`${weekDays[6].date}T12:00:00`)
    const opts = { month: 'long' as const, day: 'numeric' as const }
    return `${first.toLocaleDateString(undefined, opts)} – ${last.toLocaleDateString(undefined, { day: 'numeric', year: 'numeric' })}`
  }, [weekDays])

  const weekLabel = useMemo(() => {
    if (weekDays.length === 0) return ''
    const d = new Date(`${weekDays[0].date}T12:00:00`)
    const week = Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7)
    return `Week ${week}`
  }, [weekDays])

  function handlePrint() {
    window.print()
  }

  // Render the print-only pages into a portal outside the modal
  const printPages = weekDays.length > 0 ? createPortal(
    <div id="pdf-print-root" className="pdf-print-root">
      <PDFCover
        theme={theme}
        tileMode={tileMode}
        weekLabel={weekLabel}
        dateRange={weekRangeLabel}
        mealCount={mealCount}
        itemCount={itemCount}
        weekDays={weekDays}
      />
      <PDFWeeklyArchive
        theme={theme}
        tileMode={tileMode}
        weekDays={weekDays}
        weekRangeLabel={weekRangeLabel}
        pageNumber={2}
        totalPages={2}
      />
    </div>,
    document.body
  ) : null

  return (
    <>
      {printPages}
      <div className="ei-compose-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="ei-compose-sheet ei-pdf-sheet">
          {/* Header */}
          <div className="ei-pdf__header">
            <button className="ei-pdf__cancel" onClick={onClose} type="button">Cancel</button>
            <span className="ei-pdf__title">Export PDF</span>
            <button
              className="ei-pdf__print-btn"
              onClick={handlePrint}
              type="button"
            >
              Print
            </button>
          </div>

          <div className="ei-pdf__body">
            {/* Week summary */}
            <div className="ei-pdf__week-info">
              <span className="ei-pdf__week-label">{weekRangeLabel || 'Loading…'}</span>
              <span className="ei-pdf__week-stat">{mealCount} meals · {itemCount} items</span>
            </div>

            {/* Voice selector */}
            <div className="ei-pdf__section">
              <div className="ei-pdf__section-label">Style</div>
              <div className="ei-pdf__voice-grid">
                {(Object.keys(VOICE_LABELS) as PdfVoice[]).map((v) => (
                  <button
                    key={v}
                    className={`ei-pdf__voice-btn${voice === v ? ' ei-pdf__voice-btn--active' : ''}`}
                    onClick={() => setVoice(v)}
                    type="button"
                    style={voice === v ? { borderColor: accent, background: `${accent}12` } : {}}
                  >
                    <span className="ei-pdf__voice-name">{VOICE_LABELS[v].label}</span>
                    <span className="ei-pdf__voice-desc">{VOICE_LABELS[v].desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent color */}
            <div className="ei-pdf__section">
              <div className="ei-pdf__section-label">Accent</div>
              <div className="ei-pdf__accent-row">
                {Object.entries(ACCENT_PRESETS).map(([name, hex]) => (
                  <button
                    key={hex}
                    className="ei-pdf__accent-swatch"
                    style={{
                      background: hex,
                      boxShadow: accent === hex
                        ? `0 0 0 2.5px var(--card), 0 0 0 4px ${hex}`
                        : 'inset 0 0 0 0.5px rgba(0,0,0,0.15)',
                    }}
                    title={name}
                    onClick={() => setAccent(hex)}
                    type="button"
                    aria-label={name}
                    aria-pressed={accent === hex}
                  />
                ))}
              </div>
            </div>

            {/* Tile mode */}
            <div className="ei-pdf__section">
              <div className="ei-pdf__section-label">Ingredient tiles</div>
              <div className="ei-pdf__tile-row">
                {TILE_MODES.map(({ key, label }) => (
                  <button
                    key={key}
                    className={`ei-pdf__tile-btn${tileMode === key ? ' ei-pdf__tile-btn--active' : ''}`}
                    onClick={() => setTileMode(key)}
                    type="button"
                    style={tileMode === key ? { borderColor: accent, background: `${accent}10`, color: accent } : {}}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview note */}
            <div className="ei-pdf__preview-note">
              Opens your browser's print dialog. Choose "Save as PDF" to download.
            </div>

            {/* Print button */}
            <button
              className="ei-pdf__big-print-btn"
              onClick={handlePrint}
              type="button"
              style={{ background: accent }}
            >
              Print / Save as PDF
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
