const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    configurable: true,
  })
})

vi.mock('./supabase', () => ({
  supabase: mockSupabase,
}))

import type { MealWithItems } from '@shared/types/database'
import { useEntriesStore } from './store'

function makeStoredMeal({
  id,
  description,
  consumedAt,
  userId,
}: {
  id: string
  description: string
  consumedAt: string
  userId: string | null
}): MealWithItems {
  return {
    id,
    user_id: userId,
    meal_type: 'snack',
    consumed_at: consumedAt,
    raw_input: description,
    headline: null,
    note: null,
    created_at: consumedAt,
    updated_at: consumedAt,
    items: [
      {
        id: `${id}-item`,
        meal_id: id,
        description,
        position: 0,
        consumed_at: consumedAt,
        created_at: consumedAt,
        calories: null,
        protein_g: null,
        fiber_g: null,
        qty: null,
      },
    ],
  }
}

afterEach(() => {
  vi.mocked(localStorage.getItem).mockReset().mockReturnValue(null)
})

const setItemCalls = () =>
  (localStorage.setItem as unknown as { mock: { calls: string[][] } }).mock.calls.filter(
    (c) => c[0] === 'food_journal_unsynced_meals'
  )

describe('useEntriesStore.addMeal', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset()
    mockSupabase.rpc.mockReset()
    mockSupabase.auth.getUser.mockReset()
    useEntriesStore.setState({ meals: [], isAuthed: false, isLoading: false })
  })

  it('returns the created local meal with item ids and consumed_at for anonymous users', async () => {
    const created = await useEntriesStore.getState().addMeal({
      meal_type: 'breakfast',
      consumed_at: '2026-04-15T09:00:00.000Z',
      raw_input: 'coffee, toast',
      items: ['coffee', 'toast'],
    })

    expect(created.raw_input).toBe('coffee, toast')
    expect(created.items).toHaveLength(2)
    expect(created.items[0].id).toBeTruthy()
    expect(created.items[0].consumed_at).toBe('2026-04-15T09:00:00.000Z')
    expect(useEntriesStore.getState().meals).toHaveLength(1)
    expect(useEntriesStore.getState().meals[0].id).toBe(created.id)
  })

  it('returns the inserted remote meal so callers can target exact item ids', async () => {
    useEntriesStore.setState({ meals: [], isAuthed: true, isLoading: false })

    const insertedMeal = {
      id: 'meal-1',
      user_id: 'user-1',
      meal_type: 'drink' as const,
      consumed_at: '2026-04-15T10:00:00.000Z',
      raw_input: 'coffee',
      headline: null,
      note: null,
      created_at: '2026-04-15T10:00:00.000Z',
      updated_at: '2026-04-15T10:00:00.000Z',
      items: [
        {
          id: 'item-1',
          meal_id: 'meal-1',
          description: 'coffee',
          position: 0,
          consumed_at: '2026-04-15T10:00:00.000Z',
          created_at: '2026-04-15T10:00:00.000Z',
          calories: null,
          protein_g: null,
          fiber_g: null,
          qty: null,
        },
      ],
    }

    mockSupabase.rpc.mockResolvedValue({ data: insertedMeal, error: null })

    const created = await useEntriesStore.getState().addMeal({
      meal_type: 'drink',
      consumed_at: '2026-04-15T10:00:00.000Z',
      raw_input: 'coffee',
      items: ['coffee'],
    })

    expect(created.id).toBe('meal-1')
    expect(created.items[0].id).toBe('item-1')
    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_meal_with_items', {
      p_meal_type: 'drink',
      p_consumed_at: '2026-04-15T10:00:00.000Z',
      p_raw_input: 'coffee',
      p_items: [
        {
          description: 'coffee',
          position: 0,
          consumed_at: '2026-04-15T10:00:00.000Z',
          calories: null,
          protein_g: null,
          fiber_g: null,
        },
      ],
    })
  })

  it('throws when the RPC meal payload is malformed', async () => {
    useEntriesStore.setState({ meals: [], isAuthed: true, isLoading: false })
    mockSupabase.rpc.mockResolvedValue({
      data: { id: 'meal-1', meal_type: 'drink' },
      error: null,
    })

    await expect(useEntriesStore.getState().addMeal({
      meal_type: 'drink',
      consumed_at: '2026-04-15T10:00:00.000Z',
      raw_input: 'coffee',
      items: ['coffee'],
    })).rejects.toThrow('Invalid meal payload returned from create_meal_with_items')

    expect(useEntriesStore.getState().meals).toEqual([])
  })

  it('updates an authenticated meal via RPC so the meal and items change atomically', async () => {
    const existingMeal = {
      id: 'meal-1',
      user_id: 'user-1',
      meal_type: 'drink' as const,
      consumed_at: '2026-04-15T10:00:00.000Z',
      raw_input: 'coffee',
      headline: null,
      note: null,
      created_at: '2026-04-15T10:00:00.000Z',
      updated_at: '2026-04-15T10:00:00.000Z',
      items: [
        {
          id: 'item-1',
          meal_id: 'meal-1',
          description: 'coffee',
          position: 0,
          consumed_at: '2026-04-15T10:00:00.000Z',
          created_at: '2026-04-15T10:00:00.000Z',
          calories: null,
          protein_g: null,
          fiber_g: null,
          qty: null,
        },
      ],
    }
    const updatedMeal = {
      ...existingMeal,
      meal_type: 'breakfast' as const,
      consumed_at: '2026-04-15T11:00:00.000Z',
      raw_input: 'espresso',
      updated_at: '2026-04-15T11:00:00.000Z',
      items: [
        {
          id: 'item-2',
          meal_id: 'meal-1',
          description: 'espresso',
          position: 0,
          consumed_at: '2026-04-15T11:00:00.000Z',
          created_at: '2026-04-15T11:00:00.000Z',
          calories: 5,
          protein_g: null,
          fiber_g: null,
          qty: null,
        },
      ],
    }

    useEntriesStore.setState({ meals: [existingMeal], isAuthed: true, isLoading: false })
    mockSupabase.rpc.mockResolvedValue({ data: updatedMeal, error: null })

    await useEntriesStore.getState().editMeal('meal-1', {
      meal_type: 'breakfast',
      consumed_at: '2026-04-15T11:00:00.000Z',
      items: [{ id: 'item-1', description: 'espresso', calories: 5, protein_g: 0.1, fiber_g: 0 }],
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith('update_meal_with_items', {
      p_meal_id: 'meal-1',
      p_meal_type: 'breakfast',
      p_consumed_at: '2026-04-15T11:00:00.000Z',
      p_raw_input: 'espresso',
      p_items: [
        {
          description: 'espresso',
          position: 0,
          consumed_at: '2026-04-15T11:00:00.000Z',
          calories: 5,
          protein_g: 0.1,
          fiber_g: 0,
        },
      ],
    })
    expect(useEntriesStore.getState().meals[0]).toEqual(updatedMeal)
  })

  it('retains local meals that fail during sync while replacing successful ones with remote copies', async () => {
    const firstLocalMeal = {
      id: 'local-1',
      user_id: null,
      meal_type: 'snack' as const,
      consumed_at: '2026-04-15T12:00:00.000Z',
      raw_input: 'apple',
      headline: null,
      note: null,
      created_at: '2026-04-15T12:00:00.000Z',
      updated_at: '2026-04-15T12:00:00.000Z',
      items: [
        {
          id: 'local-item-1',
          meal_id: 'local-1',
          description: 'apple',
          position: 0,
          consumed_at: '2026-04-15T12:00:00.000Z',
          created_at: '2026-04-15T12:00:00.000Z',
          calories: 95,
          protein_g: 0.5,
          fiber_g: 4.4,
          qty: null,
        },
      ],
    }
    const secondLocalMeal = {
      id: 'local-2',
      user_id: null,
      meal_type: 'lunch' as const,
      consumed_at: '2026-04-15T13:00:00.000Z',
      raw_input: 'sandwich',
      headline: null,
      note: null,
      created_at: '2026-04-15T13:00:00.000Z',
      updated_at: '2026-04-15T13:00:00.000Z',
      items: [
        {
          id: 'local-item-2',
          meal_id: 'local-2',
          description: 'sandwich',
          position: 0,
          consumed_at: '2026-04-15T13:00:00.000Z',
          created_at: '2026-04-15T13:00:00.000Z',
          calories: 300,
          protein_g: null,
          fiber_g: null,
          qty: null,
        },
      ],
    }
    const syncedRemoteMeal = {
      id: 'remote-1',
      user_id: 'user-1',
      meal_type: 'snack' as const,
      consumed_at: '2026-04-15T12:00:00.000Z',
      raw_input: 'apple',
      headline: null,
      note: null,
      created_at: '2026-04-15T12:00:00.000Z',
      updated_at: '2026-04-15T12:00:00.000Z',
      items: [
        {
          id: 'remote-item-1',
          meal_id: 'remote-1',
          description: 'apple',
          position: 0,
          consumed_at: '2026-04-15T12:00:00.000Z',
          created_at: '2026-04-15T12:00:00.000Z',
          calories: 95,
          protein_g: null,
          fiber_g: null,
          qty: null,
        },
      ],
    }

    useEntriesStore.setState({ meals: [], isAuthed: true, isLoading: false, dayCache: { '2026-04-15': [], '2026-04-14': [] } })
    mockSupabase.rpc.mockResolvedValue({
      data: [
        { local_id: 'local-1', meal: syncedRemoteMeal },
        { local_id: 'local-2', error: 'insert failed' },
      ],
      error: null,
    })

    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ userId: 'user-1', meals: [firstLocalMeal, secondLocalMeal] })
    )
    const result = await useEntriesStore.getState().syncLocalToRemote([firstLocalMeal, secondLocalMeal], 'user-1')

    expect(result).toEqual({ synced: 1, failed: 1, unknown: 0 })
    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled()
    // the failed meal is parked for retry; the synced day is invalidated, others kept
    expect(JSON.parse(setItemCalls().at(-1)![1])).toEqual({ userId: 'user-1', meals: [secondLocalMeal] })
    expect(Object.keys(useEntriesStore.getState().dayCache)).toEqual(['2026-04-14'])
    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_meals_with_items_batch', {
      p_meals: [
        {
          local_id: 'local-1',
          meal_type: 'snack',
          consumed_at: '2026-04-15T12:00:00.000Z',
          raw_input: 'apple',
          items: [
            {
              description: 'apple',
              position: 0,
              consumed_at: '2026-04-15T12:00:00.000Z',
              calories: 95,
              protein_g: 0.5,
              fiber_g: 4.4,
            },
          ],
        },
        {
          local_id: 'local-2',
          meal_type: 'lunch',
          consumed_at: '2026-04-15T13:00:00.000Z',
          raw_input: 'sandwich',
          items: [
            {
              description: 'sandwich',
              position: 0,
              consumed_at: '2026-04-15T13:00:00.000Z',
              calories: 300,
              protein_g: null,
              fiber_g: null,
            },
          ],
        },
      ],
    })
  })

  it('syncs local meals with a single batch RPC call', async () => {
    const localMeals = [
      makeStoredMeal({
        id: 'local-1',
        description: 'apple',
        consumedAt: '2026-04-15T12:00:00.000Z',
        userId: null,
      }),
      makeStoredMeal({
        id: 'local-2',
        description: 'sandwich',
        consumedAt: '2026-04-15T13:00:00.000Z',
        userId: null,
      }),
      makeStoredMeal({
        id: 'local-3',
        description: 'coffee',
        consumedAt: '2026-04-15T14:00:00.000Z',
        userId: null,
      }),
    ]
    const remoteMeals = [
      makeStoredMeal({
        id: 'remote-1',
        description: 'apple',
        consumedAt: '2026-04-15T12:00:00.000Z',
        userId: 'user-1',
      }),
      makeStoredMeal({
        id: 'remote-2',
        description: 'sandwich',
        consumedAt: '2026-04-15T13:00:00.000Z',
        userId: 'user-1',
      }),
      makeStoredMeal({
        id: 'remote-3',
        description: 'coffee',
        consumedAt: '2026-04-15T14:00:00.000Z',
        userId: 'user-1',
      }),
    ]

    useEntriesStore.setState({ meals: [], isAuthed: true, isLoading: false })
    mockSupabase.rpc.mockResolvedValue({
      data: [
        { local_id: 'local-1', meal: remoteMeals[0] },
        { local_id: 'local-2', meal: remoteMeals[1] },
        { local_id: 'local-3', meal: remoteMeals[2] },
      ],
      error: null,
    })

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ userId: 'user-1', meals: localMeals }))
    const result = await useEntriesStore.getState().syncLocalToRemote(localMeals, 'user-1')

    expect(result).toEqual({ synced: 3, failed: 0, unknown: 0 })
    expect(localStorage.removeItem).toHaveBeenCalledWith('food_journal_unsynced_meals')
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_meals_with_items_batch', {
      p_meals: [
        {
          local_id: 'local-1',
          meal_type: 'snack',
          consumed_at: '2026-04-15T12:00:00.000Z',
          raw_input: 'apple',
          items: [
            {
              description: 'apple',
              position: 0,
              consumed_at: '2026-04-15T12:00:00.000Z',
              calories: null,
              protein_g: null,
              fiber_g: null,
            },
          ],
        },
        {
          local_id: 'local-2',
          meal_type: 'snack',
          consumed_at: '2026-04-15T13:00:00.000Z',
          raw_input: 'sandwich',
          items: [
            {
              description: 'sandwich',
              position: 0,
              consumed_at: '2026-04-15T13:00:00.000Z',
              calories: null,
              protein_g: null,
              fiber_g: null,
            },
          ],
        },
        {
          local_id: 'local-3',
          meal_type: 'snack',
          consumed_at: '2026-04-15T14:00:00.000Z',
          raw_input: 'coffee',
          items: [
            {
              description: 'coffee',
              position: 0,
              consumed_at: '2026-04-15T14:00:00.000Z',
              calories: null,
              protein_g: null,
              fiber_g: null,
            },
          ],
        },
      ],
    })
  })

  it('removes an anonymous meal from local state without calling supabase', async () => {
    const localMeal = makeStoredMeal({
      id: 'local-1',
      description: 'apple',
      consumedAt: '2026-04-15T12:00:00.000Z',
      userId: null,
    })
    useEntriesStore.setState({ meals: [localMeal], isAuthed: false, isLoading: false })

    await useEntriesStore.getState().deleteMeal('local-1')

    expect(useEntriesStore.getState().meals).toEqual([])
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('deletes an authenticated meal via supabase and removes it from state', async () => {
    const remoteMeal = makeStoredMeal({
      id: 'meal-1',
      description: 'salad',
      consumedAt: '2026-04-15T12:00:00.000Z',
      userId: 'user-1',
    })
    useEntriesStore.setState({ meals: [remoteMeal], isAuthed: true, isLoading: false })

    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ delete: mockDelete })

    await useEntriesStore.getState().deleteMeal('meal-1')

    expect(mockSupabase.from).toHaveBeenCalledWith('meals')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 'meal-1')
    expect(useEntriesStore.getState().meals).toEqual([])
  })

  it('throws and keeps the meal in state when supabase delete fails', async () => {
    const remoteMeal = makeStoredMeal({
      id: 'meal-1',
      description: 'salad',
      consumedAt: '2026-04-15T12:00:00.000Z',
      userId: 'user-1',
    })
    useEntriesStore.setState({ meals: [remoteMeal], isAuthed: true, isLoading: false })

    const dbError = { message: 'delete failed' }
    const mockEq = vi.fn().mockResolvedValue({ error: dbError })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ delete: mockDelete })

    await expect(useEntriesStore.getState().deleteMeal('meal-1')).rejects.toEqual(dbError)

    // Meal should remain in state since delete failed
    expect(useEntriesStore.getState().meals).toHaveLength(1)
    expect(useEntriesStore.getState().meals[0].id).toBe('meal-1')
  })

  it('invalidates the day cache for the deleted meal date', async () => {
    const remoteMeal = makeStoredMeal({
      id: 'meal-1',
      description: 'salad',
      consumedAt: '2026-04-15T12:00:00.000Z',
      userId: 'user-1',
    })
    useEntriesStore.setState({
      meals: [remoteMeal],
      isAuthed: true,
      isLoading: false,
      dayCache: { '2026-04-15': [remoteMeal], '2026-04-14': [] },
    })

    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ delete: mockDelete })

    await useEntriesStore.getState().deleteMeal('meal-1')

    // Cache for the deleted meal's date should be invalidated
    const cache = useEntriesStore.getState().dayCache
    expect(cache['2026-04-15']).toBeUndefined()
    // Other dates should remain
    expect(cache['2026-04-14']).toEqual([])
  })

  it('passes wildcard characters through to the search RPC as literal user input', async () => {
    useEntriesStore.setState({ meals: [], isAuthed: true, isLoading: false })

    mockSupabase.rpc.mockResolvedValue({ data: [], error: null })

    await expect(useEntriesStore.getState().searchMeals(' 50%_milk ')).resolves.toEqual([])

    expect(mockSupabase.rpc).toHaveBeenCalledWith('search_meals', { p_query: '50%_milk' })
  })

  it('searches authenticated meals through the search_meals RPC', async () => {
    useEntriesStore.setState({ meals: [], isAuthed: true, isLoading: false })
    mockSupabase.rpc.mockResolvedValue({
      data: [
        {
          id: 'meal-1',
          user_id: 'user-1',
          consumed_at: '2026-04-15T09:00:00.000Z',
          meal_type: 'breakfast',
          raw_input: 'coffee, toast',
          headline: null,
          note: null,
          created_at: '2026-04-15T09:00:00.000Z',
          updated_at: '2026-04-15T09:00:00.000Z',
          items: [
            {
              id: 'item-1',
              meal_id: 'meal-1',
              description: 'coffee',
              position: 0,
              consumed_at: '2026-04-15T09:00:00.000Z',
              created_at: '2026-04-15T09:00:00.000Z',
              calories: null,
              protein_g: null,
              fiber_g: null,
              qty: null,
            },
            {
              id: 'item-2',
              meal_id: 'meal-1',
              description: 'toast',
              position: 1,
              consumed_at: '2026-04-15T09:00:00.000Z',
              created_at: '2026-04-15T09:00:00.000Z',
              calories: 120,
              protein_g: null,
              fiber_g: null,
              qty: null,
            },
          ],
        },
      ],
      error: null,
    })

    const results = await useEntriesStore.getState().searchMeals('coffee')

    expect(mockSupabase.rpc).toHaveBeenCalledWith('search_meals', { p_query: 'coffee' })
    expect(results).toEqual([
      {
        id: 'meal-1',
        user_id: 'user-1',
        consumed_at: '2026-04-15T09:00:00.000Z',
        meal_type: 'breakfast',
        raw_input: 'coffee, toast',
        headline: null,
        note: null,
        created_at: '2026-04-15T09:00:00.000Z',
        updated_at: '2026-04-15T09:00:00.000Z',
        items: [
          {
            id: 'item-1',
            meal_id: 'meal-1',
            description: 'coffee',
            position: 0,
            consumed_at: '2026-04-15T09:00:00.000Z',
            created_at: '2026-04-15T09:00:00.000Z',
            calories: null,
            protein_g: null,
            fiber_g: null,
            qty: null,
          },
          {
            id: 'item-2',
            meal_id: 'meal-1',
            description: 'toast',
            position: 1,
            consumed_at: '2026-04-15T09:00:00.000Z',
            created_at: '2026-04-15T09:00:00.000Z',
            calories: 120,
            protein_g: null,
            fiber_g: null,
            qty: null,
          },
        ],
      },
    ])
  })
})

