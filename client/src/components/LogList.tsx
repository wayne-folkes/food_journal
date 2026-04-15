import type { Entry } from '../types/database'
import { EntryRow } from './EntryRow'

interface Props {
  entries: Entry[]
  onEdit: (entry: Entry) => void
  onDelete: (id: string) => void
}

export function LogList({ entries, onEdit, onDelete }: Props) {
  if (entries.length === 0) {
    return (
      <div className="log-list--empty">
        <p>No entries yet today. Start logging above!</p>
      </div>
    )
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.consumed_at).getTime() - new Date(b.consumed_at).getTime()
  )

  return (
    <section className="log-list">
      <h2 className="log-list__heading">Today's Log</h2>
      {sorted.map((entry) => (
        <EntryRow key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </section>
  )
}
