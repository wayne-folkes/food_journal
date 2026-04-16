import { todayString } from '../lib/store'
import { offsetDate } from '../lib/date'

interface Props {
  date: string          // YYYY-MM-DD
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

function formatDate(dateStr: string): string {
  const today = todayString()
  const yesterday = offsetDate(today, -1)

  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'

  // e.g. "Wed, Apr 14"
  const d = new Date(`${dateStr}T12:00:00`) // noon local avoids DST edge cases
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function DateNav({ date, onPrev, onNext, onToday }: Props) {
  const isToday = date === todayString()

  return (
    <div className="date-nav">
      <button
        className="date-nav__arrow"
        onClick={onPrev}
        aria-label="Previous day"
      >
        ←
      </button>

      <div className="date-nav__center">
        <span className="date-nav__label">
          {formatDate(date)}
        </span>
        {!isToday && (
          <button className="date-nav__today-pill" onClick={onToday} aria-label="Jump to today">
            today
          </button>
        )}
      </div>

      <button
        className="date-nav__arrow"
        onClick={onNext}
        disabled={isToday}
        aria-label="Next day"
      >
        →
      </button>
    </div>
  )
}
