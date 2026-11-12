import { act, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => {
  const mockSetAuthed = vi.fn()
  const mockLoadDay = vi.fn()
  const mockAddMeal = vi.fn()
  const mockEditMeal = vi.fn()
  const mockDeleteMeal = vi.fn()
  const mockSyncLocalToRemote = vi.fn()
  const mockUpdateItemCalories = vi.fn()
  const mockUpdateItemNutrients = vi.fn()
  const mockLookupCalories = vi.fn()
  const mealLogProps: { current: { onEstimateCalories?: (meal: unknown) => Promise<void> } | null } = { current: null }
  const mockLoadWeek = vi.fn()
  const mockLoadItemHistory = vi.fn()
  const mockSetState = vi.fn()
  const mockClearStorage = vi.fn()
  const mockStash = vi.fn()
  const mockRestore = vi.fn()

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
            protein_g: null,
            fiber_g: null,
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
    updateItemNutrients: mockUpdateItemNutrients,
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
    mockUpdateItemNutrients,
    mockLookupCalories,
    mealLogProps,
    mockStoreState,
    mockLoadWeek,
    mockLoadItemHistory,
    mockSetState,
    mockClearStorage,
    mockStash,
    mockRestore,
    mockUseEntriesStore,
  }
})

vi.mock('./lib/store', () => ({
  useEntriesStore: mocks.mockUseEntriesStore,
  todayString: () => '2026-04-17',
  getWeekBounds: () => ({ start: '2026-04-14', end: '2026-04-20' }),
  stashLocalMealsForSync: mocks.mockStash,
  restoreUnsyncedMeals: mocks.mockRestore,
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

vi.mock('./components/MealLog', () => ({
  MealLog: (props: { onEstimateCalories?: (meal: unknown) => Promise<void> }) => {
    mocks.mealLogProps.current = props
    return null
  },
}))
vi.mock('./components/EditMealModal', () => ({ EditMealModal: () => null }))
vi.mock('./components/AuthButton', () => ({ AuthButton: () => null }))
vi.mock('./components/TopBar', () => ({ TopBar: () => null }))
vi.mock('./components/Compose', () => ({ Compose: () => null }))
vi.mock('./components/SearchOverlay', () => ({ SearchOverlay: () => null }))
vi.mock('./components/AdminPanel', () => ({ AdminPanel: () => null }))
vi.mock('./components/WeekView', () => ({ WeekView: () => null }))
vi.mock('./lib/caloriesLookup', () => ({
  lookupCalories: mocks.mockLookupCalories,
  calorieSourceLabel: () => 'USDA',
}))
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
    mocks.mockUpdateItemNutrients.mockReset()
    mocks.mockLookupCalories.mockReset()
    mocks.mockLoadWeek.mockReset()
    mocks.mockLoadItemHistory.mockReset()
    mocks.mockSetState.mockReset()
    mocks.mockClearStorage.mockReset()
    mocks.mockStash.mockReset().mockImplementation(() => mocks.mockStoreState.meals.filter((m) => m.user_id === null))
    mocks.mockRestore.mockReset()
    mocks.mockSyncLocalToRemote.mockResolvedValue({ synced: 1, failed: 0 })
  })

  const signIn = (event: string, id = 'user-1') =>
    act(async () => {
      await mocks.authStateChangeHandler?.(event, { user: { id, app_metadata: {} } })
    })

  it('uploads local anonymous meals on sign-in, resets local state and reports success', async () => {
    render(<App />)
    expect(mocks.authStateChangeHandler).not.toBeNull()

    await signIn('SIGNED_IN')

    await waitFor(() => expect(mocks.mockSyncLocalToRemote).toHaveBeenCalledTimes(1))
    expect(mocks.mockSyncLocalToRemote).toHaveBeenCalledWith(mocks.mockStoreState.meals)
    expect(mocks.mockSetState).toHaveBeenCalledWith({ meals: [], dayCache: {}, weekMeals: [], itemHistory: [] })
    expect(mocks.mockClearStorage).toHaveBeenCalledTimes(1)
    expect(mocks.mockSetAuthed).toHaveBeenCalledWith(true)
    expect(await screen.findByText('Synced 1 meal from this device to your account')).toBeInTheDocument()
    // days are reloaded after the upload so the uploaded meals show up
    await waitFor(() => expect(mocks.mockLoadDay.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('does not call the upload synchronously inside the auth callback', async () => {
    render(<App />)
    let calledInsideCallback = true
    await act(async () => {
      await mocks.authStateChangeHandler?.('SIGNED_IN', { user: { id: 'user-1', app_metadata: {} } })
      calledInsideCallback = mocks.mockSyncLocalToRemote.mock.calls.length > 0
    })
    expect(calledInsideCallback).toBe(false)
    await waitFor(() => expect(mocks.mockSyncLocalToRemote).toHaveBeenCalledTimes(1))
  })

  it('keeps meals for retry and shows an error toast when the upload fails', async () => {
    mocks.mockSyncLocalToRemote.mockResolvedValue({ synced: 0, failed: 1 })
    render(<App />)

    await signIn('SIGNED_IN')

    expect(await screen.findByText(/kept on this device and will retry on next sign-in/)).toBeInTheDocument()
    expect(screen.queryByText(/Synced/)).not.toBeInTheDocument()
  })

  it('uploads nothing when switching from one account to another', async () => {
    render(<App />)
    await signIn('SIGNED_IN', 'user-1')
    await waitFor(() => expect(mocks.mockSyncLocalToRemote).toHaveBeenCalledTimes(1))
    mocks.mockSyncLocalToRemote.mockClear()
    mocks.mockStash.mockClear()
    mocks.mockSetState.mockClear()

    await signIn('SIGNED_IN', 'user-2')
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })

    expect(mocks.mockStash).not.toHaveBeenCalled()
    expect(mocks.mockSyncLocalToRemote).not.toHaveBeenCalled()
    expect(mocks.mockSetState).toHaveBeenCalledWith({ meals: [], dayCache: {}, weekMeals: [], itemHistory: [] })
  })

  it('uploads once when sign-in events repeat', async () => {
    render(<App />)
    await signIn('INITIAL_SESSION')
    await signIn('SIGNED_IN')
    await signIn('TOKEN_REFRESHED')
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })

    expect(mocks.mockSyncLocalToRemote).toHaveBeenCalledTimes(1)
  })

  it('restores parked meals to the anonymous view on sign-out', async () => {
    render(<App />)
    await signIn('SIGNED_IN')
    await waitFor(() => expect(mocks.mockSyncLocalToRemote).toHaveBeenCalled())
    mocks.mockSyncLocalToRemote.mockClear()

    await act(async () => { await mocks.authStateChangeHandler?.('SIGNED_OUT', null) })

    expect(mocks.mockRestore).toHaveBeenCalled()
    expect(mocks.mockSyncLocalToRemote).not.toHaveBeenCalled()
  })
})

