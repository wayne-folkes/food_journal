import type { CSSProperties, ReactNode } from 'react'
import type { MealWithItems } from '@shared/types/database'
import type { PdfTheme, PdfTileMode } from '../lib/pdfThemes'
import { getTileSpec } from '../lib/tileMap'
import { EITile } from './EITile'
import { MEAL_TYPE_LABELS } from '../lib/mealType'

export const PAGE_W = 816
export const PAGE_H = 1056

interface ThemeProps { theme: PdfTheme; tileMode: PdfTileMode }

/* ── helpers ── */

function Kicker({ children, color, theme }: { children: ReactNode; color?: string; theme: PdfTheme }) {
  return (
    <span style={{
      fontFamily: theme.sans, fontSize: 9, letterSpacing: 2.4,
      color: color ?? theme.mute, textTransform: 'uppercase', fontWeight: 600,
    }}>{children}</span>
  )
}

/**
 * ThemeTile renders a coloured ingredient tile.
 *
 * When `fill` is true the tile is meant to fill its parent container entirely —
 * we wrap EITile (which only accepts a numeric `size`) in an overflow:hidden div
 * so the tile expands to cover the cell without the parent needing to know about
 * EITile's fixed-pixel sizing. When `fill` is false we pass `size` directly as
 * a number to EITile.
 */
function ThemeTile({
  name,
  size,
  fill,
  tileMode,
}: {
  name: string
  size?: number
  fill?: boolean
  tileMode: PdfTileMode
}) {
  const spec = getTileSpec(name)
  const adjusted =
    tileMode === 'mono' ? { ...spec, hue: 0, sat: 6 }
    : tileMode === 'solid' ? { ...spec, pattern: 'solid' as const }
    : spec

  if (fill) {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <EITile tile={adjusted} name={name} size={30} />
      </div>
    )
  }

  return <EITile tile={adjusted} size={size ?? 30} name={name} />
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatDayDate(dateStr: string) {
  // dateStr is YYYY-MM-DD
  const d = new Date(`${dateStr}T12:00:00`)
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'long' }),
    monthDay: d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }),
    abbrev: d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
    num: d.getDate().toString(),
  }
}

/* ── PDFPage wrapper ── */

interface PDFPageProps {
  theme: PdfTheme
  children: ReactNode
  pageNumber?: number
  totalPages?: number
  runningHead?: string
  style?: CSSProperties
}

