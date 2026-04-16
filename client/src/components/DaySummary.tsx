import type { MealWithItems } from '../types/database'

interface Props {
  meals: MealWithItems[]
}

function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
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
      {pluralize(meals.length, 'meal')} · {pluralize(itemCount, 'item')}
      {showCal && (
        <> · {hasPartial ? '~' : ''}{totalCal.toLocaleString()} cal</>
      )}
    </p>
  )
}
