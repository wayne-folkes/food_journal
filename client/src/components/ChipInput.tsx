import { useRef, useState, type KeyboardEvent } from 'react'

interface Props {
  chips: string[]
  inputValue: string
  onChange: (chips: string[]) => void
  onInputChange: (value: string) => void
  placeholder?: string
  suggestions?: string[]
  onSuggestionSelect?: (s: string) => void
}

/**
 * A chip-style multi-item input.
 * - Press Enter or type comma to commit the current value as a chip.
 * - Backspace on empty input removes the last chip.
 * - Input value is controlled (lifted to parent) so parent can commit on submit.
 * - Optional suggestions dropdown with keyboard navigation.
 */
export function ChipInput({ chips, inputValue, onChange, onInputChange, placeholder = 'Add item…', suggestions, onSuggestionSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeIdx, setActiveIdx] = useState(-1)

  function commitChip(raw: string) {
    const trimmed = raw.trim().replace(/,+$/, '').trim()
    if (!trimmed) return
    onChange([...chips, trimmed])
    onInputChange('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (suggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, -1))
        return
      }
      if (e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault()
        onSuggestionSelect?.(suggestions[activeIdx])
        setActiveIdx(-1)
        return
      }
      if (e.key === 'Escape') {
        setActiveIdx(-1)
        return
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      commitChip(inputValue)
      return
    }
    if (e.key === 'Backspace' && inputValue === '' && chips.length > 0) {
      onChange(chips.slice(0, -1))
    }
  }

  function handleChange(raw: string) {
    if (raw.endsWith(',')) {
      commitChip(raw)
    } else {
      onInputChange(raw)
      setActiveIdx(-1)
    }
  }

  function removeChip(index: number) {
    onChange(chips.filter((_, i) => i !== index))
  }

  return (
    <div className="chip-input" onClick={() => inputRef.current?.focus()}>
      {chips.map((chip, i) => (
        <span key={i} className="chip-input__chip">
          {chip}
          <button
            type="button"
            className="chip-input__remove"
            onClick={(e) => { e.stopPropagation(); removeChip(i) }}
            aria-label={`Remove ${chip}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="chip-input__field"
        type="text"
        value={inputValue}
        placeholder={chips.length === 0 ? placeholder : ''}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      {suggestions && suggestions.length > 0 && (
        <ul className="chip-suggestions" role="listbox" aria-label="Suggestions">
          {suggestions.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === activeIdx}
              className={`chip-suggestions__item${i === activeIdx ? ' chip-suggestions__item--active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault() // prevent blur before click registers
                onSuggestionSelect?.(s)
                setActiveIdx(-1)
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
