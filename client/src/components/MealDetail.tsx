import type { MealWithItems } from '@shared/types/database'
import { MEAL_TYPE_LABELS } from '../lib/mealType'
import { EITile } from './EITile'

interface Props {
  meal: MealWithItems
  onClose: () => void
  onEdit: (meal: MealWithItems) => void
  onDelete: (id: string) => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function MealDetail({ meal, onClose, onEdit, onDelete }: Props) {
  const itemsWithCal = meal.items.filter(i => i.calories != null)
  const totalCal = itemsWithCal.reduce((sum, i) => sum + (i.calories ?? 0), 0)
  const hasPartial = itemsWithCal.length > 0 && itemsWithCal.length < meal.items.length

  return (
    <div className="ei-compose-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ei-meal-detail">
        {/* Handle bar */}
        <div className="ei-meal-detail__handle" />

        {/* Kicker */}
        <div className="ei-meal-detail__kicker">
          <span className="ei-meal-detail__type">— {MEAL_TYPE_LABELS[meal.meal_type]}</span>
          <div className="ei-meal-detail__kicker-rule" />
          <time className="ei-meal-detail__time" dateTime={meal.consumed_at}>
            {formatTime(meal.consumed_at)}
          </time>
        </div>

        {/* Date */}
        <p className="ei-meal-detail__date">{formatDate(meal.consumed_at)}</p>

        {/* Item list */}
        <ul className="ei-meal-detail__items">
          {meal.items.map(item => (
            <li key={item.id} className="ei-meal-detail__item">
              <EITile name={item.description} size={36} />
              <div className="ei-meal-detail__item-body">
                <span className="ei-meal-detail__item-desc">{item.description}</span>
                {item.calories != null && (
                  <span className="ei-meal-detail__item-cal">{item.calories} cal</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Total */}
        {itemsWithCal.length > 0 && (
          <div className="ei-meal-detail__total">
            <span className="ei-meal-detail__total-label">Total</span>
            <span className="ei-meal-detail__total-value">
              {hasPartial ? '~' : ''}{totalCal.toLocaleString()} kcal
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="ei-meal-detail__actions">
          <button
            className="ei-meal-detail__action-btn ei-meal-detail__action-btn--edit"
            onClick={() => { onClose(); onEdit(meal) }}
            type="button"
          >
            Edit meal
          </button>
          <button
            className="ei-meal-detail__action-btn ei-meal-detail__action-btn--delete"
            onClick={() => { onClose(); onDelete(meal.id) }}
            type="button"
          >
            Delete
          </button>
        </div>

        {/* Close */}
        <button className="ei-meal-detail__close" onClick={onClose} type="button" aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  )
}
