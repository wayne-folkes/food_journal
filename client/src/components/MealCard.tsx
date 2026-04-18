import { useState, useMemo } from 'react'
import type { MealItem, MealWithItems } from '@shared/types/database'
import { MEAL_TYPE_LABELS } from '../lib/mealType'
import { useEntriesStore } from '../lib/store'
import { EITile } from './EITile'

interface Props {
  meal: MealWithItems
  onEdit: (meal: MealWithItems) => void
  onDelete: (id: string) => void
  onDuplicate: (meal: MealWithItems) => void
  onUpdateCalories: (itemId: string, calories: number | null) => Promise<void>
  onEstimateCalories?: (meal: MealWithItems) => Promise<void>
  onSelect?: (meal: MealWithItems) => void
  groupPosition?: 'first' | 'middle' | 'last'
  isFirst?: boolean
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** Generate an editorial headline from meal items */
function generateHeadline(items: MealItem[]): React.ReactNode {
  if (items.length === 0) return null
  const period = <span className="meal-card__headline-period">.</span>
  if (items.length === 1) {
    return <><em className="meal-card__headline-tail">{items[0].description}</em>{period}</>
  }
  if (items.length === 2) {
    return <>{items[0].description} and <em className="meal-card__headline-tail">{items[1].description}</em>{period}</>
  }
  const head = items.slice(0, -1).map(i => i.description).join(', ')
  const tail = items[items.length - 1].description
  return <>{head}, and <em className="meal-card__headline-tail">{tail}</em>{period}</>
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
        // eslint-disable-next-line jsx-a11y/no-autofocus
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

export function MealCard({ meal, onEdit, onDelete, onDuplicate, onUpdateCalories, onEstimateCalories, onSelect, groupPosition, isFirst }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const isAuthed = useEntriesStore((s) => s.isAuthed)

  const itemsWithCal = meal.items.filter((i) => i.calories != null)
  const totalCal = itemsWithCal.reduce((sum, i) => sum + (i.calories ?? 0), 0)
  const showSubtotal = itemsWithCal.length > 0
  const hasItemsNeedingCalories = meal.items.some((i) => i.calories === null)
  const showEstimateBtn = isAuthed && hasItemsNeedingCalories && onEstimateCalories != null

  async function handleEstimate() {
    if (!onEstimateCalories) return
    setEstimating(true)
    try {
      await onEstimateCalories(meal)
    } finally {
      setEstimating(false)
    }
  }

  const headline = useMemo(() => generateHeadline(meal.items), [meal.items])

  return (
    <article className={`meal-card${isFirst ? ' meal-card--lede' : ''}${menuOpen ? ' meal-card--menu-open' : ''}${groupPosition === 'first' ? ' meal-card--group-first' : groupPosition === 'middle' ? ' meal-card--group-middle' : groupPosition === 'last' ? ' meal-card--group-last' : ''}`} style={{ position: 'relative' }}>
      {/* Kicker row */}
      <div className="meal-card__kicker">
        <span className="meal-card__type">— {MEAL_TYPE_LABELS[meal.meal_type]}</span>
        <div className="meal-card__kicker-rule" />
        <time className="meal-card__time" dateTime={meal.consumed_at}>
          {formatTime(meal.consumed_at)}
        </time>
      </div>

      {/* Headline */}
      <div className="meal-card__headline" onClick={() => onSelect?.(meal)} style={{ cursor: onSelect ? 'pointer' : undefined }}>
        <p className="meal-card__headline-text">{headline}</p>
      </div>

      {/* Item rows */}
      <ul className="meal-card__items">
        {meal.items.map((item) => (
          <li key={item.id} className="meal-card__item">
            <EITile name={item.description} size={30} />
            <span className="meal-card__item-desc">{item.description}</span>
            <CalBadge item={item} onUpdateCalories={onUpdateCalories} />
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="meal-card__footer">
        <span className="meal-card__footer-count">
          {meal.items.length} item{meal.items.length === 1 ? '' : 's'}
        </span>
        {showSubtotal && (
          <span className="meal-card__footer-cal">
            ~{totalCal.toLocaleString()} kcal
          </span>
        )}
      </div>

      {showEstimateBtn && (
        <button
          className="meal-card__estimate-btn"
          onClick={handleEstimate}
          disabled={estimating}
          type="button"
          aria-label="Estimate calories from USDA database"
        >
          ✨ {estimating ? 'Estimating…' : 'Estimate calories'}
        </button>
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
    </article>
  )
}
