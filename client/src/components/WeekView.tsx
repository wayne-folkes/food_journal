import { useMemo } from 'react'
import type { MealWithItems } from '@shared/types/database'
import { getWeekBounds, todayString } from '../lib/store'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../lib/mealType'
import { useTween } from '../lib/useTween'

interface WeekViewProps {
  weekMeals: MealWithItems[]
  weekStart: string
  isLoading: boolean
  onNavigateToDay: (date: string) => void
}

const localDate = (iso: string) => new Date(iso).toLocaleDateString('sv')
const at = (dateStr: string) => new Date(`${dateStr}T12:00:00`)
const fmtShort = (dateStr: string) => at(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

/** The busiest-day floor keeps a quiet week from looking full. */
const MIN_SCALE_ITEMS = 8

/** Seven glass tubes, each filled with that day's meals in meal-type colors. */
export function WeekView({ weekMeals, weekStart, isLoading, onNavigateToDay }: WeekViewProps) {
  const days = useMemo(() => {
    const { start } = getWeekBounds(weekStart)
    const byDate = new Map<string, MealWithItems[]>()
    const list: string[] = []
    const d = at(start)
    for (let i = 0; i < 7; i++) {
      const key = d.toLocaleDateString('sv')
      list.push(key)
      byDate.set(key, [])
      d.setDate(d.getDate() + 1)
    }
    for (const meal of weekMeals) byDate.get(localDate(meal.consumed_at))?.push(meal)
    return list.map((date) => {
      const meals = (byDate.get(date) ?? []).sort(
        (a, b) => new Date(a.consumed_at).getTime() - new Date(b.consumed_at).getTime(),
      )
      return { date, meals, count: meals.reduce((n, m) => n + m.items.length, 0) }
    })
  }, [weekMeals, weekStart])

  const today = todayString()
  const max = Math.max(MIN_SCALE_ITEMS, ...days.map((d) => d.count))
  const totalItems = days.reduce((n, d) => n + d.count, 0)
  const totalMeals = days.reduce((n, d) => n + d.meals.length, 0)
  const itemsShown = useTween(totalItems, 900)

  return (
    <div className="gl-wk" aria-busy={isLoading}>
      <span className="gl-kick">
        <i />
        {fmtShort(days[0].date)} – {fmtShort(days[6].date)}
      </span>
      <h1 className="gl-h1">
        {days.some((d) => d.date === today) ? 'This week' : `Week of ${fmtShort(days[0].date)}`}
      </h1>
      <span className="gl-sub">
        <b>{Math.round(itemsShown)}</b> {totalItems === 1 ? 'item' : 'items'} across <b>{totalMeals}</b>{' '}
        {totalMeals === 1 ? 'meal' : 'meals'}
      </span>

      <div className={`gl-tubes${isLoading ? ' gl-tubes--loading' : ''}`}>
        {days.map(({ date, meals, count }, i) => {
          const d = at(date)
          const weekday = d.toLocaleDateString(undefined, { weekday: 'short' })
          const narrow = d.toLocaleDateString(undefined, { weekday: 'narrow' })
          return (
            <button
              key={date}
              className={`gl-tc${date === today ? ' gl-tc--today' : ''}`}
              onClick={() => onNavigateToDay(date)}
              aria-label={`${weekday} ${d.getDate()}: ${meals.length} meals, ${count} items`}
            >
              <div className="gl-tube gl-glass">
                {count > 0 && (
                  <span className="gl-tn" style={{ animationDelay: `${0.6 + i * 0.08}s` }}>{count}</span>
                )}
                <div
                  className="gl-fill"
                  style={{
                    '--ratio': count / max,
                    height: count ? undefined : 0,
                    animationDelay: `${0.25 + i * 0.08}s`,
                  } as React.CSSProperties}
                >
                  {meals.map((m) => (
                    <div
                      key={m.id}
                      style={{ flex: m.items.length, background: `var(--meal-${m.meal_type})` }}
                    />
                  ))}
                </div>
              </div>
              <span className="gl-tl">
                <span className="gl-tl__long">{weekday}</span>
                <span className="gl-tl__short">{narrow}</span> {d.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      <div className="gl-legend">
        {MEAL_TYPE_ORDER.map((t) => (
          <span key={t}>
            <i style={{ background: `var(--meal-${t})` }} />
            {MEAL_TYPE_LABELS[t]}
          </span>
        ))}
      </div>
    </div>
  )
}
