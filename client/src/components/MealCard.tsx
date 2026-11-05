import { useState } from 'react'
import type { MealItem, MealWithItems } from '@shared/types/database'
import { MEAL_TYPE_LABELS } from '../lib/mealType'
import { useEntriesStore } from '../lib/store'
import { formatGrams, itemNeedsEstimate, sumNutrients } from '../lib/nutrients'
import { EITile } from './EITile'

interface Props {
  meal: MealWithItems
  onEdit: (meal: MealWithItems) => void
  onDelete: (id: string) => void
  onDuplicate: (meal: MealWithItems) => void
  onUpdateCalories: (itemId: string, calories: number | null) => Promise<void>
  onEstimateCalories?: (meal: MealWithItems) => Promise<void>
  onSelect?: (meal: MealWithItems) => void
  /** `landing`: item rows stay hidden while bubbles fly in. `enter`: arrived from elsewhere. */
  fx?: 'landing' | 'enter' | null
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** "12 g protein · 3 g fiber" — only the parts that exist; '' when neither. */
function itemNutrientLine(item: MealItem): string {
  const parts: string[] = []
  if (item.protein_g != null) parts.push(`${formatGrams(item.protein_g)} protein`)
  if (item.fiber_g != null) parts.push(`${formatGrams(item.fiber_g)} fiber`)
  return parts.join(' · ')
}

interface CalBadgeProps {
  item: MealItem
  onUpdateCalories: (itemId: string, calories: number | null) => Promise<void>
}

function CalBadge({ item, onUpdateCalories }: CalBadgeProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<string>(item.calories != null ? String(item.calories) : '')

  function startEditing() {
    setValue(item.calories != null ? String(item.calories) : '')
    setEditing(true)
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
        autoFocus
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

export function MealCard({ meal, onEdit, onDelete, onDuplicate, onUpdateCalories, onEstimateCalories, onSelect, fx }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const isAuthed = useEntriesStore((s) => s.isAuthed)

  const totals = sumNutrients(meal.items)
  const hasAnyCal = meal.items.some((i) => i.calories != null)
  const hasAnyProtein = meal.items.some((i) => i.protein_g != null)
  const hasAnyFiber = meal.items.some((i) => i.fiber_g != null)
  const showEstimateBtn = isAuthed && meal.items.some(itemNeedsEstimate) && onEstimateCalories != null

  async function handleEstimate() {
    if (!onEstimateCalories) return
    setEstimating(true)
    try {
      await onEstimateCalories(meal)
    } finally {
      setEstimating(false)
    }
  }

  const classes = [
    'meal-card',
    'gl-glass',
    menuOpen && 'meal-card--menu-open',
    fx === 'landing' && 'fj-landing',
    fx === 'enter' && 'fj-enter',
  ].filter(Boolean).join(' ')

  return (
    <article
      className={classes}
      data-meal={meal.id}
      data-meal-type={meal.meal_type}
      style={{ '--mc': `var(--meal-${meal.meal_type})` } as React.CSSProperties}
    >
      <div className="meal-card__glow" aria-hidden="true" />

      {/* Header */}
      <div className="meal-card__head">
        <button
          type="button"
          className="meal-card__type"
          onClick={() => onSelect?.(meal)}
          aria-label={`${MEAL_TYPE_LABELS[meal.meal_type]} meal details`}
        >
          <i aria-hidden="true" />
          {MEAL_TYPE_LABELS[meal.meal_type]}
        </button>
        <time className="meal-card__time" dateTime={meal.consumed_at}>
          {formatTime(meal.consumed_at)}
        </time>
        {hasAnyCal && (
          <span className="meal-card__kcal">
            {totals.caloriesPartial ? '~' : ''}{totals.calories.toLocaleString()} kcal
          </span>
        )}

        {/* Overflow menu */}
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
        <button
          type="button"
          className="meal-card__x"
          onClick={() => onDelete(meal.id)}
          aria-label="Delete meal"
          title="Delete"
        >
          ×
        </button>
      </div>

      {/* Item rows */}
      <ul className="meal-card__items">
        {meal.items.map((item) => {
          const nutrientLine = itemNutrientLine(item)
          return (
            <li key={item.id} className="meal-card__item">
              <span className="meal-card__land" data-land="">
                <EITile name={item.description} size={28} round />
                <span className="meal-card__item-desc">{item.description}</span>
              </span>
              <CalBadge item={item} onUpdateCalories={onUpdateCalories} />
              {nutrientLine && <span className="meal-card__nutrients">{nutrientLine}</span>}
            </li>
          )
        })}
      </ul>

      {(hasAnyProtein || hasAnyFiber) && (
        <p className="meal-card__totals">
          {hasAnyProtein && (
            <span>Protein {totals.proteinPartial ? '~' : ''}{formatGrams(totals.protein_g)}</span>
          )}
          {hasAnyFiber && (
            <span>Fiber {totals.fiberPartial ? '~' : ''}{formatGrams(totals.fiber_g)}</span>
          )}
        </p>
      )}

      {showEstimateBtn && (
        <button
          className="meal-card__estimate-btn"
          onClick={handleEstimate}
          disabled={estimating}
          type="button"
          aria-label="Estimate calories, protein and fiber"
        >
          ✨ {estimating ? 'Estimating…' : 'Estimate nutrition'}
        </button>
      )}
    </article>
  )
}
