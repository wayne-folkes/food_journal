import { todayString } from '../lib/store'
import { offsetDate } from '../lib/date'

interface Props {
  date: string          // YYYY-MM-DD
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  viewMode: 'day' | 'week'
  onViewModeChange: (mode: 'day' | 'week') => void
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

function weekLabel(dateStr: string): string {
  // compute Monday of the week containing dateStr
  const d = new Date(`${dateStr}T12:00:00`)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diffToMonday)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(mon)} \u2013 ${fmt(sun)}`
}

export function DateNav({ date, onPrev, onNext, onToday, viewMode, onViewModeChange }: Props) {
  const isToday = date === todayString()
  const step = viewMode === 'week' ? 7 : 1

  return (
    <div className="date-nav">
      <button
        className="date-nav__arrow"
        onClick={onPrev}
        aria-label={viewMode === 'week' ? 'Previous week' : 'Previous day'}
      >
        ←
      </button>

      <div className="date-nav__center">
        <span className="date-nav__label">
          {viewMode === 'week' ? weekLabel(date) : formatDate(date)}
        </span>
        {!isToday && (
          <button className="date-nav__today-pill" onClick={onToday} aria-label="Jump to today">
            today
          </button>
        )}
        <div className="view-toggle" role="tablist" aria-label="View mode">
          <button
            role="tab"
            aria-selected={viewMode === 'day'}
            className={`view-toggle__btn${viewMode === 'day' ? ' view-toggle__btn--active' : ''}`}
            onClick={() => onViewModeChange('day')}
          >Day</button>
          <button
            role="tab"
            aria-selected={viewMode === 'week'}
            className={`view-toggle__btn${viewMode === 'week' ? ' view-toggle__btn--active' : ''}`}
            onClick={() => onViewModeChange('week')}
          >Week</button>
        </div>
      </div>

      <button
        className="date-nav__arrow"
        onClick={onNext}
        disabled={isToday && step === 1}
        aria-label={viewMode === 'week' ? 'Next week' : 'Next day'}
      >
        →
      </button>
    </div>
  )
}
