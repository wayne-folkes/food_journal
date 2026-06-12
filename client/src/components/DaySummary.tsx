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
      <div className="day-summary__stats">
        <div className="day-summary__stat">
          <span className="day-summary__stat-value" data-meal-type="dinner">{meals.length}</span>
          <span className="day-summary__stat-label">Meals</span>
        </div>
        <div className="day-summary__stat">
          <span className="day-summary__stat-value" data-meal-type="lunch">{itemCount}</span>
          <span className="day-summary__stat-label">Items</span>
        </div>
        <div className="day-summary__stat">
          <span className="day-summary__stat-value" data-meal-type="breakfast">
            {showCal ? `${hasPartial ? '~' : ''}${totalCal.toLocaleString()}` : '—'}
          </span>
          <span className="day-summary__stat-label">{showCal ? '~kcal so far' : 'kcal'}</span>
        </div>
      </div>
    </div>
  )
}
