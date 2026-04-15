import { useRef, type KeyboardEvent } from 'react'

interface Props {
  chips: string[]
  inputValue: string
  onChange: (chips: string[]) => void
  onInputChange: (value: string) => void
  placeholder?: string
}

/**
 * A chip-style multi-item input.
 * - Press Enter or type comma to commit the current value as a chip.
 * - Backspace on empty input removes the last chip.
 * - Input value is controlled (lifted to parent) so parent can commit on submit.
 */
export function ChipInput({ chips, inputValue, onChange, onInputChange, placeholder = 'Add item…' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function commitChip(raw: string) {
    const trimmed = raw.trim().replace(/,+$/, '').trim()
    if (!trimmed) return
    onChange([...chips, trimmed])
    onInputChange('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
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
    </div>
  )
}
