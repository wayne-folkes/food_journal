import { render } from '@testing-library/react'
import type { MealWithItems } from '@shared/types/database'
import type { Flight } from '../lib/glassMotion'
import { MealLog } from './MealLog'

vi.mock('../lib/store', () => ({
  useEntriesStore: () => false,
}))

function makeMeal(id: string, description: string, createdAt: Date): MealWithItems {
  const iso = createdAt.toISOString()
  return {
    id,
    user_id: null,
    consumed_at: iso,
    meal_type: 'breakfast',
    raw_input: description,
    headline: null,
    note: null,
    created_at: iso,
    updated_at: iso,
    items: [
      { id: `${id}-i`, meal_id: id, description, position: 0, consumed_at: iso, created_at: iso, calories: null, qty: null },
    ],
  }
}

function makeFlight(overrides: Partial<Flight> = {}): Flight {
  const now = Date.now()
  return {
    beforeIds: new Set(),
    items: ['Oats'],
    srcs: [],
    before: {},
    waitForZoom: false,
    startedAt: now,
    expiresAt: now + 8000,
    savedId: null,
    ...overrides,
  }
}

function renderLog(meals: MealWithItems[], flight: Flight | null = null) {
  const handlers = {
    onFlightDone: vi.fn(),
    onFresh: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn().mockResolvedValue(true),
    onDuplicate: vi.fn(),
    onUpdateCalories: vi.fn().mockResolvedValue(undefined),
  }
  const rootRef = { current: document.createElement('div') }
  const view = render(<MealLog meals={meals} isLoading={false} rootRef={rootRef} flight={flight} {...handlers} />)
  return { ...view, ...handlers }
}

describe('MealLog', () => {
  beforeEach(() => {
    // happy-dom has no Web Animations; the motion helpers only need it to exist
    Element.prototype.animate = vi.fn(() => ({ onfinish: null, cancel: vi.fn() })) as unknown as typeof Element.prototype.animate
  })

  it('shows the empty state when there are no meals', () => {
    const { getByText } = renderLog([])
    expect(getByText('A clean slate.')).toBeInTheDocument()
  })

  it('lists meals newest first', () => {
    const older = makeMeal('a', 'Toast', new Date(Date.now() - 3 * 3600_000))
    const newer = makeMeal('b', 'Eggs', new Date(Date.now() - 1 * 3600_000))
    const { container } = renderLog([older, newer])
    const ids = [...container.querySelectorAll('[data-meal]')].map((el) => el.getAttribute('data-meal'))
    expect(ids).toEqual(['b', 'a'])
  })

  it('hides the rows of the meal that matches the flight and blooms for it', () => {
    const meal = makeMeal('new', 'Oats', new Date())
    const { container, onFresh } = renderLog([meal], makeFlight())
    expect(container.querySelector('[data-meal="new"]')).toHaveClass('fj-landing')
    expect(onFresh).toHaveBeenCalledTimes(1)
    expect(onFresh).toHaveBeenCalledWith(meal)
  })

  it('does not treat a meal that was already on screen as the landing meal', () => {
    const meal = makeMeal('old', 'Oats', new Date())
    const { container } = renderLog([meal], makeFlight({ beforeIds: new Set(['old']) }))
    expect(container.querySelector('[data-meal="old"]')).not.toHaveClass('fj-landing')
  })

  it('falls back to the saved id when the server text or clock disagrees', () => {
    const meal = makeMeal('srv', 'Oats (server-normalised)', new Date(Date.now() - 120_000))
    const { container } = renderLog([meal], makeFlight({ savedId: 'srv' }))
    expect(container.querySelector('[data-meal="srv"]')).toHaveClass('fj-landing')
  })

  it('announces a freshly created meal that this device did not log', () => {
    const meal = makeMeal('remote', 'Salad', new Date(Date.now() - 1000))
    const { onFresh } = renderLog([meal])
    expect(onFresh).toHaveBeenCalledWith(meal)
  })

  it('does not announce meals that are simply old', () => {
    const meal = makeMeal('old', 'Salad', new Date(Date.now() - 3600_000))
    const { onFresh } = renderLog([meal])
    expect(onFresh).not.toHaveBeenCalled()
  })

  it('announces the landing meal only once, not again as an arrival', () => {
    const meal = makeMeal('new', 'Oats', new Date())
    const { onFresh } = renderLog([meal], makeFlight())
    expect(onFresh).toHaveBeenCalledTimes(1)
  })
})
