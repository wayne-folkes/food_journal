import { useState, type FormEvent } from 'react'
import type { MealWithItems, MealType } from '@shared/types/database'
import type { ChipItem } from '../lib/store'
import { MealTypePills } from './MealTypePills'
import { ChipInput } from './ChipInput'
import { parseChip } from '../lib/parser'

interface Props {
  meal: MealWithItems
  onSave: (id: string, updates: { meal_type: MealType; consumed_at: string; items: ChipItem[] }) => void
  onCancel: () => void
}

function formatTimeInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EditMealModal({ meal, onSave, onCancel }: Props) {
  const [mealType, setMealType] = useState<MealType>(meal.meal_type)
  const [chips, setChips] = useState<ChipItem[]>(
    meal.items.map((i) => ({ description: i.description, calories: i.calories ?? null, id: i.id }))
  )
  const [inputValue, setInputValue] = useState('')
  const [consumedAt, setConsumedAt] = useState(formatTimeInput(meal.consumed_at))

  // ChipInput expects string[] for its chips prop, so we wrap/unwrap
  const chipDescriptions = chips.map((c) => c.description)

  function handleChipsChange(newDescriptions: string[]) {
    // Merge: keep calories for chips that still exist at the same index, null for new ones
    setChips((prev) =>
      newDescriptions.map((desc, i) => {
        // Try to find an existing chip with this description to preserve calories
        const existingByDesc = prev.find((p) => p.description === desc)
        if (existingByDesc) return existingByDesc
        // Fall back to same-index chip if it exists (rename case)
        return { description: desc, calories: prev[i]?.calories ?? null, id: prev[i]?.id }
      })
    )
  }

  function updateCalories(index: number, raw: string) {
    const parsed = raw.trim() === '' ? null : parseInt(raw, 10)
    const cal = parsed != null && !isNaN(parsed) ? Math.min(9999, Math.max(0, parsed)) : null
    setChips((prev) => prev.map((c, i) => i === index ? { ...c, calories: cal } : c))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()

    let finalChips = chips
    const pending = inputValue.trim()
    if (pending) {
      const { description, consumed_at } = parseChip(pending)
      const label = description || pending
      finalChips = [...chips, { description: label, calories: null }]
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

  const originalChips: ChipItem[] = meal.items.map((i) => ({
    description: i.description,
    calories: i.calories ?? null,
    id: i.id,
  }))
  const originalTime = formatTimeInput(meal.consumed_at)

  const isDirty =
    mealType !== meal.meal_type ||
    consumedAt !== originalTime ||
    chips.length !== originalChips.length ||
    chips.some((c, i) => c.description !== originalChips[i]?.description || c.calories !== originalChips[i]?.calories) ||
    inputValue.trim().length > 0

  function handleCancel() {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return
    onCancel()
  }

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Edit Meal</h2>
          <button className="btn-icon" onClick={handleCancel} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <MealTypePills value={mealType} onChange={setMealType} />
          </div>

          <div className="form-group">
            <label className="form-label">Items</label>
            <ChipInput
              chips={chipDescriptions}
              inputValue={inputValue}
              onChange={handleChipsChange}
              onInputChange={setInputValue}
              placeholder="Add item…"
            />
          </div>

          {chips.length > 0 && (
            <div className="form-group">
              <label className="form-label">Calories (optional)</label>
              <div className="edit-modal__cal-rows">
                {chips.map((chip, i) => (
                  <div key={i} className="edit-modal__cal-row">
                    <span className="edit-modal__cal-row-desc">{chip.description}</span>
                    <input
                      className="edit-modal__cal-input"
                      type="number"
                      min="0"
                      max="9999"
                      value={chip.calories != null ? String(chip.calories) : ''}
                      onChange={(e) => updateCalories(i, e.target.value)}
                      placeholder="—"
                      aria-label={`Calories for ${chip.description}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

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
            <button type="button" className="btn btn--ghost" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
