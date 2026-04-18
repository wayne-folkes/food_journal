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
    <p className="day-summary">
      <strong>{meals.length}</strong> meal{meals.length === 1 ? '' : 's'}
      {' · '}
      <strong>{itemCount}</strong> item{itemCount === 1 ? '' : 's'}
      {showCal && (
        <> · {hasPartial ? '~' : ''}<strong>{totalCal.toLocaleString()}</strong> cal</>
      )}
    </p>
  )
}