describe('useEntriesStore.loadDay', () => {
  function queryReturning(rows: unknown[], gate?: Promise<void>) {
    const result = async () => { if (gate) await gate; return { data: rows, error: null } }
    const chain = {
      select: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      lte: vi.fn(() => chain),
      order: vi.fn(() => result()),
    }
    return chain
  }

  beforeEach(() => {
    mockSupabase.from.mockReset()
    useEntriesStore.setState({ meals: [], dayCache: {}, isAuthed: true, isLoading: false })
  })

  it('drops a superseded response so an older day cannot overwrite a newer one', async () => {
    let releaseSlow!: () => void
    const slowGate = new Promise<void>((resolve) => { releaseSlow = resolve })
    const row = (id: string) => ({ ...makeStoredMeal({ id, description: id, consumedAt: '2026-04-15T09:00:00.000Z', userId: 'u' }), meal_items: [] })

    mockSupabase.from
      .mockReturnValueOnce(queryReturning([row('old-day')], slowGate))
      .mockReturnValueOnce(queryReturning([row('new-day')]))

    const first = useEntriesStore.getState().loadDay('2026-04-14')
    const second = useEntriesStore.getState().loadDay('2026-04-15')
    await second
    releaseSlow()
    await first

    expect(useEntriesStore.getState().meals.map((m) => m.id)).toEqual(['new-day'])
    expect(useEntriesStore.getState().isLoading).toBe(false)
  })

  it('clears isLoading when a cached day supersedes an in-flight load', async () => {
    let releaseSlow!: () => void
    const slowGate = new Promise<void>((resolve) => { releaseSlow = resolve })
    mockSupabase.from.mockReturnValueOnce(queryReturning([], slowGate))
    const cachedMeal = makeStoredMeal({ id: 'cached', description: 'cached', consumedAt: '2026-04-16T09:00:00.000Z', userId: 'u' })
    useEntriesStore.setState({ dayCache: { '2026-04-16': [cachedMeal] } })

    const slow = useEntriesStore.getState().loadDay('2026-04-15')
    await useEntriesStore.getState().loadDay('2026-04-16')
    releaseSlow()
    await slow

    expect(useEntriesStore.getState().meals.map((m) => m.id)).toEqual(['cached'])
    expect(useEntriesStore.getState().isLoading).toBe(false)
  })
})

