import type { MealWithItems } from '../types/database'

interface Props {
  meals: MealWithItems[]
}

function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function DaySummary({ meals }: Props) {
  if (meals.length === 0) return null

  const itemCount = meals.reduce((sum, m) => sum + m.items.length, 0)

  return (
    <p className="day-summary">
      {pluralize(meals.length, 'meal')} · {pluralize(itemCount, 'item')}
    </p>
  )
}
