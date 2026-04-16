import type { MealWithItems } from '../types/database'
import { MealCard } from './MealCard'

interface Props {
  meals: MealWithItems[]
  isLoading: boolean
  selectedDate: string
  onEdit: (meal: MealWithItems) => void
  onDelete: (id: string) => void
  onDuplicate: (meal: MealWithItems) => void
  onUpdateCalories: (itemId: string, calories: number | null) => Promise<void>
}

function LoadingSkeleton() {
  return (
    <section className="meal-log meal-log--skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-pulse skeleton-pulse--time" />
          <div className="skeleton-pulse skeleton-pulse--desc" />
        </div>
      ))}
    </section>
  )
}

function formatDateHeading(dateStr: string): string {
  const today = new Date().toLocaleDateString('sv')
  if (dateStr === today) return "Today's Log"
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function MealLog({ meals, isLoading, selectedDate, onEdit, onDelete, onDuplicate, onUpdateCalories }: Props) {
  if (isLoading) return <LoadingSkeleton />

  const sorted = [...meals].sort(
    (a, b) => new Date(a.consumed_at).getTime() - new Date(b.consumed_at).getTime()
  )

  return (
    <section className="meal-log">
      <h2 className="meal-log__heading">{formatDateHeading(selectedDate)}</h2>

      {sorted.length === 0 ? (
        <p className="meal-log__empty">Nothing logged yet.</p>
      ) : (
        sorted.map((meal) => (
          <MealCard key={meal.id} meal={meal} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} onUpdateCalories={onUpdateCalories} />
        ))
      )}
    </section>
  )
}
