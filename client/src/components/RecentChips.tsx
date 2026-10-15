import { EITile } from './EITile'

interface Props {
  items: string[]
  onSelect: (item: string) => void
}

/** Recently logged items — tap one to append it to the compose input. */
export function RecentChips({ items, onSelect }: Props) {
  if (items.length === 0) return null

  return (
    <div className="gl-recent" aria-label="Recent items">
      {items.map((item) => (
        <button key={item} type="button" className="gl-recent__chip" onClick={() => onSelect(item)}>
          <EITile name={item} size={18} round />
          {item}
        </button>
      ))}
    </div>
  )
}
