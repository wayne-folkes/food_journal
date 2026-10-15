import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { MealType } from '@shared/types/database'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER, suggestMealType } from '../lib/mealType'
import { parseSentence } from '../lib/parser'
import { EITile } from './EITile'

export interface ComposePayload {
  mealType: MealType
  items: string[]
  consumed_at: string
  rawInput: string
}

interface Props {
  /** `panel` sits in the day view's left column; `dock` floats at the bottom on phones. */
  variant: 'panel' | 'dock'
  value: string
  onChange: (value: string) => void
  now: Date
  onSubmit: (payload: ComposePayload) => void
}

/** Collapse inner whitespace and capitalise the first letter. */
const tidy = (s: string) => {
  const t = s.replace(/\s+/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/**
 * Compose — type a sentence, watch it split into live bubbles, hit Enter to
 * log. Meal type is suggested from the clock (tap the pill to cycle).
 */
export function Compose({ variant, value, onChange, now, onSubmit }: Props) {
  const [typeOverride, setTypeOverride] = useState<MealType | null>(null)
  const parsed = useMemo(() => parseSentence(value, now), [value, now])
  const items = useMemo(() => parsed.items.map(tidy), [parsed])
  const mealType = typeOverride ?? suggestMealType(now)
  const dock = variant === 'dock'

  function cycleType() {
    const next = (MEAL_TYPE_ORDER.indexOf(mealType) + 1) % MEAL_TYPE_ORDER.length
    setTypeOverride(MEAL_TYPE_ORDER[next])
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const raw = value.trim()
    if (!raw) return
    const parsedNow = parseSentence(raw, new Date())
    if (parsedNow.items.length === 0) return
    onSubmit({
      mealType,
      items: parsedNow.items.map(tidy),
      consumed_at: parsedNow.consumed_at.toISOString(),
      rawInput: raw,
    })
    setTypeOverride(null)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') onChange('')
  }

  const bubbles = items.map((name, i) => (
    <span key={`${i}${name}`} className="gl-bub" data-src-chip="">
      <EITile name={name} size={24} round />
      {name}
    </span>
  ))

  const typePill = (
    <button
      type="button"
      className="gl-type"
      style={{ '--mc': `var(--meal-${mealType})` } as React.CSSProperties}
      data-meal-type={mealType}
      onClick={cycleType}
      aria-label={`Meal type: ${MEAL_TYPE_LABELS[mealType]}. Tap to change.`}
    >
      <i aria-hidden="true" />
      {MEAL_TYPE_LABELS[mealType]}
    </button>
  )

  const input = (
    <input
      className="gl-in"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="What did you eat?"
      aria-label="What did you eat?"
      autoFocus={!dock}
      enterKeyHint="send"
    />
  )

  if (dock) {
    return (
      <form className="gl-dock" onSubmit={handleSubmit}>
        {items.length > 0 && <div className="gl-tray">{bubbles}</div>}
        <div className="gl-bar gl-glass">
          {input}
          {typePill}
          <button type="submit" className="gl-log" disabled={items.length === 0} aria-label="Log meal">↵</button>
        </div>
      </form>
    )
  }

  return (
    <form className="gl-compose gl-glass" onSubmit={handleSubmit}>
      {input}
      <div className="gl-tray">
        {items.length > 0
          ? bubbles
          : <span className="gl-hint">Separate items with commas or "and"</span>}
      </div>
      <div className="gl-crow">
        {typePill}
        <span className="gl-time">{formatTime(parsed.consumed_at)}</span>
        <button type="submit" className="gl-log" disabled={items.length === 0}>Log meal ↵</button>
      </div>
    </form>
  )
}
