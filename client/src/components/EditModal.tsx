import { useState, type FormEvent } from 'react'
import type { Entry } from '../types/database'

interface Props {
  entry: Entry
  onSave: (id: string, updates: { description: string; consumed_at: string }) => void
  onCancel: () => void
}

export function EditModal({ entry, onSave, onCancel }: Props) {
  const [description, setDescription] = useState(entry.description)

  // Format consumed_at to datetime-local value (YYYY-MM-DDTHH:MM)
  const toLocalInput = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [consumedAt, setConsumedAt] = useState(toLocalInput(entry.consumed_at))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSave(entry.id, {
      description: description.trim(),
      consumed_at: new Date(consumedAt).toISOString(),
    })
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Edit Entry</h2>
          <button className="btn-icon" onClick={onCancel}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="datetime-local"
              className="input"
              value={consumedAt}
              onChange={(e) => setConsumedAt(e.target.value)}
              required
            />
          </div>
          <div className="modal__footer">
            <button type="submit" className="btn btn--primary">Save Changes</button>
            <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
