import { EITile } from './EITile'

interface Props {
  items: string[]
  onSelect: (item: string) => void
}

export function RecentChips({ items, onSelect }: Props) {
  if (items.length === 0) return null

  return (
    <div className="recent-chips">
      {items.map((item, i) => (
        <button
          key={item}
          className="recent-chip"
          /* Alternate the tilt so the row reads as scattered stickers */
          style={{ '--tilt': i % 2 === 0 ? '-1.1deg' : '0.9deg' } as React.CSSProperties}
          onClick={() => onSelect(item)}
        >
          <EITile name={item} size={18} />
          {item}
        </button>
      ))}
    </div>
  )
}