describe('useEntriesStore day cache consistency', () => {
  function queryReturning(rows: unknown[], gate?: Promise<void>) {
    const result = async () => { if (gate) await gate; return { data: rows, error: null } }
    const chain = {
      select: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      lte: vi.fn(() => chain),
      order: vi.fn(() => result()),
    }
    return chain
  }
  const row = (m: MealWithItems) => ({ ...m, meal_items: m.items })
  const mealAt = (id: string, consumedAt: string) =>
    makeStoredMeal({ id, description: id, consumedAt, userId: 'u' })

  beforeEach(() => {
    mockSupabase.from.mockReset()
    mockSupabase.rpc.mockReset()
    useEntriesStore.setState({ meals: [], dayCache: {}, isAuthed: true, isLoading: false })
  })

  it('updateItemNutrients invalidates the cached day so a later visit sees the edit', async () => {
    const meal = mealAt('m1', '2026-04-15T12:00:00.000Z')
    useEntriesStore.setState({ meals: [meal], dayCache: { '2026-04-15': [meal], '2026-04-14': [] } })
    const eq = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValue({ update: vi.fn(() => ({ eq })) })

    await useEntriesStore.getState().updateItemNutrients('m1-item', { calories: 300 })

    const cache = useEntriesStore.getState().dayCache
    expect(cache['2026-04-15']).toBeUndefined()
    expect(cache['2026-04-14']).toEqual([])
    expect(useEntriesStore.getState().meals[0].items[0].calories).toBe(300)
  })

  it('updateItemNutrients leaves no stale cached value after an error revert', async () => {
    const meal = mealAt('m1', '2026-04-15T12:00:00.000Z')
    useEntriesStore.setState({ meals: [meal], dayCache: { '2026-04-15': [meal] } })
    const eq = vi.fn().mockResolvedValue({ error: new Error('nope') })
    mockSupabase.from.mockReturnValue({ update: vi.fn(() => ({ eq })) })

    await expect(useEntriesStore.getState().updateItemNutrients('m1-item', { calories: 300 })).rejects.toThrow('nope')

    const state = useEntriesStore.getState()
    expect(state.meals[0].items[0].calories).toBeNull()
    const cached = state.dayCache['2026-04-15']
    expect(cached === undefined || cached[0].items[0].calories === null).toBe(true)
  })

  it('editMeal invalidates both the old and the new day when consumed_at moves', async () => {
    const oldMeal = mealAt('m1', '2026-04-14T12:00:00.000Z')
    const moved = mealAt('m1', '2026-04-16T12:00:00.000Z')
    useEntriesStore.setState({
      meals: [oldMeal],
      dayCache: { '2026-04-14': [oldMeal], '2026-04-16': [], '2026-04-10': [] },
    })
    mockSupabase.rpc.mockResolvedValue({ data: moved, error: null })

    await useEntriesStore.getState().editMeal('m1', {
      meal_type: 'snack',
      consumed_at: '2026-04-16T12:00:00.000Z',
      items: [{ id: 'm1-item', description: 'm1', calories: null, protein_g: null, fiber_g: null }],
    })

    const cache = useEntriesStore.getState().dayCache
    expect(cache['2026-04-14']).toBeUndefined()
    expect(cache['2026-04-16']).toBeUndefined()
    expect(cache['2026-04-10']).toEqual([])
  })

  it('loadDay shows a cache hit immediately, then revalidates in the background', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const stale = mealAt('stale', '2026-04-15T09:00:00.000Z')
    const fresh = mealAt('fresh', '2026-04-15T09:00:00.000Z')
    mockSupabase.from.mockReturnValueOnce(queryReturning([row(fresh)], gate))
    useEntriesStore.setState({ dayCache: { '2026-04-15': [stale] } })

    const pending = useEntriesStore.getState().loadDay('2026-04-15')
    expect(useEntriesStore.getState().meals.map((m) => m.id)).toEqual(['stale'])
    expect(useEntriesStore.getState().isLoading).toBe(false)
    expect(mockSupabase.from).toHaveBeenCalledTimes(1)

    release()
    await pending
    expect(useEntriesStore.getState().meals.map((m) => m.id)).toEqual(['fresh'])
    expect(useEntriesStore.getState().dayCache['2026-04-15']?.map((m) => m.id)).toEqual(['fresh'])
  })

  it('a revalidation started before a local mutation cannot overwrite the newer state', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const meal = mealAt('m1', '2026-04-15T09:00:00.000Z')
    // server snapshot taken before the calorie edit
    mockSupabase.from.mockReturnValueOnce(queryReturning([row(meal)], gate))
    useEntriesStore.setState({ meals: [meal], dayCache: { '2026-04-15': [meal] } })

    const pending = useEntriesStore.getState().loadDay('2026-04-15')
    const eq = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValueOnce({ update: vi.fn(() => ({ eq })) })
    await useEntriesStore.getState().updateItemNutrients('m1-item', { calories: 300 })

    release()
    await pending
    expect(useEntriesStore.getState().meals[0].items[0].calories).toBe(300)
    expect(useEntriesStore.getState().dayCache['2026-04-15']).toBeUndefined()
  })

  it('a revalidation does not write after sign-out', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const stale = mealAt('stale', '2026-04-15T09:00:00.000Z')
    mockSupabase.from.mockReturnValueOnce(queryReturning([row(mealAt('fresh', '2026-04-15T09:00:00.000Z'))], gate))
    useEntriesStore.setState({ dayCache: { '2026-04-15': [stale] } })

    const pending = useEntriesStore.getState().loadDay('2026-04-15')
    useEntriesStore.setState({ isAuthed: false, meals: [], dayCache: {} })
    release()
    await pending

    expect(useEntriesStore.getState().meals).toEqual([])
    expect(useEntriesStore.getState().dayCache).toEqual({})
  })
})

