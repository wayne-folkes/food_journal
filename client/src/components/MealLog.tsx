import { useMemo } from 'react'
import type { MealWithItems } from '@shared/types/database'
import { MealCard } from './MealCard'

interface Props {
  meals: MealWithItems[]
  isLoading: boolean
  selectedDate: string
  onEdit: (meal: MealWithItems) => void
  onDelete: (id: string) => void
  onDuplicate: (meal: MealWithItems) => void
  onUpdateCalories: (itemId: string, calories: number | null) => Promise<void>
  onEstimateCalories?: (meal: MealWithItems) => Promise<void>
}

/** Group meals logged within `windowMinutes` of each other into clusters. */
function groupMealsByTime(meals: MealWithItems[], windowMinutes = 10): MealWithItems[][] {
  if (meals.length === 0) return []
  const groups: MealWithItems[][] = []
  let current: MealWithItems[] = [meals[0]]

  for (let i = 1; i < meals.length; i++) {
    const prev = new Date(meals[i - 1].consumed_at).getTime()
    const curr = new Date(meals[i].consumed_at).getTime()
    const diffMin = (curr - prev) / 60_000
    if (diffMin <= windowMinutes) {
      current.push(meals[i])
    } else {
      groups.push(current)
      current = [meals[i]]
    }
  }
  groups.push(current)
  return groups
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

const cardProps = (
  meal: MealWithItems,
  handlers: Pick<Props, 'onEdit' | 'onDelete' | 'onDuplicate' | 'onUpdateCalories' | 'onEstimateCalories'>
) => ({
  meal,
  onEdit: handlers.onEdit,
  onDelete: handlers.onDelete,
  onDuplicate: handlers.onDuplicate,
  onUpdateCalories: handlers.onUpdateCalories,
  onEstimateCalories: handlers.onEstimateCalories,
})

export function MealLog({ meals, isLoading, selectedDate, onEdit, onDelete, onDuplicate, onUpdateCalories, onEstimateCalories }: Props) {
  const handlers = { onEdit, onDelete, onDuplicate, onUpdateCalories, onEstimateCalories }

  const groups = useMemo(() => {
    const sorted = [...meals].sort(
      (a, b) => new Date(a.consumed_at).getTime() - new Date(b.consumed_at).getTime()
    )
    return groupMealsByTime(sorted)
  }, [meals])

  if (isLoading) return <LoadingSkeleton />

  return (
    <section className="meal-log">
      <h2 className="meal-log__heading">{formatDateHeading(selectedDate)}</h2>

      {groups.length === 0 ? (
        <p className="meal-log__empty">
          Your day is a blank canvas.<br />Log your first meal above.
        </p>
      ) : (
        groups.map((group) =>
          group.length === 1 ? (
            <MealCard key={group[0].id} {...cardProps(group[0], handlers)} />
          ) : (
            <div key={group[0].id} className="meal-group">
              {group.map((meal, idx) => (
                <MealCard
                  key={meal.id}
                  {...cardProps(meal, handlers)}
                  groupPosition={idx === 0 ? 'first' : idx === group.length - 1 ? 'last' : 'middle'}
                />
              ))}
            </div>
          )
        )
      )}
    </section>
  )
}
