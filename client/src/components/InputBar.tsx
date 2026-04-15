import { useState, type FormEvent } from 'react'

interface Props {
  onAdd: (raw: string) => void
}

export function InputBar({ onAdd }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
  }

  return (
    <form className="input-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        className="input-bar__field"
        placeholder="e.g. oat milk latte at 9am..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <button type="submit" className="btn btn--primary">
        Add
      </button>
    </form>
  )
}
