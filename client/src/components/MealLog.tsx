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
  onSelect?: (meal: MealWithItems) => void
  onTryExample?: (sentence: string) => void
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
  handlers: Pick<Props, 'onEdit' | 'onDelete' | 'onDuplicate' | 'onUpdateCalories' | 'onEstimateCalories' | 'onSelect'>
) => ({
  meal,
  onEdit: handlers.onEdit,
  onDelete: handlers.onDelete,
  onDuplicate: handlers.onDuplicate,
  onUpdateCalories: handlers.onUpdateCalories,
  onEstimateCalories: handlers.onEstimateCalories,
  onSelect: handlers.onSelect,
})

export function MealLog({ meals, isLoading, selectedDate, onEdit, onDelete, onDuplicate, onUpdateCalories, onEstimateCalories, onSelect, onTryExample }: Props) {
  const handlers = { onEdit, onDelete, onDuplicate, onUpdateCalories, onEstimateCalories, onSelect }

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
        <div className="ei-empty">
          <div className="ei-empty__ornament">
            <div className="ei-empty__glyph" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 18 18" fill="none">
                <path d="M2 13.5V16h2.5L13.07 7.43 10.57 4.93 2 13.5z" fill="currentColor"/>
                <path d="M15.41 4.59a1 1 0 000-1.42l-1.58-1.58a1 1 0 00-1.42 0L11 3l2.5 2.5 1.91-1.91z" fill="currentColor"/>
              </svg>
            </div>
            <h2 className="ei-empty__title">Nothing logged yet.</h2>
            <p className="ei-empty__body">Type what you ate in the bar above — a sentence is enough.</p>
          </div>
          <div className="ei-empty__try">
            <span className="ei-empty__kicker">— Try one</span>
            <div className="ei-empty__try-card">
              {[
                'Oats, honey, and a cortado',
                'Chicken caesar, croutons, water',
                'An apple and some almonds',
              ].map((sentence, i) => (
                <button key={i} className="ei-empty__try-row" type="button" onClick={() => onTryExample?.(sentence)}>
                  <span className="ei-empty__try-num">{i + 1}.</span>
                  <span className="ei-empty__try-text">{sentence}</span>
                  <span className="ei-empty__try-chevron" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        (() => {
          const firstCardId = groups[0][0].id
          return groups.map((group) =>
            group.length === 1 ? (
              <MealCard key={group[0].id} {...cardProps(group[0], handlers)} isFirst={group[0].id === firstCardId} />
            ) : (
              <div key={group[0].id} className="meal-group">
                {group.map((meal, idx) => (
                  <MealCard
                    key={meal.id}
                    {...cardProps(meal, handlers)}
                    isFirst={meal.id === firstCardId}
                    groupPosition={idx === 0 ? 'first' : idx === group.length - 1 ? 'last' : 'middle'}
                  />
                ))}
              </div>
            )
          )
        })()
      )}
    </section>
  )
}
