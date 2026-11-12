import { fireEvent, render, screen } from '@testing-library/react'

const state = vi.hoisted(() => ({
  s: {
    meals: [] as unknown[],
    isAuthed: true,
    isLoading: false,
    weekMeals: [],
    weekLoading: false,
    itemHistory: ['Almonds', 'Eggs'],
    setAuthed: vi.fn(),
    loadDay: vi.fn(),
    addMeal: vi.fn(),
    editMeal: vi.fn(),
    deleteMeal: vi.fn(),
    syncLocalToRemote: vi.fn(),
    updateItemCalories: vi.fn(),
    updateItemNutrients: vi.fn(),
    loadWeek: vi.fn(),
    loadItemHistory: vi.fn(),
  },
}))

vi.mock('./lib/store', () => ({
  useEntriesStore: Object.assign(vi.fn(() => state.s), { getState: () => state.s, setState: vi.fn(), persist: { clearStorage: vi.fn() } }),
  todayString: () => '2026-04-17',
  getWeekBounds: () => ({ start: '2026-04-14', end: '2026-04-20' }),
}))
vi.mock('./lib/supabase', () => ({
  supabase: { auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) } },
}))
vi.mock('./components/MealLog', () => ({ MealLog: () => null }))
vi.mock('./components/EditMealModal', () => ({ EditMealModal: () => null }))
vi.mock('./components/AuthButton', () => ({ AuthButton: () => null }))
vi.mock('./components/TopBar', () => ({ TopBar: () => null }))
vi.mock('./components/SearchOverlay', () => ({ SearchOverlay: () => null }))
vi.mock('./components/AdminPanel', () => ({ AdminPanel: () => null }))
vi.mock('./components/WeekView', () => ({ WeekView: () => null }))
vi.mock('./lib/caloriesLookup', () => ({ lookupCalories: vi.fn(), calorieSourceLabel: () => 'USDA' }))
vi.mock('./lib/date', () => ({ offsetDate: vi.fn((d: string) => d) }))
vi.mock('./lib/analytics', () => ({ track: vi.fn() }))
vi.mock('./lib/logger', () => ({ log: { withMetadata: vi.fn(() => ({ error: vi.fn(), warn: vi.fn() })) } }))

import App from './App'

function setViewport(mobile: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('max-width') ? mobile : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

const input = () => screen.getByLabelText('What did you eat?') as HTMLInputElement
const chip = (name: string) => screen.queryByRole('button', { name: new RegExp(name) })

beforeEach(() => {
  state.s.isAuthed = true
  state.s.itemHistory = ['Almonds', 'Eggs']
})

// Regression: the Liquid Glass redesign rendered the chips only on desktop, so
// on phones (docked compose bar) there was nothing to tap.
describe.each([
  ['desktop', false],
  ['phone', true],
])('recent chips on %s', (_name, mobile) => {
  beforeEach(() => setViewport(mobile))

  it('tapping a chip fills the compose input', () => {
    render(<App />)
    fireEvent.click(chip('Almonds')!)
    expect(input().value).toBe('Almonds')
  })

  it('a second tap appends after a comma', () => {
    render(<App />)
    fireEvent.click(chip('Almonds')!)
    fireEvent.click(chip('Eggs')!)
    expect(input().value).toBe('Almonds, Eggs')
  })

  it('shows no chips when signed out', () => {
    state.s.isAuthed = false
    render(<App />)
    expect(chip('Almonds')).toBeNull()
  })

  it('shows no chips when there is no history', () => {
    state.s.itemHistory = []
    render(<App />)
    expect(chip('Almonds')).toBeNull()
  })
})