describe('App nutrition estimate', () => {
  type Item = { id: string; description: string; calories: number | null; protein_g?: number | null; fiber_g?: number | null }
  const meal = () => mocks.mockStoreState.meals[0] as unknown as { items: Item[] }

  beforeEach(() => {
    mocks.mockUpdateItemNutrients.mockReset().mockResolvedValue(undefined)
    mocks.mockLookupCalories.mockReset()
    Object.assign(meal().items[0], { calories: null, protein_g: null, fiber_g: null })
  })

  async function estimate() {
    render(<App />)
    await act(async () => {
      await mocks.mealLogProps.current?.onEstimateCalories?.(mocks.mockStoreState.meals[0])
    })
  }

  it('only fills fields that are still empty and reports a nutrition toast', async () => {
    meal().items[0].calories = 50
    mocks.mockLookupCalories.mockResolvedValue([
      { id: 'local-item-1', description: 'apple', calories: 95, protein_g: 0.5, fiber_g: 4.4, source: 'usda' },
    ])

    await estimate()

    expect(mocks.mockLookupCalories).toHaveBeenCalledWith([{ id: 'local-item-1', description: 'apple' }])
    expect(mocks.mockUpdateItemNutrients).toHaveBeenCalledTimes(1)
    expect(mocks.mockUpdateItemNutrients).toHaveBeenCalledWith('local-item-1', { protein_g: 0.5, fiber_g: 4.4 })
    expect(await screen.findByText('Got nutrition estimate for 1 item from USDA')).toBeInTheDocument()
  })

  it('treats pre-migration items (undefined protein/fiber) as needing an estimate', async () => {
    meal().items[0].calories = 50
    delete meal().items[0].protein_g
    delete meal().items[0].fiber_g
    mocks.mockLookupCalories.mockResolvedValue([
      { id: 'local-item-1', description: 'apple', calories: null, protein_g: 1, fiber_g: null, source: 'ai' },
    ])

    await estimate()

    expect(mocks.mockUpdateItemNutrients).toHaveBeenCalledWith('local-item-1', { protein_g: 1 })
  })

  it('does not look anything up when every item is complete', async () => {
    Object.assign(meal().items[0], { calories: 95, protein_g: 0.5, fiber_g: 4.4 })

    await estimate()

    expect(mocks.mockLookupCalories).not.toHaveBeenCalled()
  })

  it('shows an error toast when no nutrition data is found', async () => {
    mocks.mockLookupCalories.mockResolvedValue([
      { id: 'local-item-1', description: 'apple', calories: null, protein_g: null, fiber_g: null, source: 'not_found' },
    ])

    await estimate()

    expect(mocks.mockUpdateItemNutrients).not.toHaveBeenCalled()
    expect(await screen.findByText('No nutrition data found for these items')).toBeInTheDocument()
  })

  it('shows an error toast when the lookup fails', async () => {
    mocks.mockLookupCalories.mockRejectedValue(new Error('boom'))

    await estimate()

    expect(await screen.findByText('Failed to estimate nutrition')).toBeInTheDocument()
  })
})

