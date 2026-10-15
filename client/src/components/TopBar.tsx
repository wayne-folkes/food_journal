import type { ReactNode } from 'react'

interface Props {
  viewMode: 'day' | 'week'
  onViewModeChange: (mode: 'day' | 'week') => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  /** Stepping forward would go past today (or this week). */
  nextDisabled: boolean
  onSearch: () => void
  /** Sign-in / account menu */
  account: ReactNode
}

/** Glass top bar: wordmark, Day|Week segmented control, date stepping. */
export function TopBar({ viewMode, onViewModeChange, onPrev, onNext, onToday, nextDisabled, onSearch, account }: Props) {
  const unit = viewMode === 'week' ? 'week' : 'day'

  return (
    <header className="gl-top gl-glass">
      <span className="gl-word">
        <i className="gl-word__dot" aria-hidden="true" />
        <span className="gl-word__text">Food Journal</span>
      </span>
      <span className="gl-sp" />

      <div className={`gl-seg${viewMode === 'week' ? ' gl-seg--week' : ''}`} role="group" aria-label="View mode">
        <span className="gl-seg__thumb" aria-hidden="true" />
        <button
          aria-pressed={viewMode === 'day'}
          className={viewMode === 'day' ? 'on' : ''}
          onClick={() => onViewModeChange('day')}
        >Day</button>
        <button
          aria-pressed={viewMode === 'week'}
          className={viewMode === 'week' ? 'on' : ''}
          onClick={() => onViewModeChange('week')}
        >Week</button>
      </div>
      <span className="gl-sp" />

      <div className="gl-nav">
        <button className="gl-nb" onClick={onPrev} aria-label={`Previous ${unit}`}>‹</button>
        <button className="gl-nb gl-nb--today" onClick={onToday}>Today</button>
        <button className="gl-nb" onClick={onNext} disabled={nextDisabled} aria-label={`Next ${unit}`}>›</button>
      </div>

      <button className="gl-nb gl-nb--icon" aria-label="Search meals" onClick={onSearch}>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {account}
    </header>
  )
}
