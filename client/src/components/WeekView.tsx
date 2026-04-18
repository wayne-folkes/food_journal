import { useEffect, useMemo } from 'react'
import type { MealWithItems } from '@shared/types/database'
import { useEntriesStore, getWeekBounds } from '../lib/store'
import { EITile } from './EITile'

interface WeekViewProps {
  weekMeals: MealWithItems[]
  weekStart: string
  isLoading: boolean
  onNavigateToDay: (date: string) => void
}

function formatDayLetter(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })
}

function formatDayNum(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).getDate().toString()
}

function formatDayAbbrev(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toLocaleDateString('sv')
}

export function WeekView({ weekMeals, weekStart, isLoading, onNavigateToDay }: WeekViewProps) {
  const { loadPriorItems } = useEntriesStore()

  useEffect(() => {
    loadPriorItems(weekStart)
  }, [weekStart, loadPriorItems])

  const groupedByDate = useMemo(() => {
    const { start } = getWeekBounds(weekStart)
    const days: string[] = []
    const d = new Date(`${start}T12:00:00`)
    for (let i = 0; i < 7; i++) {
      days.push(d.toLocaleDateString('sv'))
      d.setDate(d.getDate() + 1)
    }
    const map = new Map<string, MealWithItems[]>()
    for (const day of days) map.set(day, [])
    for (const meal of weekMeals) {
      const date = new Date(meal.consumed_at).toLocaleDateString('sv')
      map.get(date)?.push(meal)
    }
    return days.map(date => ({ date, meals: map.get(date) ?? [] }))
  }, [weekMeals, weekStart])

  const totalMeals = weekMeals.length
  const totalItems = weekMeals.reduce((sum, m) => sum + m.items.length, 0)

  // Max meals in a day (for bar chart scaling)
  const maxMealsPerDay = Math.max(1, ...groupedByDate.map(d => d.meals.length))

  return (
    <div className={`ei-week${isLoading ? ' ei-week--loading' : ''}`} aria-busy={isLoading}>

      {/* Summary line */}
      <p className="ei-week__summary">
        <strong>{totalMeals}</strong> meal{totalMeals === 1 ? '' : 's'}, <strong>{totalItems}</strong> item{totalItems === 1 ? '' : 's'}
      </p>

      {/* Tonal bar chart */}
      <div className="ei-week__chart">
        {groupedByDate.map(({ date, meals }) => {
          const today = isToday(date)
          const barHeight = meals.length > 0 ? Math.max(12, (meals.length / maxMealsPerDay) * 100) : 4
          return (
            <button
              key={date}
              className={`ei-week__chart-col${today ? ' ei-week__chart-col--today' : ''}`}
              onClick={() => onNavigateToDay(date)}
              aria-label={`${formatDayAbbrev(date)}: ${meals.length} meals`}
            >
              <div className="ei-week__chart-bar-wrap">
                {meals.length > 0 ? (
                  <div
                    className="ei-week__chart-bar"
                    style={{ height: `${barHeight}%` }}
                  />
                ) : (
                  <div className="ei-week__chart-bar ei-week__chart-bar--empty" />
                )}
              </div>
              <span className={`ei-week__chart-label${today ? ' ei-week__chart-label--today' : ''}`}>
                {formatDayLetter(date)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Section kicker */}
      <div className="ei-section-kicker" style={{ margin: '0 16px' }}>
        <span className="ei-section-kicker__text">— The Days</span>
        <div className="ei-section-kicker__rule" />
      </div>

      {/* Day list */}
      <div className="ei-week__days">
        {groupedByDate.map(({ date, meals }) => {
          const today = isToday(date)
          const allItems = meals.flatMap(m => m.items)
          return (
            <button
              key={date}
              className={`ei-week__day-row${today ? ' ei-week__day-row--today' : ''}`}
              onClick={() => onNavigateToDay(date)}
            >
              <div className="ei-week__day-date">
                <span className="ei-week__day-abbrev">{formatDayAbbrev(date)}</span>
                <span className="ei-week__day-num">{formatDayNum(date)}</span>
              </div>
              <div className="ei-week__day-content">
                {meals.length === 0 ? (
                  <span className="ei-week__day-empty">Nothing logged.</span>
                ) : (
                  <>
                    <span className="ei-week__day-desc">
                      {meals.map(m => m.items.map(i => i.description).join(', ')).join(' · ')}
                    </span>
                    {allItems.length > 0 && (
                      <div className="ei-week__day-tiles">
                        {allItems.slice(0, 4).map((item, i) => (
                          <EITile key={i} name={item.description} size={22} />
                        ))}
                        {allItems.length > 4 && (
                          <span className="ei-week__day-more">+{allItems.length - 4}</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