describe('App undo delete', () => {
  it('restores nutrient values on the re-created meal items', async () => {
    const original = {
      id: 'm-del', user_id: 'u', meal_type: 'snack' as const, consumed_at: '2026-04-17T09:00:00.000Z',
      raw_input: 'apple, toast', created_at: '', updated_at: '',
      items: [
        { id: 'a', meal_id: 'm-del', description: 'apple', position: 0, consumed_at: '', created_at: '', calories: 95, protein_g: 0.5, fiber_g: 4.4 },
        { id: 'b', meal_id: 'm-del', description: 'toast', position: 1, consumed_at: '', created_at: '', calories: null, protein_g: null, fiber_g: null },
        { id: 'c', meal_id: 'm-del', description: 'jam', position: 2, consumed_at: '', created_at: '', calories: 50, protein_g: null, fiber_g: null },
      ],
    }
    const saved = mocks.mockStoreState.meals
    mocks.mockStoreState.meals = [original] as unknown as typeof saved
    mocks.mockDeleteMeal.mockReset().mockResolvedValue(undefined)
    mocks.mockUpdateItemNutrients.mockReset().mockResolvedValue(undefined)
    mocks.mockAddMeal.mockReset().mockResolvedValue({
      ...original,
      id: 'm-new',
      items: original.items.map((i) => ({ ...i, id: `${i.id}-new`, calories: null, protein_g: null, fiber_g: null })),
    })

    try {
      render(<App />)
      await act(async () => {
        await (mocks.mealLogProps.current as unknown as { onDelete: (id: string) => Promise<boolean> }).onDelete('m-del')
      })
      await act(async () => {
        screen.getByRole('button', { name: 'Undo' }).click()
      })
      await waitFor(() => expect(mocks.mockUpdateItemNutrients).toHaveBeenCalledTimes(2))
      expect(mocks.mockUpdateItemNutrients).toHaveBeenCalledWith('a-new', { calories: 95, protein_g: 0.5, fiber_g: 4.4 })
      expect(mocks.mockUpdateItemNutrients).toHaveBeenCalledWith('c-new', { calories: 50 })
    } finally {
      mocks.mockStoreState.meals = saved
    }
  })
})
