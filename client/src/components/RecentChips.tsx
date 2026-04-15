interface Props {
  items: string[]
  onSelect: (item: string) => void
}

export function RecentChips({ items, onSelect }: Props) {
  if (items.length === 0) return null

  return (
    <div className="recent-chips">
      {items.map((item) => (
        <button key={item} className="chip" onClick={() => onSelect(item)}>
          {item}
        </button>
      ))}
    </div>
  )
}
