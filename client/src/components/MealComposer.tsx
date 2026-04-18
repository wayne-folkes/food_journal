import { useMemo, useState, type FormEvent } from 'react'
import type { MealType } from '@shared/types/database'
import { MEAL_TYPE_LABELS } from '../lib/mealType'
import { suggestMealType } from '../lib/mealType'
import { parseChip } from '../lib/parser'
import { useEntriesStore } from '../lib/store'
import { track } from '../lib/analytics'
import { MealTypePills } from './MealTypePills'
import { ChipInput } from './ChipInput'
import { EITile } from './EITile'

interface Props {
  onAdd: (payload: { mealType: MealType; items: string[]; consumed_at: string; rawInput: string }) => void
  onCancel?: () => void
}

function formatTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function displayTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function getDayName(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long' })
}

export function MealComposer({ onAdd, onCancel }: Props) {
  const now = new Date()
  const [mealType, setMealType] = useState<MealType>(() => suggestMealType(now))
  const [chips, setChips] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [mealTime, setMealTime] = useState<string>(now.toISOString())
  const [showTimePicker, setShowTimePicker] = useState(false)

  const itemHistory = useEntriesStore(s => s.itemHistory)

  const suggestions = useMemo(() => {
    const q = inputValue.trim().toLowerCase()
    if (q.length < 1) return []
    const alreadyAdded = new Set(chips.map(c => c.toLowerCase()))
    const matches = itemHistory.filter(s =>
      !alreadyAdded.has(s.toLowerCase()) &&
      s.toLowerCase().includes(q)
    )
    matches.sort((a, b) => {
      const aPrefix = a.toLowerCase().startsWith(q)
      const bPrefix = b.toLowerCase().startsWith(q)
      return aPrefix === bPrefix ? 0 : aPrefix ? -1 : 1
    })
    return matches.slice(0, 6)
  }, [inputValue, itemHistory, chips])

  function commitChipText(raw: string): string[] {
    const trimmed = raw.trim().replace(/,+$/, '').trim()
    if (!trimmed) return chips
    const { description, consumed_at } = parseChip(trimmed, new Date(mealTime))
    if (consumed_at) setMealTime(consumed_at.toISOString())
    const label = capitalize(description || trimmed)
    const next = [...chips, label]
    setChips(next)
    return next
  }

  function handleChipsChange(newChips: string[]) {
    if (newChips.length > chips.length) {
      const lastRaw = newChips[newChips.length - 1]
      const { description, consumed_at } = parseChip(lastRaw, new Date(mealTime))
      if (consumed_at) setMealTime(consumed_at.toISOString())
      const label = capitalize(description || lastRaw)
      setChips([...newChips.slice(0, -1), label])
    } else {
      setChips(newChips)
    }
  }

  function handleSuggestionSelect(description: string) {
    track('autocomplete_used', {})
    setChips(prev => [...prev, description])
    setInputValue('')
  }

  const canSave = chips.length > 0 || inputValue.trim().length > 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
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
    const next = new Date()
    setChips([])
    setInputValue('')
    setMealType(suggestMealType(next))
    setMealTime(next.toISOString())
    setShowTimePicker(false)
  }

  const mealLabel = MEAL_TYPE_LABELS[mealType]

  return (
    <form className="ei-composer" onSubmit={handleSubmit}>
      {/* Header bar */}
      <div className="ei-composer__header">
        {onCancel ? (
          <button type="button" className="ei-composer__cancel" onClick={onCancel}>Cancel</button>
        ) : (
          <span />
        )}
        <span className="ei-composer__title">New Entry</span>
        <button type="submit" className="ei-composer__save" disabled={!canSave}>
          Save
        </button>
      </div>

      {/* Meal type row + time */}
      <div className="ei-composer__type-row">
        <MealTypePills value={mealType} onChange={setMealType} />
        <div className="ei-composer__time">
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
              className="ei-composer__time-badge"
              onClick={() => setShowTimePicker(true)}
              aria-label="Edit meal time"
            >
              {displayTime(mealTime)}
            </button>
          )}
        </div>
      </div>

      {/* Paper sheet */}
      <div className="ei-composer__paper">
        <span className="ei-composer__kicker">— {mealLabel}, {getDayName()}</span>
        <div className="ei-composer__input-area">
          <ChipInput
            chips={chips}
            inputValue={inputValue}
            onChange={handleChipsChange}
            onInputChange={setInputValue}
            placeholder="Oats, honey, and a cortado…"
            suggestions={suggestions}
            onSuggestionSelect={handleSuggestionSelect}
          />
        </div>
        <p className="ei-composer__hint">
          Write a sentence. Separate items with commas or "and".
        </p>
      </div>

      {/* Recognized items */}
      {chips.length > 0 && (
        <div className="ei-composer__recognized">
          <div className="ei-composer__recognized-header">
            <span className="ei-composer__recognized-kicker">
              — Recognized, {chips.length} item{chips.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="ei-composer__recognized-card">
            {chips.map((chip, i) => (
              <div key={i} className="ei-composer__recognized-row">
                <EITile name={chip} size={28} />
                <span className="ei-composer__recognized-name">{chip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  )
}