describe('useEntriesStore protein/fiber', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset()
    mockSupabase.rpc.mockReset()
    mockSupabase.auth.getUser.mockReset()
    useEntriesStore.setState({ meals: [], dayCache: {}, isAuthed: false, isLoading: false })
  })

  it('creates anonymous items with null protein and fiber', async () => {
    const created = await useEntriesStore.getState().addMeal({
      meal_type: 'snack',
      consumed_at: '2026-04-15T09:00:00.000Z',
      raw_input: 'apple',
      items: ['apple'],
    })
    expect(created.items[0].protein_g).toBeNull()
    expect(created.items[0].fiber_g).toBeNull()
  })

  it('editMeal keeps and updates protein/fiber on anonymous items', async () => {
    const meal = makeStoredMeal({ id: 'local-1', description: 'apple', consumedAt: '2026-04-15T12:00:00.000Z', userId: null })
    useEntriesStore.setState({ meals: [meal], isAuthed: false })

    await useEntriesStore.getState().editMeal('local-1', {
      meal_type: 'snack',
      consumed_at: '2026-04-15T12:00:00.000Z',
      items: [
        { id: 'local-1-item', description: 'apple', calories: 95, protein_g: 0.5, fiber_g: 4.4 },
        { description: 'toast', calories: null },
      ],
    })

    const items = useEntriesStore.getState().meals[0].items
    expect(items[0]).toMatchObject({ id: 'local-1-item', calories: 95, protein_g: 0.5, fiber_g: 4.4 })
    expect(items[1]).toMatchObject({ description: 'toast', protein_g: null, fiber_g: null })
  })

  it('editMeal sends null protein/fiber for chips that omit them', async () => {
    const meal = makeStoredMeal({ id: 'meal-1', description: 'apple', consumedAt: '2026-04-15T12:00:00.000Z', userId: 'u' })
    useEntriesStore.setState({ meals: [meal], isAuthed: true })
    mockSupabase.rpc.mockResolvedValue({ data: meal, error: null })

    await useEntriesStore.getState().editMeal('meal-1', {
      meal_type: 'snack',
      consumed_at: '2026-04-15T12:00:00.000Z',
      items: [{ description: 'apple', calories: null }],
    })

    const args = mockSupabase.rpc.mock.calls[0][1]
    expect(args.p_items).toEqual([
      { description: 'apple', position: 0, consumed_at: '2026-04-15T12:00:00.000Z', calories: null, protein_g: null, fiber_g: null },
    ])
  })

  it('accepts RPC meals whose items lack protein_g/fiber_g (server without the migration)', async () => {
    useEntriesStore.setState({ meals: [], isAuthed: true })
    const legacyItem = {
      id: 'item-1', meal_id: 'meal-1', description: 'coffee', position: 0,
      consumed_at: '2026-04-15T10:00:00.000Z', created_at: '2026-04-15T10:00:00.000Z', calories: null, qty: null,
    }
    mockSupabase.rpc.mockResolvedValue({
      data: {
        id: 'meal-1', user_id: 'u', meal_type: 'drink', consumed_at: '2026-04-15T10:00:00.000Z', raw_input: 'coffee',
        headline: null, note: null, created_at: '2026-04-15T10:00:00.000Z', updated_at: '2026-04-15T10:00:00.000Z',
        items: [legacyItem],
      },
      error: null,
    })

    const created = await useEntriesStore.getState().addMeal({
      meal_type: 'drink', consumed_at: '2026-04-15T10:00:00.000Z', raw_input: 'coffee', items: ['coffee'],
    })
    expect(created.items[0].description).toBe('coffee')
  })

  it('rejects a non-numeric protein_g', async () => {
    useEntriesStore.setState({ meals: [], isAuthed: true })
    mockSupabase.rpc.mockResolvedValue({
      data: {
        id: 'meal-1', user_id: 'u', meal_type: 'drink', consumed_at: '2026-04-15T10:00:00.000Z', raw_input: 'coffee',
        headline: null, note: null, created_at: '2026-04-15T10:00:00.000Z', updated_at: '2026-04-15T10:00:00.000Z',
        items: [{
          id: 'i', meal_id: 'meal-1', description: 'coffee', position: 0, consumed_at: 'x', created_at: 'x',
          calories: null, protein_g: 'lots', fiber_g: null, qty: null,
        }],
      },
      error: null,
    })
    await expect(useEntriesStore.getState().addMeal({
      meal_type: 'drink', consumed_at: '2026-04-15T10:00:00.000Z', raw_input: 'coffee', items: ['coffee'],
    })).rejects.toThrow('Invalid meal payload')
  })

  describe('updateItemNutrients', () => {
    function mockUpdate(result: { error: unknown }) {
      const eq = vi.fn().mockResolvedValue(result)
      const update = vi.fn().mockReturnValue({ eq })
      mockSupabase.from.mockReturnValue({ update })
      return { eq, update }
    }

    it('updates an anonymous item locally without calling supabase', async () => {
      const meal = makeStoredMeal({ id: 'local-1', description: 'apple', consumedAt: '2026-04-15T12:00:00.000Z', userId: null })
      useEntriesStore.setState({ meals: [meal], isAuthed: false })

      await useEntriesStore.getState().updateItemNutrients('local-1-item', { protein_g: 1.2, fiber_g: 3 })

      expect(useEntriesStore.getState().meals[0].items[0]).toMatchObject({ calories: null, protein_g: 1.2, fiber_g: 3 })
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('optimistically updates, then sends only the patch to meal_items when authed', async () => {
      const meal = makeStoredMeal({ id: 'meal-1', description: 'apple', consumedAt: '2026-04-15T12:00:00.000Z', userId: 'u' })
      useEntriesStore.setState({ meals: [meal], isAuthed: true })
      const { eq, update } = mockUpdate({ error: null })

      await useEntriesStore.getState().updateItemNutrients('meal-1-item', { calories: 95, protein_g: 0.5 })

      expect(mockSupabase.from).toHaveBeenCalledWith('meal_items')
      expect(update).toHaveBeenCalledWith({ calories: 95, protein_g: 0.5 })
      expect(eq).toHaveBeenCalledWith('id', 'meal-1-item')
      expect(useEntriesStore.getState().meals[0].items[0]).toMatchObject({ calories: 95, protein_g: 0.5, fiber_g: null })
    })

    it('reverts the optimistic update and throws when supabase fails', async () => {
      const meal = makeStoredMeal({ id: 'meal-1', description: 'apple', consumedAt: '2026-04-15T12:00:00.000Z', userId: 'u' })
      useEntriesStore.setState({ meals: [meal], isAuthed: true })
      const dbError = { message: 'nope' }
      mockUpdate({ error: dbError })

      await expect(useEntriesStore.getState().updateItemNutrients('meal-1-item', { fiber_g: 2 })).rejects.toEqual(dbError)

      expect(useEntriesStore.getState().meals[0].items[0].fiber_g).toBeNull()
    })

    it('updateItemCalories is a thin wrapper that only patches calories', async () => {
      const meal = makeStoredMeal({ id: 'meal-1', description: 'apple', consumedAt: '2026-04-15T12:00:00.000Z', userId: 'u' })
      useEntriesStore.setState({ meals: [meal], isAuthed: true })
      const { update } = mockUpdate({ error: null })

      await useEntriesStore.getState().updateItemCalories('meal-1-item', 120)

      expect(update).toHaveBeenCalledWith({ calories: 120 })
      expect(useEntriesStore.getState().meals[0].items[0].calories).toBe(120)
    })
  })
})

