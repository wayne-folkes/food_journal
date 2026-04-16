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

import { useEntriesStore } from './store'

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

  it('updates an authenticated meal via RPC so the meal and items change atomically', async () => {
    const existingMeal = {
      id: 'meal-1',
      user_id: 'user-1',
      meal_type: 'drink' as const,
      consumed_at: '2026-04-15T10:00:00.000Z',
      raw_input: 'coffee',
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
        },
      ],
    }
    const secondLocalMeal = {
      id: 'local-2',
      user_id: null,
      meal_type: 'lunch' as const,
      consumed_at: '2026-04-15T13:00:00.000Z',
      raw_input: 'sandwich',
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
        },
      ],
    }
    const syncedRemoteMeal = {
      id: 'remote-1',
      user_id: 'user-1',
      meal_type: 'snack' as const,
      consumed_at: '2026-04-15T12:00:00.000Z',
      raw_input: 'apple',
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
        },
      ],
    }

    useEntriesStore.setState({ meals: [firstLocalMeal, secondLocalMeal], isAuthed: true, isLoading: false })
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: syncedRemoteMeal, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('insert failed') })

    await useEntriesStore.getState().syncLocalToRemote()

    expect(useEntriesStore.getState().meals).toEqual([secondLocalMeal, syncedRemoteMeal])
  })
})
