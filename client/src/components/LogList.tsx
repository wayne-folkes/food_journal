import type { Entry } from '../types/database'
import { EntryRow } from './EntryRow'

interface Props {
  entries: Entry[]
  isLoading: boolean
  onEdit: (entry: Entry) => void
  onDelete: (id: string) => void
}

function LoadingSkeleton() {
  return (
    <section className="log-list skeleton">
      <h2 className="log-list__heading">Today's Log</h2>
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-pulse skeleton-pulse--time" />
          <div className="skeleton-pulse skeleton-pulse--desc" />
        </div>
      ))}
    </section>
  )
}

export function LogList({ entries, isLoading, onEdit, onDelete }: Props) {
  if (isLoading) {
    return <LoadingSkeleton />
  }

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
