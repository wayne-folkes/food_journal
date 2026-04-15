import { useState } from 'react'
import type { MealWithItems } from '../types/database'
import { MEAL_TYPE_LABELS } from '../lib/mealType'

interface Props {
  meal: MealWithItems
  onEdit: (meal: MealWithItems) => void
  onDelete: (id: string) => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function MealCard({ meal, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

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
            <li key={item.id} className="meal-card__item">{item.description}</li>
          ))}
        </ul>
      </div>
    </article>
  )
}
