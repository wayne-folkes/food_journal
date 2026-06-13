import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { MealWithItems } from '@shared/types/database'
import { useEntriesStore, getWeekBounds, todayString } from '../lib/store'
import { supabase } from '../lib/supabase'
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

type WeekGroup = {
  weekStart: string
  weekRangeLabel: string
  weekLabel: string
  days: { date: string; meals: MealWithItems[] }[]
}

function buildWeekLabel(weekStart: string): string {
  const d = new Date(`${weekStart}T12:00:00`)
  const startOfYear = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  return `Week ${week}`
}

function buildWeekRangeLabel(days: { date: string }[]): string {
  if (days.length === 0) return ''
  const first = new Date(`${days[0].date}T12:00:00`)
  const last  = new Date(`${days[6].date}T12:00:00`)
  const opts = { month: 'long' as const, day: 'numeric' as const }
  return `${first.toLocaleDateString(undefined, opts)} – ${last.toLocaleDateString(undefined, { day: 'numeric', year: 'numeric' })}`
}

export function PdfExportModal({ onClose }: Props) {
  const today = todayString()
  const [voice, setVoice] = useState<PdfVoice>('magazine')
  const [accent, setAccent] = useState('#A32F22')
  const [tileMode, setTileMode] = useState<PdfTileMode>('textured')
  const [startDate, setStartDate] = useState(() => getWeekBounds(today).start)
  const [endDate, setEndDate] = useState(() => getWeekBounds(today).end)
  const [rangeMeals, setRangeMeals] = useState<MealWithItems[]>([])
  const [loadedRangeKey, setLoadedRangeKey] = useState<string | null>(null)

  const { isAuthed } = useEntriesStore()
  const currentRangeKey = `${startDate}:${endDate}`
  const loading = isAuthed && loadedRangeKey !== currentRangeKey

  const DATE_PRESETS = useMemo(() => {
    const d = new Date(`${today}T12:00:00`)
    const fmt = (date: Date) => date.toLocaleDateString('sv')
    const mondayOf = (date: Date) => {
      const day = date.getDay()
      const diff = day === 0 ? -6 : 1 - day
      const m = new Date(date)
      m.setDate(date.getDate() + diff)
      return m
    }
    const sundayOf = (monday: Date) => {
      const s = new Date(monday)
      s.setDate(monday.getDate() + 6)
      return s
    }

    const thisMonday = mondayOf(d)
    const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7)
    const twoWeeksAgo = new Date(thisMonday); twoWeeksAgo.setDate(thisMonday.getDate() - 14)
    const threeWeeksAgo = new Date(thisMonday); threeWeeksAgo.setDate(thisMonday.getDate() - 21)

    // Start of this calendar month
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthStartMonday = mondayOf(monthStart)
    // End of this calendar month (or today if still in progress)
    const monthEndRaw = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const monthEnd = monthEndRaw > d ? d : monthEndRaw
    const monthEndSunday = sundayOf(mondayOf(monthEnd))

    // Last calendar month
    const prevMonthEnd = new Date(d.getFullYear(), d.getMonth(), 0)
    const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)

    return [
      { label: 'This week',     start: fmt(thisMonday),      end: fmt(sundayOf(thisMonday)) },
      { label: 'Last week',     start: fmt(lastMonday),       end: fmt(sundayOf(lastMonday)) },
      { label: 'Last 2 weeks',  start: fmt(twoWeeksAgo),      end: fmt(sundayOf(thisMonday)) },
      { label: 'Last 3 weeks',  start: fmt(threeWeeksAgo),    end: fmt(sundayOf(thisMonday)) },
      { label: 'This month',    start: fmt(monthStartMonday), end: fmt(monthEndSunday) },
      { label: 'Last month',    start: fmt(mondayOf(prevMonthStart)), end: fmt(sundayOf(mondayOf(prevMonthEnd))) },
    ]
  }, [today])

  // Load meals for the date range directly from Supabase
  useEffect(() => {
    if (!isAuthed) return
    let cancelled = false

    const startISO = new Date(`${startDate}T00:00:00`).toISOString()
    const endISO   = new Date(`${endDate}T23:59:59.999`).toISOString()

    supabase
      .from('meals')
      .select('*, meal_items(*)')
      .gte('consumed_at', startISO)
      .lte('consumed_at', endISO)
      .order('consumed_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return

        if (!error && data) {
          type Row = Omit<MealWithItems, 'items'> & { meal_items: MealWithItems['items'] }
          setRangeMeals(
            (data as Row[]).map(m => ({
              ...m,
              items: [...(m.meal_items ?? [])].sort((a, b) => a.position - b.position),
            }))
          )
        } else {
          setRangeMeals([])
        }

        setLoadedRangeKey(currentRangeKey)
      })

    return () => {
      cancelled = true
    }
  }, [startDate, endDate, currentRangeKey, isAuthed])

  // Group meals into weeks (Mon–Sun)
  const weekGroups = useMemo((): WeekGroup[] => {
    let ws = getWeekBounds(startDate).start
    const rangeEnd = getWeekBounds(endDate).end
    const groups: WeekGroup[] = []

    while (ws <= rangeEnd) {
      const days: { date: string; meals: MealWithItems[] }[] = []
      const d = new Date(`${ws}T12:00:00`)
      for (let i = 0; i < 7; i++) {
        const dateStr = d.toLocaleDateString('sv')
        days.push({
          date: dateStr,
          meals: rangeMeals.filter(m => new Date(m.consumed_at).toLocaleDateString('sv') === dateStr),
        })
        d.setDate(d.getDate() + 1)
      }
      groups.push({ weekStart: ws, weekRangeLabel: buildWeekRangeLabel(days), weekLabel: buildWeekLabel(ws), days })

      // Advance to next Monday
      const nextWeek = new Date(`${ws}T12:00:00`)
      nextWeek.setDate(nextWeek.getDate() + 7)
      ws = nextWeek.toLocaleDateString('sv')
    }

    return groups
  }, [rangeMeals, startDate, endDate])

  const theme = useMemo(() => buildTheme(voice, accent), [voice, accent])

  const totalMeals = weekGroups.reduce((s, g) => s + g.days.reduce((sd, d) => sd + d.meals.length, 0), 0)
  const totalItems = weekGroups.reduce((s, g) => s + g.days.reduce((sd, d) => sd + d.meals.flatMap(m => m.items).length, 0), 0)
  const weekCount  = weekGroups.length

  // Cover: full-range date label + first week's tile strip
  const coverDateRange = useMemo(() => {
    if (weekGroups.length === 0) return ''
    if (weekGroups.length === 1) return weekGroups[0].weekRangeLabel
    const first = new Date(`${weekGroups[0].days[0].date}T12:00:00`)
    const last  = new Date(`${weekGroups[weekGroups.length - 1].days[6].date}T12:00:00`)
    const opts = { month: 'long' as const, day: 'numeric' as const }
    return `${first.toLocaleDateString(undefined, opts)} – ${last.toLocaleDateString(undefined, { day: 'numeric', year: 'numeric' })}`
  }, [weekGroups])

  const coverLabel  = weekCount === 1 ? (weekGroups[0]?.weekLabel ?? '') : `${weekCount} Weeks`
  const totalPages  = 1 + weekCount   // cover + one archive per week

  function handlePrint() {
    window.print()
  }

  const printPages = weekGroups.length > 0 ? createPortal(
    <div id="pdf-print-root" className="pdf-print-root">
      <PDFCover
        theme={theme}
        tileMode={tileMode}
        weekLabel={coverLabel}
        dateRange={coverDateRange}
        mealCount={totalMeals}
        itemCount={totalItems}
        weekDays={weekGroups[0].days}
      />
      {weekGroups.map((group, idx) => (
        <PDFWeeklyArchive
          key={group.weekStart}
          theme={theme}
          tileMode={tileMode}
          weekDays={group.days}
          weekRangeLabel={group.weekRangeLabel}
          pageNumber={idx + 2}
          totalPages={totalPages}
        />
      ))}
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
            <button className="ei-pdf__print-btn" onClick={handlePrint} type="button">
              Print
            </button>
          </div>

          <div className="ei-pdf__body">
            {/* Date range picker */}
            <div className="ei-pdf__section">
              <div className="ei-pdf__section-label">Date range</div>
              <div className="ei-pdf__preset-row">
                {DATE_PRESETS.map((p) => {
                  const active = p.start === startDate && p.end === endDate
                  return (
                    <button
                      key={p.label}
                      type="button"
                      className={`ei-pdf__preset-btn${active ? ' ei-pdf__preset-btn--active' : ''}`}
                      style={active ? { borderColor: accent, background: `${accent}14`, color: accent } : {}}
                      onClick={() => { setStartDate(p.start); setEndDate(p.end) }}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
              <div className="ei-pdf__date-row">
                <label className="ei-pdf__date-label">
                  From
                  <input
                    type="date"
                    className="ei-pdf__date-input"
                    value={startDate}
                    max={endDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </label>
                <span className="ei-pdf__date-sep">—</span>
                <label className="ei-pdf__date-label">
                  To
                  <input
                    type="date"
                    className="ei-pdf__date-input"
                    value={endDate}
                    min={startDate}
                    max={today}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </label>
              </div>
              <div className="ei-pdf__range-stat">
                {loading
                  ? 'Loading…'
                  : `${weekCount} week${weekCount !== 1 ? 's' : ''} · ${totalMeals} meal${totalMeals !== 1 ? 's' : ''} · ${totalItems} items`
                }
              </div>
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
