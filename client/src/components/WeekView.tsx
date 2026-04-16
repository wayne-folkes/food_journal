import { useEffect, useState, useMemo } from 'react'
import type { MealWithItems, MealType } from '../types/database'
import { useEntriesStore, getWeekBounds } from '../lib/store'
import { MEAL_TYPE_LABELS } from '../lib/mealType'

interface WeekViewProps {
  weekMeals: MealWithItems[]
  weekStart: string        // YYYY-MM-DD, always a Monday
  isLoading: boolean
  onNavigateToDay: (date: string) => void
}

const PATTERN_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short' })  // "Mon", "Tue"
}

function formatDayHeading(dateStr: string): string {
  const today = new Date().toLocaleDateString('sv')
  const d = new Date(`${dateStr}T12:00:00`)
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' })
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return dateStr === today ? `Today · ${date}` : `${weekday} · ${date}`
}

export function WeekView({ weekMeals, weekStart, isLoading, onNavigateToDay }: WeekViewProps) {
  const [priorItems, setPriorItems] = useState<Set<string>>(new Set())
  const { loadPriorItems } = useEntriesStore()

  useEffect(() => {
    loadPriorItems(weekStart).then(setPriorItems)
  }, [weekStart])

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

  const topItems = useMemo(() => {
    const counts = new Map<string, { display: string; count: number }>()
    for (const meal of weekMeals) {
      for (const item of meal.items) {
        const key = item.description.toLowerCase()
        const existing = counts.get(key)
        if (existing) existing.count++
        else counts.set(key, { display: item.description, count: 1 })
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5)
  }, [weekMeals])

  const newItems = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const meal of weekMeals) {
      for (const item of meal.items) {
        const key = item.description.toLowerCase()
        if (!seen.has(key) && !priorItems.has(key)) {
          seen.add(key)
          result.push(item.description)
        }
      }
    }
    return result
  }, [weekMeals, priorItems])

  const totalItems = useMemo(() =>
    weekMeals.reduce((sum, m) => sum + m.items.length, 0),
  [weekMeals])

  const mealPattern = useMemo(() =>
    groupedByDate.map(({ date, meals }) => ({
      date,
      types: PATTERN_TYPES.map(t => meals.some(m => m.meal_type === t)),
    }))
  , [groupedByDate])

  if (isLoading) return <div className="week-view week-view--loading"><span className="skeleton-line" /></div>

  return (
    <div className="week-view">

      {/* ── Stats row ── */}
      <div className="week-stats">

        {/* Total items */}
        <div className="week-stat-card">
          <span className="week-stat-card__value">{totalItems}</span>
          <span className="week-stat-card__label">items logged</span>
        </div>

        {/* Most consumed */}
        <div className="week-stat-card week-stat-card--wide">
          <span className="week-stat-card__label">Most logged</span>
          {topItems.length === 0 ? (
            <p className="week-empty-hint">No meals this week</p>
          ) : (
            <ol className="week-top-items">
              {topItems.map(({ display, count }) => (
                <li key={display} className="week-top-items__row">
                  <span className="week-top-items__name">{display}</span>
                  <span className="week-top-items__count">×{count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* New items */}
        <div className="week-stat-card week-stat-card--wide">
          <span className="week-stat-card__label">New this week</span>
          {newItems.length === 0 ? (
            <p className="week-empty-hint">No new foods</p>
          ) : (
            <ul className="week-new-items">
              {newItems.map(item => (
                <li key={item} className="week-new-items__chip">{item}</li>
              ))}
            </ul>
          )}
        </div>

      </div>

      {/* ── Meal pattern grid ── */}
      <div className="meal-pattern">
        <div className="meal-pattern__legend">
          {PATTERN_TYPES.map(t => (
            <span key={t} className="meal-pattern__legend-label">{MEAL_TYPE_LABELS[t][0]}</span>
          ))}
        </div>
        {mealPattern.map(({ date, types }) => {
          const label = formatDayLabel(date)
          return (
            <div key={date} className="meal-pattern__row">
              <span className="meal-pattern__day">{label}</span>
              {types.map((filled, i) => (
                <span
                  key={i}
                  className={`meal-pattern__dot meal-pattern__dot--${PATTERN_TYPES[i]}${filled ? ' meal-pattern__dot--filled' : ''}`}
                  title={filled ? MEAL_TYPE_LABELS[PATTERN_TYPES[i]] : ''}
                />
              ))}
            </div>
          )
        })}
      </div>

      {/* ── Day-by-day list ── */}
      <div className="week-days">
        {groupedByDate.map(({ date, meals }) => (
          <div key={date} className="week-day-group">
            <button
              className="week-day-group__header"
              onClick={() => onNavigateToDay(date)}
              aria-label={`Go to ${formatDayLabel(date)}`}
            >
              {formatDayHeading(date)}
            </button>
            {meals.length === 0 ? (
              <p className="week-day-group__empty">No meals logged</p>
            ) : (
              <ul className="week-day-group__meals">
                {meals.map(meal => (
                  <li key={meal.id} className={`week-meal-row week-meal-row--${meal.meal_type}`}>
                    <span className="week-meal-row__type">{MEAL_TYPE_LABELS[meal.meal_type]}</span>
                    <span className="week-meal-row__items">
                      {meal.items.map(i => i.description).join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
