import type { Entry } from '../types/database'

interface Props {
  entry: Entry
  onEdit: (entry: Entry) => void
  onDelete: (id: string) => void
}

export function EntryRow({ entry, onEdit, onDelete }: Props) {
  const time = new Date(entry.consumed_at).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="entry-row">
      <span className="entry-row__time">{time}</span>
      <span className="entry-row__desc">{entry.description}</span>
      <div className="entry-row__actions">
        <button className="btn-icon" title="Edit" onClick={() => onEdit(entry)}>
          ✏️
        </button>
        <button
          className="btn-icon btn-icon--danger"
          title="Delete"
          onClick={() => onDelete(entry.id)}
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