describe('useEntriesStore.addMeal nutrients', () => {
  beforeEach(() => {
    mockSupabase.rpc.mockReset()
    useEntriesStore.setState({ meals: [], dayCache: {}, isAuthed: false, isLoading: false })
  })

  it('stores per-item nutrients on the local meal for anonymous users', async () => {
    const created = await useEntriesStore.getState().addMeal(
      { consumed_at: '2026-04-15T09:00:00.000Z', items: ['a', 'b'] },
      [{ calories: 95, protein_g: 0.5, fiber_g: 4.4 }]
    )
    expect(created.items[0]).toMatchObject({ calories: 95, protein_g: 0.5, fiber_g: 4.4 })
    expect(created.items[1]).toMatchObject({ calories: null, protein_g: null, fiber_g: null })
  })

  it('sends per-item nutrients in the one create_meal_with_items call', async () => {
    useEntriesStore.setState({ isAuthed: true })
    const meal = makeStoredMeal({ id: 'm', description: 'a', consumedAt: '2026-04-15T09:00:00.000Z', userId: 'u' })
    mockSupabase.rpc.mockResolvedValue({ data: meal, error: null })

    await useEntriesStore.getState().addMeal(
      { consumed_at: '2026-04-15T09:00:00.000Z', items: ['a', 'b'] },
      [{ calories: 95, protein_g: 0.5 }, { fiber_g: 2 }]
    )

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1)
    expect(mockSupabase.rpc.mock.calls[0][1].p_items).toEqual([
      { description: 'a', position: 0, calories: 95, protein_g: 0.5, fiber_g: null, consumed_at: '2026-04-15T09:00:00.000Z' },
      { description: 'b', position: 1, calories: null, protein_g: null, fiber_g: 2, consumed_at: '2026-04-15T09:00:00.000Z' },
    ])
  })
})

