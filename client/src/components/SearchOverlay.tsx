import { useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { MealWithItems } from '@shared/types/database'
import { useEntriesStore } from '../lib/store'
import { MEAL_TYPE_LABELS } from '../lib/mealType'
import { EITile } from './EITile'

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

interface SearchResultRowProps {
  meal: MealWithItems
  query: string
  selected: boolean
  onClick: () => void
}

function SearchResultRow({ meal, query, selected, onClick }: SearchResultRowProps) {
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <button
      ref={ref}
      type="button"
      className={`search-result${selected ? ' search-result--selected' : ''}`}
      onClick={onClick}
    >
      <EITile name={meal.items[0]?.description ?? '?'} size={34} />
      <div className="search-result__body">
        <div className="search-result__meta">
          <span className="search-result__pill" data-meal-type={meal.meal_type}>
            {MEAL_TYPE_LABELS[meal.meal_type]}
          </span>
          <span className="search-result__time">{formatTime(meal.consumed_at)}</span>
        </div>
        <div className="search-result__items">
          {meal.items.map((item, i) => (
            <span key={item.id}>
              {i > 0 && ' · '}
              {highlightMatch(item.description, query)}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}

export function SearchOverlay({ onClose, onNavigateToDate }: SearchOverlayProps) {
  const { searchMeals } = useEntriesStore()
  const [inputValue, setInputValue] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MealWithItems[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRequestId = useRef(0)

  // Autofocus after overlay entrance animation (~200ms) to avoid forced reflow
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 210)
    return () => clearTimeout(id)
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
    setActiveIdx(-1)
    latestRequestId.current += 1
    const requestId = latestRequestId.current

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
      try {
        const found = await searchMeals(q)
        if (requestId !== latestRequestId.current) return
        setResults(found)
      } finally {
        if (requestId === latestRequestId.current) {
          setIsSearching(false)
        }
      }
    }, 300)
  }, [searchMeals])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      latestRequestId.current += 1
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  const grouped = useMemo(() => groupByDate(results), [results])
  // Flat list mirroring render order, for ↑↓ keyboard navigation
  const flat = useMemo(
    () => grouped.flatMap(({ date, meals }) => meals.map((meal) => ({ date, meal }))),
    [grouped]
  )

  function selectResult(idx: number) {
    const entry = flat[idx]
    if (!entry) return
    onNavigateToDate(entry.date)
    onClose()
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selectResult(activeIdx >= 0 ? activeIdx : 0)
    }
  }

  const showResults = query.length >= 2 && !isSearching
  const showEmpty = showResults && results.length === 0
  const showHint = inputValue.length < 2 && !isSearching
  let flatIdx = -1

  return (
    <div
      className="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Search meals"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="search-palette">
        <div className="search-palette__header">
          <svg className="search-palette__icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            className="search-palette__input"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            placeholder="Search meals…"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {isSearching && (
            <span className="search-palette__spinner" aria-label="Searching…" />
          )}
          <button type="button" className="search-palette__esc" onClick={onClose} aria-label="Close search">
            esc
          </button>
        </div>

        <div className="search-palette__results">
          {showHint && (
            <p className="search-palette__empty">Type to search your meals</p>
          )}

          {showEmpty && (
            <p className="search-palette__empty">No meals found for &ldquo;{query}&rdquo;</p>
          )}

          {showResults && grouped.map(({ date, meals }) => (
            <div key={date} className="search-palette__date-group">
              <div className="search-palette__date-header">{formatDateHeading(date)}</div>
              {meals.map((meal) => {
                flatIdx += 1
                const idx = flatIdx
                return (
                  <SearchResultRow
                    key={meal.id}
                    meal={meal}
                    query={query}
                    selected={idx === activeIdx}
                    onClick={() => selectResult(idx)}
                  />
                )
              })}
            </div>
          ))}
        </div>

        <div className="search-palette__footer">
          ↑↓ navigate · ↵ jump to day · esc close
        </div>
      </div>
    </div>
  )
}