export function PDFPage({ theme: t, children, pageNumber, totalPages, runningHead, style }: PDFPageProps) {
  return (
    <div className="pdf-page" style={{
      width: PAGE_W, height: PAGE_H, background: t.pageBg,
      position: 'relative', overflow: 'hidden',
      fontFamily: t.sans, color: t.ink,
      flexShrink: 0,
      ...style,
    }}>
      {runningHead && (
        <div style={{
          position: 'absolute', top: 48, left: 72, right: 72,
          display: 'flex', alignItems: 'baseline',
          borderBottom: `0.5px solid ${t.ter}`, paddingBottom: 10,
          fontFamily: t.sans, fontSize: 9, letterSpacing: 2,
          textTransform: 'uppercase', color: t.mute, fontWeight: 600,
        }}>
          <span style={{
            fontFamily: t.serif, fontSize: 12, fontStyle: 'italic',
            fontWeight: 600, color: t.accent, letterSpacing: 0,
            textTransform: 'none', marginRight: 10,
          }}>Food Journal</span>
          <span>{runningHead}</span>
          <div style={{ flex: 1 }} />
          {pageNumber && (
            <span style={{ fontFamily: t.body, fontStyle: 'italic', letterSpacing: 0, textTransform: 'none', fontSize: 11 }}>
              {pageNumber}{totalPages ? ` / ${totalPages}` : ''}
            </span>
          )}
        </div>
      )}
      {children}
      {pageNumber && (
        <div style={{
          position: 'absolute', bottom: 36, left: 72, right: 72,
          fontFamily: t.sans, fontSize: 9, letterSpacing: 2,
          color: t.mute, textTransform: 'uppercase',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Food Journal</span>
          <span style={{ fontFamily: t.body, fontStyle: 'italic', letterSpacing: 0, textTransform: 'none' }}>
            Exported {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  )
}

/* ── Cover page ── */

interface CoverProps extends ThemeProps {
  weekLabel: string      // e.g. "Week of Apr 13–19, 2026"
  dateRange: string      // e.g. "April 13–19 · 2026"
  mealCount: number
  itemCount: number
  weekDays: { date: string; meals: MealWithItems[] }[]
}

export function PDFCover({ theme: t, tileMode, weekLabel, dateRange, mealCount, itemCount, weekDays }: CoverProps) {
  return (
    <PDFPage theme={t} style={{ background: t.coverBg }}>
      {/* Masthead */}
      <div style={{
        position: 'absolute', top: 60, left: 72, right: 72,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: t.sans, fontSize: 9.5, letterSpacing: 3,
        color: t.mute, textTransform: 'uppercase', fontWeight: 600,
      }}>
        <span>{weekLabel}</span>
        <span>{dateRange}</span>
        <span>Private edition</span>
      </div>
      <div style={{ position: 'absolute', top: 82, left: 72, right: 72, borderTop: `1px solid ${t.ink}` }} />
      <div style={{ position: 'absolute', top: 86, left: 72, right: 72, borderTop: `0.5px solid ${t.ink}` }} />

      {/* Big title */}
      <div style={{ position: 'absolute', top: 130, left: 72, right: 72 }}>
        <h1 style={{
          fontFamily: t.serif, fontSize: 128, fontWeight: 700,
          letterSpacing: -4, lineHeight: 0.88, margin: 0, color: t.ink,
        }}>
          The<br />
          <span style={{ fontStyle: 'italic', color: t.accent }}>Food</span><br />
          Journal
        </h1>
      </div>

      {/* Byline */}
      <div style={{
        position: 'absolute', top: 620, left: 72, right: 72,
        fontFamily: t.body, fontSize: 18, fontStyle: 'italic',
        color: t.ink, lineHeight: 1.4, maxWidth: 480,
      }}>
        A week of meals, ingredients, and marginal notes.
        <div style={{
          marginTop: 10, fontFamily: t.sans, fontStyle: 'normal',
          fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: t.mute,
        }}>
          {dateRange}
        </div>
      </div>

      {/* Tonal week strip — each day column is a fixed-height container; tiles
          fill their cell via the `fill` prop which wraps EITile in an
          overflow:hidden div instead of passing a string "100%" to size. */}
      <div style={{
        position: 'absolute', bottom: 180, left: 72, right: 72, height: 56,
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
      }}>
        {weekDays.map((day, di) => {
          const allItems = day.meals.flatMap(m => m.items)
          return (
            <div key={di} style={{
              display: 'flex', flexDirection: 'column', gap: 2,
              opacity: allItems.length ? 1 : 0.3,
            }}>
              {allItems.length === 0
                ? <div style={{ height: 4, background: t.ter, marginTop: 'auto' }} />
                : allItems.slice(0, 4).map((item, i) => (
                    <div key={i} style={{ flex: 1, minHeight: 8, overflow: 'hidden' }}>
                      <ThemeTile name={item.description} fill tileMode={tileMode} />
                    </div>
                  ))
              }
            </div>
          )
        })}
      </div>

      {/* Weekday labels */}
      <div style={{
        position: 'absolute', bottom: 150, left: 72, right: 72,
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
      }}>
        {weekDays.map((day, i) => {
          const { abbrev } = formatDayDate(day.date)
          return (
            <div key={i} style={{
              fontFamily: t.sans, fontSize: 10, letterSpacing: 1.8,
              color: t.mute, textTransform: 'uppercase', fontWeight: 600,
            }}>{abbrev}</div>
          )
        })}
      </div>

      {/* Stats */}
      <div style={{
        position: 'absolute', bottom: 70, left: 72, right: 72,
        display: 'flex', gap: 40, alignItems: 'baseline',
        borderTop: `0.5px solid ${t.ter}`, paddingTop: 18,
      }}>
        {[
          { l: 'Meals', v: String(mealCount) },
          { l: 'Items', v: String(itemCount) },
          { l: 'Days', v: String(weekDays.filter(d => d.meals.length > 0).length) },
        ].map(s => (
          <div key={s.l}>
            <Kicker theme={t}>{s.l}</Kicker>
            <div style={{
              fontFamily: t.serif, fontSize: 32, fontWeight: 600,
              letterSpacing: -0.8, lineHeight: 1, marginTop: 4,
            }}>{s.v}</div>
          </div>
        ))}
      </div>
    </PDFPage>
  )
}

/* ── Weekly Archive page ── */

interface WeekDayCardProps {
  theme: PdfTheme
  tileMode: PdfTileMode
  date: string          // YYYY-MM-DD
  meals: MealWithItems[]
  isCurrent: boolean
}

function WeekDayCard({ theme: t, tileMode, date, meals, isCurrent }: WeekDayCardProps) {
  const { abbrev, num } = formatDayDate(date)
  const today = date === new Date().toLocaleDateString('sv')

  return (
    <div style={{
      padding: '14px 16px',
      background: t.pageBg,
      border: `0.5px solid ${(isCurrent || today) ? t.accent : t.sep}`,
      breakInside: 'avoid',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <Kicker theme={t} color={(isCurrent || today) ? t.accent : t.mute}>{abbrev}</Kicker>
        <div style={{ flex: 1 }} />
        <span style={{
          fontFamily: t.serif, fontSize: 22, fontWeight: 600,
          fontStyle: (isCurrent || today) ? 'italic' : 'normal',
          color: (isCurrent || today) ? t.accent : t.ink,
          letterSpacing: -0.5, lineHeight: 1,
        }}>{num}</span>
      </div>

      {meals.length === 0 ? (
        <div style={{
          fontFamily: t.body, fontSize: 12, fontStyle: 'italic',
          color: t.mute, lineHeight: 1.4,
        }}>Nothing logged.</div>
      ) : (
        meals.map((meal, i) => (
          <div key={meal.id} style={{
            padding: '6px 0',
            borderTop: i === 0 ? 'none' : `0.5px solid ${t.sep}`,
          }}>
            <span style={{
              fontFamily: t.sans, fontSize: 8.5, letterSpacing: 1.6,
              color: t.mute, textTransform: 'uppercase', fontWeight: 600,
            }}>
              {MEAL_TYPE_LABELS[meal.meal_type]} · {formatTime(meal.consumed_at)}
            </span>
            <div style={{
              fontFamily: t.body, fontSize: 12.5, fontStyle: 'italic',
              color: t.ink, lineHeight: 1.35, marginTop: 2,
            }}>
              {meal.items.map(item => item.description).join(', ')}
            </div>
            <div style={{ display: 'flex', gap: 2, marginTop: 4, flexWrap: 'wrap' }}>
              {meal.items.slice(0, 6).map((item, ti) => (
                <ThemeTile key={ti} name={item.description} size={12} tileMode={tileMode} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

interface WeeklyArchiveProps extends ThemeProps {
  weekDays: { date: string; meals: MealWithItems[] }[]
  weekRangeLabel: string  // e.g. "April 13–19"
  pageNumber: number
  totalPages: number
}

export function PDFWeeklyArchive({ theme: t, tileMode, weekDays, weekRangeLabel, pageNumber, totalPages }: WeeklyArchiveProps) {
  const mealCount = weekDays.reduce((s, d) => s + d.meals.length, 0)
  const itemCount = weekDays.reduce((s, d) => s + d.meals.flatMap(m => m.items).length, 0)
  const today = new Date().toLocaleDateString('sv')

  return (
    <PDFPage theme={t} pageNumber={pageNumber} totalPages={totalPages} runningHead={`The week · ${weekRangeLabel}`}>
      {/* Hero */}
      <div style={{ position: 'absolute', top: 100, left: 72, right: 72 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <Kicker theme={t}>{weekRangeLabel}</Kicker>
            <div style={{ fontFamily: t.body, fontSize: 14, color: t.mute, lineHeight: 1.4, marginTop: 4 }}>
              {mealCount} meal{mealCount !== 1 ? 's' : ''}, {itemCount} item{itemCount !== 1 ? 's' : ''}. Listed as logged.
            </div>
          </div>
        </div>
      </div>

      {/* 3×3 grid of day cards (7 days + 1 summary slot) */}
      <div style={{
        position: 'absolute', top: 190, left: 72, right: 72, bottom: 90,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 10,
        alignContent: 'start',
      }}>
        {weekDays.map((day) => (
          <WeekDayCard
            key={day.date}
            theme={t}
            tileMode={tileMode}
            date={day.date}
            meals={day.meals}
            isCurrent={day.date === today}
          />
        ))}
        {/* Summary slot (fills the 8th cell if 7 days) */}
        <div style={{
          padding: '14px 16px', background: t.coverBg,
          border: `0.5px solid ${t.sep}`,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <Kicker theme={t} color={t.accent}>— Week in review</Kicker>
          <div style={{ fontFamily: t.body, fontSize: 13, fontStyle: 'italic', color: t.mute, lineHeight: 1.4 }}>
            {mealCount} meals across {weekDays.filter(d => d.meals.length > 0).length} days.
          </div>
          <div style={{ flex: 1 }} />
          <div style={{
            fontFamily: t.sans, fontSize: 9, letterSpacing: 1.6,
            color: t.mute, textTransform: 'uppercase', fontWeight: 600,
            borderTop: `0.5px solid ${t.ter}`, paddingTop: 6,
          }}>
            Most logged · <span style={{ color: t.ink }}>{getMostLogged(weekDays)}</span>
          </div>
        </div>
      </div>
    </PDFPage>
  )
}

function getMostLogged(weekDays: { meals: MealWithItems[] }[]): string {
  const counts: Record<string, number> = {}
  for (const day of weekDays) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        const key = item.description.toLowerCase()
        counts[key] = (counts[key] ?? 0) + 1
      }
    }
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return top ? top[0] : '—'
}