describe('useEntriesStore.loadDay in-flight protection', () => {
  const row = (id: string) => ({
    ...makeStoredMeal({ id, description: id, consumedAt: '2026-04-15T09:00:00.000Z', userId: 'u' }),
    meal_items: [],
  })
  function query(rows: unknown[], gate?: Promise<void>, onResult?: () => Promise<void>) {
    const chain = {
      select: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      lte: vi.fn(() => chain),
      order: vi.fn(async () => {
        if (gate) await gate
        if (onResult) await onResult()
        return { data: rows, error: null }
      }),
    }
    return chain
  }
  const addedMeal = makeStoredMeal({ id: 'added', description: 'added', consumedAt: '2026-04-15T10:00:00.000Z', userId: 'u' })

  beforeEach(() => {
    mockSupabase.from.mockReset()
    mockSupabase.rpc.mockReset().mockResolvedValue({ data: addedMeal, error: null })
    useEntriesStore.setState({ meals: [], dayCache: {}, isAuthed: true, isLoading: false })
  })

  it('refetches a first-time load when a local mutation happened during the fetch', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    mockSupabase.from
      .mockReturnValueOnce(query([row('before-add')], gate))
      .mockReturnValueOnce(query([row('before-add'), row('added')]))

    const pending = useEntriesStore.getState().loadDay('2026-04-15')
    await useEntriesStore.getState().addMeal({ consumed_at: '2026-04-15T10:00:00.000Z', items: ['added'] })
    release()
    await pending

    expect(mockSupabase.from).toHaveBeenCalledTimes(2)
    expect(useEntriesStore.getState().meals.map((m) => m.id)).toEqual(['before-add', 'added'])
    expect(useEntriesStore.getState().dayCache['2026-04-15']?.map((m) => m.id)).toEqual(['before-add', 'added'])
    expect(useEntriesStore.getState().isLoading).toBe(false)
  })

  it('gives up without applying stale data when mutations never stop, and clears isLoading', async () => {
    const mutate = async () => { await useEntriesStore.getState().addMeal({ consumed_at: '2026-04-15T10:00:00.000Z', items: ['x'] }) }
    mockSupabase.from.mockImplementation(() => query([row('stale')], undefined, mutate))

    await useEntriesStore.getState().loadDay('2026-04-15')

    expect(mockSupabase.from).toHaveBeenCalledTimes(3)
    expect(useEntriesStore.getState().meals.map((m) => m.id)).not.toContain('stale')
    expect(useEntriesStore.getState().dayCache['2026-04-15']).toBeUndefined()
    expect(useEntriesStore.getState().isLoading).toBe(false)
  })

  it('resetEntriesState drops an in-flight load so the old account cannot write into the new state', async () => {
    const { resetEntriesState } = await import('./store')
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    mockSupabase.from.mockReturnValueOnce(query([row('user-a-meal')], gate))

    const pending = useEntriesStore.getState().loadDay('2026-04-15')
    resetEntriesState()
    release()
    await pending

    expect(useEntriesStore.getState().meals).toEqual([])
    expect(useEntriesStore.getState().dayCache).toEqual({})
    expect(useEntriesStore.getState().isLoading).toBe(false)
  })
})

