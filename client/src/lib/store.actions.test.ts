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
        qty: null,
      },
    ],
  }
}

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
          qty: null,
        },
      ],
    }

    useEntriesStore.setState({ meals: [existingMeal], isAuthed: true, isLoading: false })
    mockSupabase.rpc.mockResolvedValue({ data: updatedMeal, error: null })

    await useEntriesStore.getState().editMeal('meal-1', {
      meal_type: 'breakfast',
      consumed_at: '2026-04-15T11:00:00.000Z',
      items: [{ description: 'espresso', calories: 5 }],
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
          qty: null,
        },
      ],
    }

    useEntriesStore.setState({ meals: [firstLocalMeal, secondLocalMeal], isAuthed: true, isLoading: false })
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSupabase.rpc.mockResolvedValue({
      data: [
        { local_id: 'local-1', meal: syncedRemoteMeal },
        { local_id: 'local-2', error: 'insert failed' },
      ],
      error: null,
    })

    await useEntriesStore.getState().syncLocalToRemote()

    expect(useEntriesStore.getState().meals).toEqual([secondLocalMeal, syncedRemoteMeal])
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

    useEntriesStore.setState({ meals: localMeals, isAuthed: true, isLoading: false })
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSupabase.rpc.mockResolvedValue({
      data: [
        { local_id: 'local-1', meal: remoteMeals[0] },
        { local_id: 'local-2', meal: remoteMeals[1] },
        { local_id: 'local-3', meal: remoteMeals[2] },
      ],
      error: null,
    })

    await useEntriesStore.getState().syncLocalToRemote()

    expect(useEntriesStore.getState().meals).toEqual(remoteMeals)
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
            qty: null,
          },
        ],
      },
    ])
  })
})
