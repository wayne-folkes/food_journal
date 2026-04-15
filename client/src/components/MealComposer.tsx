import { useState, type FormEvent } from 'react'
import type { MealType } from '../types/database'
import { suggestMealType } from '../lib/mealType'
import { parseChip } from '../lib/parser'
import { MealTypePills } from './MealTypePills'
import { ChipInput } from './ChipInput'

interface Props {
  onAdd: (payload: { mealType: MealType; items: string[]; consumed_at: string; rawInput: string }) => void
}

function formatTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function displayTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function MealComposer({ onAdd }: Props) {
  const now = new Date()
  const [mealType, setMealType] = useState<MealType>(() => suggestMealType(now))
  const [chips, setChips] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [mealTime, setMealTime] = useState<string>(now.toISOString())
  const [showTimePicker, setShowTimePicker] = useState(false)

  /** Commit a raw string as a chip, stripping any time phrase and updating mealTime. */
  function commitChipText(raw: string): string[] {
    const trimmed = raw.trim().replace(/,+$/, '').trim()
    if (!trimmed) return chips

    const { description, consumed_at } = parseChip(trimmed, new Date(mealTime))
    if (consumed_at) setMealTime(consumed_at.toISOString())

    const label = description || trimmed
    const next = [...chips, label]
    setChips(next)
    return next
  }

  function handleChipsChange(newChips: string[]) {
    // Called when ChipInput commits a chip (Enter/comma).
    // At this point the chip text has already been processed by ChipInput,
    // but we need to check the last chip for a time phrase.
    if (newChips.length > chips.length) {
      const lastRaw = newChips[newChips.length - 1]
      const { description, consumed_at } = parseChip(lastRaw, new Date(mealTime))
      if (consumed_at) setMealTime(consumed_at.toISOString())
      const label = description || lastRaw
      setChips([...newChips.slice(0, -1), label])
    } else {
      setChips(newChips)
    }
  }

  const canSave = chips.length > 0 || inputValue.trim().length > 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()

    // Auto-commit any text sitting in the input field
    let finalChips = chips
    const pending = inputValue.trim()
    if (pending) {
      finalChips = commitChipText(pending)
      setInputValue('')
    }

    if (finalChips.length === 0) return

    onAdd({
      mealType,
      items: finalChips,
      consumed_at: mealTime,
      rawInput: finalChips.join(', '),
    })

    // Reset
    const next = new Date()
    setChips([])
    setInputValue('')
    setMealType(suggestMealType(next))
    setMealTime(next.toISOString())
    setShowTimePicker(false)
  }

  return (
    <form className="meal-composer" onSubmit={handleSubmit}>
      <MealTypePills value={mealType} onChange={setMealType} />

      <div className="meal-composer__input-row">
        <ChipInput
          chips={chips}
          inputValue={inputValue}
          onChange={handleChipsChange}
          onInputChange={setInputValue}
          placeholder="e.g. scrambled eggs, toast, coffee…"
        />
      </div>

      <div className="meal-composer__footer">
        <div className="meal-composer__time-wrap">
          {showTimePicker ? (
            <input
              type="datetime-local"
              className="meal-composer__time-picker"
              value={formatTimeInput(new Date(mealTime))}
              onChange={(e) => {
                if (e.target.value) setMealTime(new Date(e.target.value).toISOString())
              }}
              onBlur={() => setShowTimePicker(false)}
              autoFocus
            />
          ) : (
            <button
              type="button"
              className="meal-composer__time-badge"
              onClick={() => setShowTimePicker(true)}
              aria-label="Edit meal time"
            >
              {displayTime(mealTime)}
            </button>
          )}
        </div>

        <button
          type="submit"
          className="btn btn--primary"
          disabled={!canSave}
        >
          Save meal
        </button>
      </div>
    </form>
  )
}