describe('syncLocalToRemote failure handling and parked meals', () => {
  const meal = makeStoredMeal({ id: 'local-1', description: 'apple', consumedAt: '2026-04-15T12:00:00.000Z', userId: null })
  const meal2 = makeStoredMeal({ id: 'local-2', description: 'toast', consumedAt: '2026-04-15T08:00:00.000Z', userId: null })
  const remote = (m: MealWithItems) => ({ ...m, id: `remote-${m.id}`, user_id: 'user-1' })
  const ok = (...ms: MealWithItems[]) => ({ data: ms.map((m) => ({ local_id: m.id, meal: remote(m) })), error: null })
  let disk: Record<string, string>
  const KEY = 'food_journal_unsynced_meals'
  const park = (userId: string | null, meals: MealWithItems[]) => { disk[KEY] = JSON.stringify({ userId, meals }) }
  const parked = () => (disk[KEY] ? JSON.parse(disk[KEY]) : null)
  const sync = (meals: MealWithItems[], userId = 'user-1') => useEntriesStore.getState().syncLocalToRemote(meals, userId)

  beforeEach(() => {
    disk = {}
    mockSupabase.rpc.mockReset()
    vi.mocked(localStorage.getItem).mockReset().mockImplementation((k: string) => disk[k] ?? null)
    vi.mocked(localStorage.setItem).mockReset().mockImplementation((k: string, v: string) => { disk[k] = v })
    vi.mocked(localStorage.removeItem).mockReset().mockImplementation((k: string) => { delete disk[k] })
    useEntriesStore.setState({ meals: [], dayCache: {}, isAuthed: true, isLoading: false })
  })

  it('parks every meal when the whole batch errors', async () => {
    park('user-1', [meal])
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const result = await sync([meal])

    expect(result).toEqual({ synced: 0, failed: 1, unknown: 0 })
    expect(parked()).toEqual({ userId: 'user-1', meals: [meal] })
    expect(useEntriesStore.getState().meals).toEqual([])
  })

  it('parks every meal when the RPC call throws', async () => {
    park('user-1', [meal])
    mockSupabase.rpc.mockRejectedValue(new Error('offline'))

    const result = await sync([meal])

    expect(result).toEqual({ synced: 0, failed: 1, unknown: 0 })
    expect(parked()).toEqual({ userId: 'user-1', meals: [meal] })
  })

  it('does not keep meals for retry when the call succeeded but the reply cannot be parsed', async () => {
    park('user-1', [meal, meal2])
    mockSupabase.rpc.mockResolvedValue({ data: [{ nonsense: true }], error: null })

    const result = await sync([meal, meal2])

    expect(result).toEqual({ synced: 0, failed: 0, unknown: 2 })
    expect(parked()).toBeNull()
  })

  it('a second tab that gets the lock after the first finished uploads nothing', async () => {
    park('user-1', [meal])
    mockSupabase.rpc.mockResolvedValue(ok(meal))

    const tabA = sync([meal])
    const tabB = sync([meal]) // same pending list, e.g. from the other tab's own copy
    expect(await tabA).toEqual({ synced: 1, failed: 0, unknown: 0 })
    expect(await tabB).toEqual({ synced: 0, failed: 0, unknown: 0 })

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1)
    expect(parked()).toBeNull()
  })

  it('a meal parked while an upload is in flight is kept and uploaded afterwards', async () => {
    const { stashLocalMealsForSync } = await import('./store')
    park('user-1', [meal])
    let release!: (v: unknown) => void
    mockSupabase.rpc
      .mockReturnValueOnce(new Promise((r) => { release = r }))
      .mockResolvedValueOnce(ok(meal2))

    const first = sync([meal])
    useEntriesStore.setState({ meals: [meal2] })
    const pending = stashLocalMealsForSync('user-1') // parks meal2 next to meal while the upload runs
    expect(pending.map((m) => m.id)).toEqual(['local-2', 'local-1'])
    const second = sync([meal2])
    release(ok(meal))

    expect(await first).toEqual({ synced: 1, failed: 0, unknown: 0 })
    expect(parked()).toEqual({ userId: 'user-1', meals: [meal2] }) // only the confirmed meal was removed
    expect(await second).toEqual({ synced: 1, failed: 0, unknown: 0 })
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(2)
    expect(mockSupabase.rpc.mock.calls[1][1].p_meals.map((m: { local_id: string }) => m.local_id)).toEqual(['local-2'])
    expect(parked()).toBeNull()
  })

  it('runs the upload inside the Web Lock when the browser has one', async () => {
    const events: string[] = []
    const request = vi.fn(async (_name: string, cb: () => Promise<unknown>) => {
      events.push('lock acquired')
      const result = await cb()
      events.push('lock released')
      return result
    })
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })
    park('user-1', [meal])
    mockSupabase.rpc.mockImplementation(async () => { events.push('rpc'); return ok(meal) })

    try {
      await sync([meal])
    } finally {
      delete (navigator as unknown as { locks?: unknown }).locks
    }

    expect(request).toHaveBeenCalledWith('food_journal_sync', expect.any(Function))
    expect(events).toEqual(['lock acquired', 'rpc', 'lock released'])
  })

  it('stashLocalMealsForSync parks store meals merged with earlier failures for the same user, without duplicates', async () => {
    const { stashLocalMealsForSync } = await import('./store')
    park('user-1', [meal2, meal])
    useEntriesStore.setState({ meals: [meal] })

    const pending = stashLocalMealsForSync('user-1')

    expect(pending.map((m) => m.id)).toEqual(['local-1', 'local-2'])
    expect(parked()).toEqual({ userId: 'user-1', meals: pending })
  })

  it('does not take over meals parked for another account or in the old array format', async () => {
    const { stashLocalMealsForSync } = await import('./store')

    park('user-a', [meal])
    expect(stashLocalMealsForSync('user-b')).toEqual([])
    expect(parked()).toEqual({ userId: 'user-a', meals: [meal] })

    disk[KEY] = JSON.stringify([meal]) // pre-ownership format
    expect(stashLocalMealsForSync('user-b')).toEqual([])
    expect(JSON.parse(disk[KEY])).toEqual([meal])
  })

  it('does not upload parked meals that belong to another account', async () => {
    park('user-a', [meal])

    expect(await sync([meal], 'user-b')).toEqual({ synced: 0, failed: 0, unknown: 0 })
    expect(mockSupabase.rpc).not.toHaveBeenCalled()
    expect(parked()).toEqual({ userId: 'user-a', meals: [meal] })
  })

  it('restoreUnsyncedMeals moves parked meals into the anonymous store and drops the parked copy', async () => {
    const { restoreUnsyncedMeals } = await import('./store')
    park('user-a', [meal])

    useEntriesStore.setState({ isAuthed: true })
    await restoreUnsyncedMeals()
    expect(useEntriesStore.getState().meals).toEqual([]) // still authed: left alone

    useEntriesStore.setState({ isAuthed: false })
    await restoreUnsyncedMeals()
    expect(useEntriesStore.getState().meals).toEqual([meal])
    expect(parked()).toBeNull()
  })

  it('restoreUnsyncedMeals waits for a running upload, then restores what it left parked', async () => {
    const { restoreUnsyncedMeals } = await import('./store')
    park('user-1', [meal, meal2])
    let release!: (v: unknown) => void
    mockSupabase.rpc.mockReturnValue(new Promise((r) => { release = r }))

    const upload = sync([meal, meal2])
    useEntriesStore.setState({ isAuthed: false }) // signed out during the upload
    const restored = restoreUnsyncedMeals()
    await Promise.resolve()
    expect(useEntriesStore.getState().meals).toEqual([])

    release(ok(meal)) // meal2 not confirmed
    await upload
    await restored
    expect(useEntriesStore.getState().meals).toEqual([meal2])
    expect(parked()).toBeNull()
  })
})

