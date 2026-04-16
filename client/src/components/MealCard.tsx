import { useState, useRef } from 'react'
import type { MealItem, MealWithItems } from '../types/database'
import { MEAL_TYPE_LABELS } from '../lib/mealType'

interface Props {
  meal: MealWithItems
  onEdit: (meal: MealWithItems) => void
  onDelete: (id: string) => void
  onDuplicate: (meal: MealWithItems) => void
  onUpdateCalories: (itemId: string, calories: number | null) => Promise<void>
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

interface CalBadgeProps {
  item: MealItem
  onUpdateCalories: (itemId: string, calories: number | null) => Promise<void>
}

function CalBadge({ item, onUpdateCalories }: CalBadgeProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<string>(item.calories != null ? String(item.calories) : '')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setValue(item.calories != null ? String(item.calories) : '')
    setEditing(true)
    // Focus on next tick after render
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commit() {
    setEditing(false)
    const trimmed = value.trim()
    const parsed = trimmed === '' ? null : parseInt(trimmed, 10)
    const newCal = parsed != null && !isNaN(parsed) ? Math.min(9999, Math.max(0, parsed)) : null
    if (newCal !== item.calories) {
      onUpdateCalories(item.id, newCal)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      commit()
    } else if (e.key === 'Escape') {
      setEditing(false)
      setValue(item.calories != null ? String(item.calories) : '')
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="meal-card__cal-input"
        type="number"
        min="0"
        max="9999"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder="cal"
        aria-label="Calories"
      />
    )
  }

  if (item.calories != null) {
    return (
      <button
        className="meal-card__cal-badge meal-card__cal-badge--set"
        onClick={startEditing}
        type="button"
        aria-label={`${item.calories} calories, tap to edit`}
      >
        {item.calories} cal
      </button>
    )
  }

  return (
    <button
      className="meal-card__cal-badge meal-card__cal-badge--empty"
      onClick={startEditing}
      type="button"
      aria-label="Add calories"
    >
      + cal
    </button>
  )
}

export function MealCard({ meal, onEdit, onDelete, onDuplicate, onUpdateCalories }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Compute calorie subtotal
  const itemsWithCal = meal.items.filter((i) => i.calories != null)
  const totalCal = itemsWithCal.reduce((sum, i) => sum + (i.calories ?? 0), 0)
  const hasPartial = itemsWithCal.length > 0 && itemsWithCal.length < meal.items.length
  const showSubtotal = itemsWithCal.length > 0

  return (
    <article className={`meal-card meal-card--${meal.meal_type}`}>
      <div className="meal-card__accent" aria-hidden="true" />

      <div className="meal-card__body">
        <header className="meal-card__header">
          <span className="meal-card__type">{MEAL_TYPE_LABELS[meal.meal_type]}</span>
          <span className="meal-card__dot" aria-hidden="true">·</span>
          <time className="meal-card__time" dateTime={meal.consumed_at}>
            {formatTime(meal.consumed_at)}
          </time>

          <div className="meal-card__menu-wrap">
            <button
              className="meal-card__menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Meal options"
              aria-expanded={menuOpen}
            >
              ···
            </button>
            {menuOpen && (
              <>
                <div className="meal-card__menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="meal-card__menu">
                  <button
                    className="meal-card__menu-item"
                    onClick={() => { setMenuOpen(false); onEdit(meal) }}
                  >
                    Edit
                  </button>
                  <button
                    className="meal-card__menu-item"
                    onClick={() => { setMenuOpen(false); onDuplicate(meal) }}
                  >
                    Log again
                  </button>
                  <button
                    className="meal-card__menu-item meal-card__menu-item--danger"
                    onClick={() => { setMenuOpen(false); onDelete(meal.id) }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <ul className="meal-card__items">
          {meal.items.map((item) => (
            <li key={item.id} className="meal-card__item">
              <span className="meal-card__item-desc">{item.description}</span>
              <CalBadge item={item} onUpdateCalories={onUpdateCalories} />
            </li>
          ))}
        </ul>

        {showSubtotal && (
          <p className="meal-card__cal-total">
            {hasPartial ? '~' : ''}{totalCal.toLocaleString()} cal
          </p>
        )}
      </div>
    </article>
  )
}
