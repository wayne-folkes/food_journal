import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import type { MealWithItems } from '../types/database'
import { useEntriesStore } from '../lib/store'
import { MEAL_TYPE_LABELS } from '../lib/mealType'

interface SearchOverlayProps {
  onClose: () => void
  onNavigateToDate: (date: string) => void
}

/** Split text on query match and wrap match in <mark>. Case-insensitive. */
function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatDateHeading(dateStr: string): string {
  const today = new Date().toLocaleDateString('sv')
  if (dateStr === today) return 'Today'
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

/** Group meals by local date (YYYY-MM-DD). Returns entries ordered most-recent first. */
function groupByDate(meals: MealWithItems[]): Array<{ date: string; meals: MealWithItems[] }> {
  const map = new Map<string, MealWithItems[]>()
  for (const meal of meals) {
    const date = new Date(meal.consumed_at).toLocaleDateString('sv')
    const group = map.get(date)
    if (group) {
      group.push(meal)
    } else {
      map.set(date, [meal])
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, groupMeals]) => ({ date, meals: groupMeals }))
}

interface SearchMealCardProps {
  meal: MealWithItems
  query: string
  onClick: () => void
}

function SearchMealCard({ meal, query, onClick }: SearchMealCardProps) {
  return (
    <article
      className={`meal-card meal-card--${meal.meal_type} search-meal-card`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    >
      <div className="meal-card__accent" aria-hidden="true" />
      <div className="meal-card__body">
        <header className="meal-card__header">
          <span className="meal-card__type">{MEAL_TYPE_LABELS[meal.meal_type]}</span>
          <span className="meal-card__dot" aria-hidden="true">·</span>
          <time className="meal-card__time" dateTime={meal.consumed_at}>
            {formatTime(meal.consumed_at)}
          </time>
        </header>
        <ul className="meal-card__items">
          {meal.items.map((item) => (
            <li key={item.id} className="meal-card__item">
              {highlightMatch(item.description, query)}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

export function SearchOverlay({ onClose, onNavigateToDate }: SearchOverlayProps) {
  const { searchMeals } = useEntriesStore()
  const [inputValue, setInputValue] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MealWithItems[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Autofocus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)

    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    if (value.length < 2) {
      setQuery('')
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceTimer.current = setTimeout(async () => {
      const q = value.trim()
      setQuery(q)
      const found = await searchMeals(q)
      setResults(found)
      setIsSearching(false)
    }, 300)
  }, [searchMeals])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  const grouped = groupByDate(results)
  const showResults = query.length >= 2 && !isSearching
  const showEmpty = showResults && results.length === 0
  const showHint = inputValue.length < 2 && !isSearching

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search meals">
      <div className="search-overlay__header">
        <button
          className="search-overlay__back"
          onClick={onClose}
          aria-label="Close search"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 16L6.5 10L12.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <input
          ref={inputRef}
          className="search-overlay__input"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder="Search meals…"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {isSearching && (
          <span className="search-overlay__spinner" aria-label="Searching…" />
        )}
      </div>

      <div className="search-overlay__results">
        {showHint && (
          <p className="search-overlay__empty">Type to search your meals</p>
        )}

        {showEmpty && (
          <p className="search-overlay__empty">No meals found for &ldquo;{query}&rdquo;</p>
        )}

        {showResults && grouped.map(({ date, meals }) => (
          <div key={date} className="search-overlay__date-group">
            <div className="search-overlay__date-header">{formatDateHeading(date)}</div>
            {meals.map((meal) => (
              <SearchMealCard
                key={meal.id}
                meal={meal}
                query={query}
                onClick={() => {
                  onNavigateToDate(date)
                  onClose()
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
