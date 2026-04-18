import type { MealWithItems } from '@shared/types/database'

interface Props {
  meals: MealWithItems[]
}

export function DaySummary({ meals }: Props) {
  if (meals.length === 0) return null

  const allItems = meals.flatMap((m) => m.items)
  const itemCount = allItems.length
  const itemsWithCal = allItems.filter((i) => i.calories != null)
  const totalCal = itemsWithCal.reduce((sum, i) => sum + (i.calories ?? 0), 0)
  const hasPartial = itemsWithCal.length > 0 && itemsWithCal.length < itemCount
  const showCal = itemsWithCal.length > 0

  return (
    <div className="day-summary">
      <span className="day-summary__kicker">— Today</span>
      <p className="day-summary__headline">
        {meals.length} meal{meals.length === 1 ? '' : 's'}, {itemCount} item{itemCount === 1 ? '' : 's'}
        <span className="day-summary__period">.</span>
      </p>
      <div className="day-summary__stats">
        <div className="day-summary__stat">
          <span className="day-summary__stat-value">{meals.length}</span>
          <span className="day-summary__stat-label">Meals</span>
        </div>
        {showCal && (
          <div className="day-summary__stat day-summary__stat--muted">
            <span className="day-summary__stat-value">
              {hasPartial ? '~' : ''}{totalCal.toLocaleString()} kcal
            </span>
            <span className="day-summary__stat-label">Calories</span>
          </div>
        )}
      </div>
    </div>
  )
}
