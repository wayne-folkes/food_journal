import { act, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => {
  const mockSetAuthed = vi.fn()
  const mockLoadDay = vi.fn()
  const mockAddMeal = vi.fn()
  const mockEditMeal = vi.fn()
  const mockDeleteMeal = vi.fn()
  const mockSyncLocalToRemote = vi.fn()
  const mockUpdateItemCalories = vi.fn()
  const mockLoadWeek = vi.fn()
  const mockLoadItemHistory = vi.fn()
  const mockSetState = vi.fn()
  const mockClearStorage = vi.fn()

  const mockStoreState = {
    meals: [
      {
        id: 'local-1',
        user_id: null,
        meal_type: 'snack' as const,
        consumed_at: '2026-04-17T09:00:00.000Z',
        raw_input: 'apple',
        created_at: '2026-04-17T09:00:00.000Z',
        updated_at: '2026-04-17T09:00:00.000Z',
        items: [
          {
            id: 'local-item-1',
            meal_id: 'local-1',
            description: 'apple',
            position: 0,
            consumed_at: '2026-04-17T09:00:00.000Z',
            created_at: '2026-04-17T09:00:00.000Z',
            calories: null,
          },
        ],
      },
    ],
    isAuthed: false,
    isLoading: false,
    weekMeals: [],
    weekLoading: false,
    itemHistory: [],
    setAuthed: mockSetAuthed,
    loadDay: mockLoadDay,
    addMeal: mockAddMeal,
    editMeal: mockEditMeal,
    deleteMeal: mockDeleteMeal,
    syncLocalToRemote: mockSyncLocalToRemote,
    updateItemCalories: mockUpdateItemCalories,
    loadWeek: mockLoadWeek,
    loadItemHistory: mockLoadItemHistory,
  }

  const mockUseEntriesStore = Object.assign(
    vi.fn(() => mockStoreState),
    {
      getState: () => mockStoreState,
      setState: mockSetState,
      persist: {
        clearStorage: mockClearStorage,
      },
    }
  )

  return {
    authStateChangeHandler: null as ((event: string, session: { user: { id: string; app_metadata?: Record<string, unknown> } } | null) => void | Promise<void>) | null,
    mockSetAuthed,
    mockLoadDay,
    mockAddMeal,
    mockEditMeal,
    mockDeleteMeal,
    mockSyncLocalToRemote,
    mockUpdateItemCalories,
    mockLoadWeek,
    mockLoadItemHistory,
    mockSetState,
    mockClearStorage,
    mockUseEntriesStore,
  }
})

vi.mock('./lib/store', () => ({
  useEntriesStore: mocks.mockUseEntriesStore,
  todayString: () => '2026-04-17',
  getWeekBounds: () => ({ start: '2026-04-14', end: '2026-04-20' }),
}))

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        mocks.authStateChangeHandler = callback
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }
      }),
    },
  },
}))

vi.mock('./components/MealComposer', () => ({ MealComposer: () => null }))
vi.mock('./components/MealLog', () => ({ MealLog: () => null }))
vi.mock('./components/EditMealModal', () => ({ EditMealModal: () => null }))
vi.mock('./components/AuthButton', () => ({ AuthButton: () => null }))
vi.mock('./components/DateNav', () => ({ DateNav: () => null }))
vi.mock('./components/DaySummary', () => ({ DaySummary: () => null }))
vi.mock('./components/SearchOverlay', () => ({ SearchOverlay: () => null }))
vi.mock('./components/AdminPanel', () => ({ AdminPanel: () => null }))
vi.mock('./components/WeekView', () => ({ WeekView: () => null }))
vi.mock('./lib/caloriesLookup', () => ({ lookupCalories: vi.fn() }))
vi.mock('./lib/date', () => ({ offsetDate: vi.fn((date: string) => date) }))
vi.mock('./lib/analytics', () => ({ track: vi.fn() }))
vi.mock('./lib/logger', () => ({ log: { withMetadata: vi.fn(() => ({ error: vi.fn(), warn: vi.fn() })) } }))

import App from './App'

describe('App auth privacy', () => {
  beforeEach(() => {
    mocks.authStateChangeHandler = null
    mocks.mockSetAuthed.mockReset()
    mocks.mockLoadDay.mockReset()
    mocks.mockAddMeal.mockReset()
    mocks.mockEditMeal.mockReset()
    mocks.mockDeleteMeal.mockReset()
    mocks.mockSyncLocalToRemote.mockReset()
    mocks.mockUpdateItemCalories.mockReset()
    mocks.mockLoadWeek.mockReset()
    mocks.mockLoadItemHistory.mockReset()
    mocks.mockSetState.mockReset()
    mocks.mockClearStorage.mockReset()
  })

  it('clears local anonymous meals on sign-in instead of syncing them into the account', async () => {
    render(<App />)

    expect(mocks.authStateChangeHandler).not.toBeNull()

    await act(async () => {
      await mocks.authStateChangeHandler?.('SIGNED_IN', { user: { id: 'user-1', app_metadata: {} } })
    })

    expect(mocks.mockSyncLocalToRemote).not.toHaveBeenCalled()
    expect(mocks.mockSetState).toHaveBeenCalledWith({ meals: [], dayCache: {}, weekMeals: [], itemHistory: [] })
    expect(mocks.mockClearStorage).toHaveBeenCalledTimes(1)
    expect(mocks.mockSetAuthed).toHaveBeenCalledWith(true)

    await waitFor(() => {
      expect(screen.getByText('Local device-only meals were cleared on sign-in to protect privacy.')).toBeInTheDocument()
    })
  })
})