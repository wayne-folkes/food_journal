import { useState, type FormEvent } from 'react'
import type { MealWithItems, MealType } from '../types/database'
import { MealTypePills } from './MealTypePills'
import { ChipInput } from './ChipInput'
import { parseChip } from '../lib/parser'

interface Props {
  meal: MealWithItems
  onSave: (id: string, updates: { meal_type: MealType; consumed_at: string; items: string[] }) => void
  onCancel: () => void
}

function formatTimeInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EditMealModal({ meal, onSave, onCancel }: Props) {
  const [mealType, setMealType] = useState<MealType>(meal.meal_type)
  const [chips, setChips] = useState<string[]>(meal.items.map((i) => i.description))
  const [inputValue, setInputValue] = useState('')
  const [consumedAt, setConsumedAt] = useState(formatTimeInput(meal.consumed_at))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()

    // Auto-commit any pending input text
    let finalChips = chips
    const pending = inputValue.trim()
    if (pending) {
      const { description, consumed_at } = parseChip(pending)
      const label = description || pending
      finalChips = [...chips, label]
      setChips(finalChips)
      setInputValue('')
      if (consumed_at) setConsumedAt(formatTimeInput(consumed_at.toISOString()))
    }

    if (finalChips.length === 0) return

    onSave(meal.id, {
      meal_type: mealType,
      consumed_at: new Date(consumedAt).toISOString(),
      items: finalChips,
    })
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Edit Meal</h2>
          <button className="btn-icon" onClick={onCancel} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <MealTypePills value={mealType} onChange={setMealType} />
          </div>

          <div className="form-group">
            <label className="form-label">Items</label>
            <ChipInput
              chips={chips}
              inputValue={inputValue}
              onChange={setChips}
              onInputChange={setInputValue}
              placeholder="Add item…"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Time</label>
            <input
              type="datetime-local"
              className="input"
              value={consumedAt}
              onChange={(e) => setConsumedAt(e.target.value)}
              required
            />
          </div>

          <div className="modal__footer">
            <button type="submit" className="btn btn--primary" disabled={chips.length === 0 && !inputValue.trim()}>
              Save Changes
            </button>
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