describe('synced-ids ledger, user check and reset invalidation', () => {
  const mk = (id: string) => makeStoredMeal({ id, description: id, consumedAt: '2026-04-15T12:00:00.000Z', userId: null })
  const m1 = mk('local-1')
  const m2 = mk('local-2')
  const remote = (m: MealWithItems) => ({ ...m, id: `remote-${m.id}`, user_id: 'user-1' })
  const ok = (...ms: MealWithItems[]) => ({ data: ms.map((m) => ({ local_id: m.id, meal: remote(m) })), error: null })
  const PARKED = 'food_journal_unsynced_meals'
  const SYNCED = 'food_journal_synced_local_ids'
  let disk: Record<string, string>
  const rpcIds = (call: number) => mockSupabase.rpc.mock.calls[call][1].p_meals.map((m: { local_id: string }) => m.local_id)

  beforeEach(() => {
    disk = {}
    mockSupabase.rpc.mockReset()
    mockSupabase.from.mockReset()
    vi.mocked(localStorage.getItem).mockReset().mockImplementation((k: string) => disk[k] ?? null)
    vi.mocked(localStorage.setItem).mockReset().mockImplementation((k: string, v: string) => { disk[k] = v })
    vi.mocked(localStorage.removeItem).mockReset().mockImplementation((k: string) => { delete disk[k] })
    useEntriesStore.setState({ meals: [], dayCache: {}, weekMeals: [], itemHistory: [], isAuthed: true, isLoading: false, weekLoading: false })
  })

  it('a late tab does not re-upload meals another tab already uploaded', async () => {
    const { stashLocalMealsForSync } = await import('./store')
    // Tab A: stash, upload, unpark
    useEntriesStore.setState({ meals: [m1, m2] })
    mockSupabase.rpc.mockResolvedValue(ok(m1, m2))
    const pendingA = stashLocalMealsForSync('user-1')
    await useEntriesStore.getState().syncLocalToRemote(pendingA, 'user-1')
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1)
    expect(disk[PARKED]).toBeUndefined()

    // Tab B still holds the same meals in memory
    const pendingB = stashLocalMealsForSync('user-1')
    expect(pendingB).toEqual([])
    const result = await useEntriesStore.getState().syncLocalToRemote([m1, m2], 'user-1')
    expect(result).toEqual({ synced: 0, failed: 0, unknown: 0 })
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1)
  })

  it('a late tab uploads only the meals the other tab did not handle', async () => {
    const { stashLocalMealsForSync } = await import('./store')
    const extra = mk('local-extra')
    useEntriesStore.setState({ meals: [m1] })
    mockSupabase.rpc.mockResolvedValue(ok(m1))
    await useEntriesStore.getState().syncLocalToRemote(stashLocalMealsForSync('user-1'), 'user-1')

    useEntriesStore.setState({ meals: [m1, extra] })
    mockSupabase.rpc.mockResolvedValue(ok(extra))
    const pendingB = stashLocalMealsForSync('user-1')
    expect(pendingB.map((m) => m.id)).toEqual(['local-extra'])
    const result = await useEntriesStore.getState().syncLocalToRemote([m1, extra], 'user-1')
    expect(result.synced).toBe(1)
    expect(rpcIds(1)).toEqual(['local-extra'])
  })

  it('records given-up (unknown) meals too, caps the list, and tolerates a malformed value', async () => {
    park()
    function park() { disk[PARKED] = JSON.stringify({ userId: 'user-1', meals: [m1] }) }
    mockSupabase.rpc.mockResolvedValue({ data: [{ nonsense: true }], error: null })
    disk[SYNCED] = '{not json'
    await useEntriesStore.getState().syncLocalToRemote([m1], 'user-1')
    expect(JSON.parse(disk[SYNCED])).toEqual(['local-1'])

    disk[SYNCED] = JSON.stringify(Array.from({ length: 400 }, (_, i) => `old-${i}`))
    disk[PARKED] = JSON.stringify({ userId: 'user-1', meals: [m2] })
    mockSupabase.rpc.mockResolvedValue(ok(m2))
    await useEntriesStore.getState().syncLocalToRemote([m2], 'user-1')
    const ids = JSON.parse(disk[SYNCED]) as string[]
    expect(ids.length).toBeLessThanOrEqual(300)
    expect(ids[ids.length - 1]).toBe('local-2')
  })

  it('leaves meals parked and does not call the RPC when the user changed while waiting for the lock', async () => {
    disk[PARKED] = JSON.stringify({ userId: 'user-1', meals: [m1] })
    mockSupabase.rpc.mockResolvedValue(ok(m1))
    const result = await useEntriesStore.getState().syncLocalToRemote([m1], 'user-1', () => false)
    expect(result).toEqual({ synced: 0, failed: 0, unknown: 0 })
    expect(mockSupabase.rpc).not.toHaveBeenCalled()
    expect(JSON.parse(disk[PARKED])).toEqual({ userId: 'user-1', meals: [m1] })
    expect(disk[SYNCED]).toBeUndefined()
  })

  it('loadWeek drops a response that finished after a reset and does not leave weekLoading stuck', async () => {
    const { resetEntriesState } = await import('./store')
    let release!: (v: unknown) => void
    const pending = new Promise((r) => { release = r })
    const chain: Record<string, unknown> = {}
    for (const k of ['select', 'gte', 'lte']) chain[k] = () => chain
    chain.order = () => pending
    mockSupabase.from.mockReturnValue(chain)

    const p = useEntriesStore.getState().loadWeek('2026-04-15')
    expect(useEntriesStore.getState().weekLoading).toBe(true)
    resetEntriesState()
    useEntriesStore.setState({ isAuthed: true })
    release({ data: [{ ...m1, user_id: 'user-a', meal_items: m1.items }], error: null })
    await p

    expect(useEntriesStore.getState().weekMeals).toEqual([])
    expect(useEntriesStore.getState().weekLoading).toBe(false)
  })

  it('loadItemHistory drops a response that finished after a reset', async () => {
    const { resetEntriesState } = await import('./store')
    let release!: (v: unknown) => void
    mockSupabase.rpc.mockReturnValue(new Promise((r) => { release = r }))

    const p = useEntriesStore.getState().loadItemHistory()
    resetEntriesState()
    useEntriesStore.setState({ isAuthed: true })
    release({ data: [{ description: 'secret of account A' }], error: null })
    await p

    expect(useEntriesStore.getState().itemHistory).toEqual([])
  })
})
