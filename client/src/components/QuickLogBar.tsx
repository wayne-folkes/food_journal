import { useEffect, useState, type FormEvent } from 'react'
import type { MealType } from '@shared/types/database'
import { MEAL_TYPES, MEAL_TYPE_LABELS, suggestMealType } from '../lib/mealType'
import { parseSentence } from '../lib/parser'

interface Props {
  onQuickLog: (payload: { mealType: MealType; items: string[]; consumed_at: string; rawInput: string }) => void
  onOpenComposer: (initialInput: string) => void
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/**
 * The always-visible glowing compose bar. Type a sentence and hit Enter to
 * log a meal immediately — meal type is auto-suggested from the time of day
 * (tap the chip to cycle/override). The pencil opens the full compose sheet.
 */
export function QuickLogBar({ onQuickLog, onOpenComposer }: Props) {
  const [text, setText] = useState('')
  const [typeOverride, setTypeOverride] = useState<MealType | null>(null)
  const [now, setNow] = useState(() => new Date())

  // Keep the chip's clock live while the bar sits on screen
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const mealType = typeOverride ?? suggestMealType(now)

  function cycleType() {
    const current = MEAL_TYPES.indexOf(mealType)
    setTypeOverride(MEAL_TYPES[(current + 1) % MEAL_TYPES.length])
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const raw = text.trim()
    if (!raw) return
    const logTime = new Date()
    const { items, consumed_at } = parseSentence(raw, logTime)
    if (items.length === 0) return
    onQuickLog({
      mealType,
      items: items.map((s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)),
      consumed_at: consumed_at.toISOString(),
      rawInput: raw,
    })
    setText('')
    setTypeOverride(null)
    setNow(logTime)
  }

  return (
    <form className="ei-compose-pill" onSubmit={handleSubmit}>
      <svg className="ei-compose-pill__icon" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M2 13.5V16h2.5L13.07 7.43 10.57 4.93 2 13.5z" fill="currentColor" opacity="0.55"/>
        <path d="M15.41 4.59a1 1 0 000-1.42l-1.58-1.58a1 1 0 00-1.42 0L11 3l2.5 2.5 1.91-1.91z" fill="currentColor" opacity="0.55"/>
      </svg>
      <input
        className="ei-compose-pill__input"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Type what you ate — "salmon, brown rice and ginger tea"'}
        aria-label="Quick log a meal"
      />
      <button
        type="button"
        className="ei-compose-pill__chip"
        data-meal-type={mealType}
        onClick={cycleType}
        aria-label={`Meal type: ${MEAL_TYPE_LABELS[mealType]}. Tap to change.`}
      >
        {MEAL_TYPE_LABELS[mealType]} · {formatTime(now)}
      </button>
      {text.trim() ? (
        <button type="submit" className="ei-compose-pill__log" aria-label="Log it">
          Log it ↵
        </button>
      ) : (
        <button
          type="button"
          className="ei-compose-pill__btn"
          onClick={() => { onOpenComposer(text); setText('') }}
          aria-label="Open full compose sheet"
        >
          <span>✎</span>
        </button>
      )}
    </form>
  )
}
