import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Json, MealWithItems, MealInsert, MealType, MealItem } from '../types/database'
import { supabase } from './supabase'

const LOCAL_KEY = 'food_journal_meals'
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drink']

interface SyncedLocalMeal {
  localId: string
  meal: MealWithItems
}

interface FailedSyncedLocalMeal {
  localId: string
  error: string
}

interface SearchMealRpcRow {
  id: string
  user_id: string | null
  consumed_at: string
  meal_type: MealType
  raw_input: string
  created_at: string
  updated_at: string
  items: MealItem[]
}

export interface ChipItem {
  description: string
  calories: number | null
  id?: string
}

interface RpcMealItem {
  description: string
  calories: number | null
  consumed_at: string
}

interface MealsState {
  meals: MealWithItems[]
  dayCache: Record<string, MealWithItems[]>
  isAuthed: boolean
  isLoading: boolean
  weekMeals: MealWithItems[]
  weekLoading: boolean
  itemHistory: string[]
  // Actions
  loadDay: (date?: string) => Promise<void>
  addMeal: (insert: MealInsert & { items: string[] }) => Promise<MealWithItems>
  editMeal: (
    id: string,
    updates: { meal_type: MealType; consumed_at: string; items: ChipItem[] }
  ) => Promise<void>
  deleteMeal: (id: string) => Promise<void>
  removeMealLocally: (id: string) => void
  restoreMeal: (meal: MealWithItems) => void
  syncLocalToRemote: () => Promise<void>
  setAuthed: (authed: boolean) => void
  updateItemCalories: (itemId: string, calories: number | null) => Promise<void>
  searchMeals: (query: string) => Promise<MealWithItems[]>
  loadWeek: (date?: string) => Promise<void>
  loadPriorItems: (beforeDate: string) => Promise<Set<string>>
  loadItemHistory: () => Promise<void>
}

/** Returns today's date string in YYYY-MM-DD (local time). */
export function todayString(): string {
  return new Date().toLocaleDateString('sv')
}

export function getWeekBounds(anchor: string): { start: string; end: string } {
  const d = new Date(`${anchor}T12:00:00`)
  const day = d.getDay() // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toLocaleDateString('sv'),
    end: sunday.toLocaleDateString('sv'),
  }
}

/** Returns the N most-recent distinct item descriptions across all meals. */
export function recentDistinct(meals: MealWithItems[], n = 5): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  // Flatten items, most-recent meal first
  const allItems = [...meals]
    .sort((a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime())
    .flatMap((m) => [...m.items].sort((a, b) => a.position - b.position))

  for (const item of allItems) {
    const key = item.description.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      result.push(item.description)
    }
    if (result.length >= n) break
  }
  return result
}

function sortMealItems(items: MealItem[]): MealItem[] {
  return [...items].sort((a, b) => a.position - b.position)
}

function normalizeMealWithItems(meal: MealWithItems): MealWithItems {
  return {
    ...meal,
    items: sortMealItems(meal.items ?? []),
  }
}

function buildRawInput(items: Array<{ description: string }>): string {
  return items.map((item) => item.description).join(', ')
}

function serializeRpcItems(items: RpcMealItem[]): Json {
  return items.map((item, position) => ({
    description: item.description,
    position,
    consumed_at: item.consumed_at,
    calories: item.calories,
  }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isMealType(value: unknown): value is MealType {
  return typeof value === 'string' && MEAL_TYPES.includes(value as MealType)
}

function isMealItem(value: unknown): value is MealItem {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.meal_id === 'string'
    && typeof value.description === 'string'
    && typeof value.position === 'number'
    && typeof value.consumed_at === 'string'
    && typeof value.created_at === 'string'
    && (value.calories === null || typeof value.calories === 'number')
}

function isMealWithItems(value: unknown): value is MealWithItems {
  return isRecord(value)
    && typeof value.id === 'string'
    && (value.user_id === null || typeof value.user_id === 'string')
    && typeof value.consumed_at === 'string'
    && isMealType(value.meal_type)
    && typeof value.raw_input === 'string'
    && typeof value.created_at === 'string'
    && typeof value.updated_at === 'string'
    && Array.isArray(value.items)
    && value.items.every(isMealItem)
}

function fromRpcMeal(data: unknown, source: string): MealWithItems {
  if (!isMealWithItems(data)) {
    throw new Error(`Invalid meal payload returned from ${source}`)
  }

  return normalizeMealWithItems(data)
}

function isSyncedLocalMeal(value: unknown): value is { local_id: string; meal: unknown } {
  return isRecord(value)
    && typeof value.local_id === 'string'
    && 'meal' in value
}

function isFailedSyncedLocalMeal(value: unknown): value is { local_id: string; error: string } {
  return isRecord(value)
    && typeof value.local_id === 'string'
    && typeof value.error === 'string'
}

function serializeBatchSyncMeals(meals: MealWithItems[]): Json {
  return meals.map((meal) => ({
    local_id: meal.id,
    meal_type: meal.meal_type,
    consumed_at: meal.consumed_at,
    raw_input: meal.raw_input,
    items: serializeRpcItems(
      meal.items.map((item) => ({
        description: item.description,
        calories: item.calories,
        consumed_at: item.consumed_at,
      }))
    ),
  }))
}

function fromBatchSyncRpc(data: unknown, source: string): {
  synced: SyncedLocalMeal[]
  failed: FailedSyncedLocalMeal[]
} {
  if (!Array.isArray(data)) {
    throw new Error(`Invalid meal batch payload returned from ${source}`)
  }

  const synced: SyncedLocalMeal[] = []
  const failed: FailedSyncedLocalMeal[] = []

  for (const entry of data) {
    if (isFailedSyncedLocalMeal(entry)) {
      failed.push({ localId: entry.local_id, error: entry.error })
      continue
    }

    if (!isSyncedLocalMeal(entry)) {
      throw new Error(`Invalid meal batch payload returned from ${source}`)
    }

    synced.push({
      localId: entry.local_id,
      meal: fromRpcMeal(entry.meal, source),
    })
  }

  return { synced, failed }
}

function isSearchMealRpcRow(value: unknown): value is SearchMealRpcRow {
  return isRecord(value)
    && typeof value.id === 'string'
    && (value.user_id === null || typeof value.user_id === 'string')
    && typeof value.consumed_at === 'string'
    && isMealType(value.meal_type)
    && typeof value.raw_input === 'string'
    && typeof value.created_at === 'string'
    && typeof value.updated_at === 'string'
    && Array.isArray(value.items)
    && value.items.every(isMealItem)
}

function fromSearchMealsRpc(data: unknown, source: string): MealWithItems[] {
  if (!Array.isArray(data)) {
    throw new Error(`Invalid meals payload returned from ${source}`)
  }

  return data.map((entry) => {
    if (!isSearchMealRpcRow(entry)) {
      throw new Error(`Invalid meals payload returned from ${source}`)
    }

    const meal: MealWithItems = {
      id: entry.id,
      user_id: entry.user_id,
      consumed_at: entry.consumed_at,
      meal_type: entry.meal_type,
      raw_input: entry.raw_input,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      items: entry.items,
    }

    if (!isMealWithItems(meal)) {
      throw new Error(`Invalid meals payload returned from ${source}`)
    }

    return normalizeMealWithItems(meal)
  })
}

/** Build a full local MealWithItems from an insert payload. */
function localMeal(
  insert: MealInsert & { items: string[] }
): MealWithItems {
  const now = new Date().toISOString()
  const mealId = crypto.randomUUID()
  const items: MealItem[] = insert.items.map((desc, i) => ({
    id: crypto.randomUUID(),
    meal_id: mealId,
    description: desc,
    position: i,
    consumed_at: insert.consumed_at ?? now,
    calories: null,
    created_at: now,
  }))
  return {
    id: mealId,
    user_id: null,
    consumed_at: insert.consumed_at ?? now,
    meal_type: insert.meal_type ?? 'snack',
    raw_input: insert.raw_input ?? '',
    created_at: now,
    updated_at: now,
    items,
  }
}

export const useEntriesStore = create<MealsState>()(
  persist(
    (set, get) => ({
      meals: [],
      dayCache: {},
      isAuthed: false,
      isLoading: false,
      weekMeals: [],
      weekLoading: false,
      itemHistory: [],

      setAuthed: (authed) => set({ isAuthed: authed }),

      loadDay: async (date = todayString()) => {
        const { isAuthed } = get()
        if (!isAuthed) return // anon: already in localStorage

        // P3: check day-level cache before hitting Supabase
        const cached = get().dayCache[date]
        if (cached) {
          set({ meals: cached })
          return
        }

        set({ isLoading: true })
        const start = new Date(`${date}T00:00:00`).toISOString()
        const end = new Date(`${date}T23:59:59.999`).toISOString()

        try {
          const { data, error } = await supabase
            .from('meals')
            .select('*, meal_items(*)')
            .gte('consumed_at', start)
            .lte('consumed_at', end)
            .order('consumed_at', { ascending: true })

          if (error) { console.error('loadDay error:', error instanceof Error ? error.message : String(error)); return }

          // S8: re-check auth after await — drop result if user signed out mid-flight
          if (!get().isAuthed) return

          // Supabase returns the relation as `meal_items` (the table name).
          // Map it to `items` to match our MealWithItems shape.
          type SupabaseMealRow = Omit<MealWithItems, 'items'> & {
            meal_items: MealWithItems['items']
          }
          const meals: MealWithItems[] = (data as SupabaseMealRow[] ?? []).map((m) => ({
            ...m,
            items: [...(m.meal_items ?? [])].sort((a, b) => a.position - b.position),
          }))
          // P3: store in cache and update meals atomically
          set({ meals, dayCache: { ...get().dayCache, [date]: meals } })
        } finally {
          set({ isLoading: false })
        }
      },

      addMeal: async (insert) => {
        const { isAuthed } = get()

        if (!isAuthed) {
          const meal = localMeal(insert)
          set((s) => ({ meals: [...s.meals, meal] }))
          return meal
        }

        const consumedAt = insert.consumed_at ?? new Date().toISOString()
        const { data, error } = await supabase.rpc('create_meal_with_items', {
          p_meal_type: insert.meal_type ?? 'snack',
          p_consumed_at: consumedAt,
          p_raw_input: insert.raw_input ?? '',
          p_items: serializeRpcItems(
            insert.items.map((description) => ({
              description,
              calories: null,
              consumed_at: consumedAt,
            }))
          ),
        })

        if (error || !data) {
          console.error('addMeal error:', error instanceof Error ? error.message : String(error))
          throw error
        }

        const mealWithItems = fromRpcMeal(data, 'create_meal_with_items')

        // P3: invalidate cache for the affected date
        const addedDate = new Date(consumedAt).toLocaleDateString('sv')
        const addMealCacheRest = { ...get().dayCache }
        delete addMealCacheRest[addedDate]
        set((s) => ({ meals: [...s.meals, mealWithItems], dayCache: addMealCacheRest }))
        return mealWithItems
      },

      editMeal: async (id, updates) => {
        const { isAuthed } = get()
        const now = new Date().toISOString()

        if (!isAuthed) {
          set((s) => ({
            meals: s.meals.map((m) => {
              if (m.id !== id) return m
              const items: MealItem[] = updates.items.map((chip, i) => ({
                id: m.items[i]?.id ?? crypto.randomUUID(),
                meal_id: id,
                description: chip.description,
                position: i,
                consumed_at: updates.consumed_at,
                calories: chip.calories ?? null,
                created_at: m.items[i]?.created_at ?? now,
              }))
              return {
                ...m,
                meal_type: updates.meal_type,
                consumed_at: updates.consumed_at,
                raw_input: buildRawInput(updates.items),
                items,
                updated_at: now,
              }
            }),
          }))
          return
        }

        const { data, error } = await supabase.rpc('update_meal_with_items', {
          p_meal_id: id,
          p_meal_type: updates.meal_type,
          p_consumed_at: updates.consumed_at,
          p_raw_input: buildRawInput(updates.items),
          p_items: serializeRpcItems(
            updates.items.map((item) => ({
              description: item.description,
              calories: item.calories ?? null,
              consumed_at: updates.consumed_at,
            }))
          ),
        })

        if (error || !data) {
          console.error('editMeal error:', error instanceof Error ? error.message : String(error))
          throw error
        }

        const updatedMeal = fromRpcMeal(data, 'update_meal_with_items')

        // P3: invalidate cache for the affected date
        const editedDate = new Date(updates.consumed_at).toLocaleDateString('sv')
        const editMealCacheRest = { ...get().dayCache }
        delete editMealCacheRest[editedDate]
        set((s) => ({
          meals: s.meals.map((meal) => (meal.id === id ? updatedMeal : meal)),
          dayCache: editMealCacheRest,
        }))
      },

      deleteMeal: async (id) => {
        const { isAuthed } = get()

        if (!isAuthed) {
          set((s) => ({ meals: s.meals.filter((m) => m.id !== id) }))
          return
        }

        // P3: look up the meal's date before deleting so we can invalidate cache
        const mealToDelete = get().meals.find((m) => m.id === id)
        const deletedDate = mealToDelete ? new Date(mealToDelete.consumed_at).toLocaleDateString('sv') : null

        const { error } = await supabase.from('meals').delete().eq('id', id)
        if (error) { console.error('deleteMeal error:', error instanceof Error ? error.message : String(error)); throw error }

        // P3: invalidate cache for the deleted meal's date
        if (deletedDate) {
          const deleteMealCacheRest = { ...get().dayCache }
          delete deleteMealCacheRest[deletedDate]
          set((s) => ({ meals: s.meals.filter((m) => m.id !== id), dayCache: deleteMealCacheRest }))
        } else {
          set((s) => ({ meals: s.meals.filter((m) => m.id !== id) }))
        }
      },

      removeMealLocally: (id) => {
        set((s) => ({ meals: s.meals.filter((m) => m.id !== id) }))
      },

      restoreMeal: (meal) => {
        set((s) => ({
          meals: [...s.meals, meal].sort(
            (a, b) => new Date(a.consumed_at).getTime() - new Date(b.consumed_at).getTime()
          ),
        }))
      },

      updateItemCalories: async (itemId, calories) => {
        // Optimistic update
        const prevMeals = get().meals
        set((s) => ({
          meals: s.meals.map((m) =>
            m.items.some((i) => i.id === itemId)
              ? { ...m, items: m.items.map((i) => i.id === itemId ? { ...i, calories } : i) }
              : m
          ),
        }))

        const { isAuthed } = get()
        if (!isAuthed) return // local-only: optimistic update is enough

        const { error } = await supabase
          .from('meal_items')
          .update({ calories })
          .eq('id', itemId)

        if (error) {
          // Revert on error
          set({ meals: prevMeals })
          console.error('updateItemCalories error:', error instanceof Error ? error.message : String(error))
          throw error
        }
      },

      searchMeals: async (query) => {
        const normalizedQuery = query.trim()
        if (!normalizedQuery || normalizedQuery.length < 2) return []

        const { isAuthed } = get()

        if (!isAuthed) {
          const q = normalizedQuery.toLowerCase()
          return get().meals.filter((m) => m.items.some((i) => i.description.toLowerCase().includes(q)))
        }

        const { data, error } = await supabase
          .rpc('search_meals', { p_query: normalizedQuery })

        if (error) { console.error('searchMeals error:', error instanceof Error ? error.message : String(error)); return [] }

        try {
          return fromSearchMealsRpc(data, 'search_meals')
        } catch (err) {
          console.error('searchMeals parse error:', err instanceof Error ? err.message : String(err))
          return []
        }
      },

      loadWeek: async (date = todayString()) => {
        const { isAuthed } = get()
        const { start, end } = getWeekBounds(date)

        if (!isAuthed) {
          const startTs = new Date(`${start}T00:00:00`).getTime()
          const endTs = new Date(`${end}T23:59:59.999`).getTime()
          set({
            weekMeals: get().meals.filter((m) => {
              const t = new Date(m.consumed_at).getTime()
              return t >= startTs && t <= endTs
            }),
          })
          return
        }

        // Clear stale data immediately so WeekView renders the new week's
        // skeleton structure rather than the previous week's content.
        set({ weekLoading: true, weekMeals: [] })
        try {
          const startISO = new Date(`${start}T00:00:00`).toISOString()
          const endISO = new Date(`${end}T23:59:59.999`).toISOString()
          const { data, error } = await supabase
            .from('meals')
            .select('*, meal_items(*)')
            .gte('consumed_at', startISO)
            .lte('consumed_at', endISO)
            .order('consumed_at', { ascending: true })
          if (error) { console.error('loadWeek:', error.message); return }
          type SupabaseMealRow = Omit<MealWithItems, 'items'> & { meal_items: MealWithItems['items'] }
          const weekMeals = (data as SupabaseMealRow[] ?? []).map((m) =>
            normalizeMealWithItems({ ...m, items: m.meal_items ?? [] })
          )
          set({ weekMeals })
        } finally {
          set({ weekLoading: false })
        }
      },

      loadPriorItems: async (beforeDate: string) => {
        const { isAuthed } = get()
        const beforeISO = new Date(`${beforeDate}T00:00:00`).toISOString()

        if (!isAuthed) {
          const priorMeals = get().meals.filter((m) => m.consumed_at < beforeISO)
          return new Set(priorMeals.flatMap((m) => m.items.map((i) => i.description.toLowerCase())))
        }

        const { data, error } = await supabase
          .rpc('get_prior_item_descriptions', { p_before_date: beforeISO })
        if (error) { console.error('loadPriorItems:', error.message); return new Set<string>() }
        return new Set<string>((data ?? []).map((row: { description: string }) => row.description))
      },

      loadItemHistory: async () => {
        const { isAuthed } = get()

        if (!isAuthed) {
          // Derive from all local meals — collect distinct descriptions, most recent first
          const seen = new Set<string>()
          const history: string[] = []
          const sorted = [...get().meals].sort(
            (a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()
          )
          for (const meal of sorted) {
            for (const item of meal.items) {
              const key = item.description.toLowerCase()
              if (!seen.has(key)) {
                seen.add(key)
                history.push(item.description)
              }
            }
          }
          set({ itemHistory: history })
          return
        }

        const { data, error } = await supabase
          .rpc('get_recent_item_descriptions', { p_limit: 500 })
        if (error) { console.error('loadItemHistory:', error instanceof Error ? error.message : String(error)); return }
        set({ itemHistory: (data ?? []).map((r: { description: string }) => r.description) })
      },

      syncLocalToRemote: async () => {
        const { meals } = get()
        const localMeals = meals.filter((m) => m.user_id === null)
        if (localMeals.length === 0) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        try {
          const { data, error } = await supabase.rpc('create_meals_with_items_batch', {
            p_meals: serializeBatchSyncMeals(localMeals),
          })

          if (error || !data) {
            console.error('syncLocalToRemote batch error:', error instanceof Error ? error.message : String(error))
            return
          }

          const { synced: successfulSyncs, failed } = fromBatchSyncRpc(
            data,
            'create_meals_with_items_batch'
          )

          for (const failure of failed) {
            console.error('syncLocalToRemote meal error:', failure.error)
          }

          if (successfulSyncs.length === 0) return

          const synced = successfulSyncs.map((result) => result.meal)
          const syncedLocalIds = new Set(successfulSyncs.map((result) => result.localId))

          if (syncedLocalIds.size === 0) return

          set((s) => ({
            meals: [...s.meals.filter((m) => !syncedLocalIds.has(m.id)), ...synced],
          }))
        } catch (err) {
          console.error('syncLocalToRemote batch error:', err instanceof Error ? err.message : String(err))
        }
      },
    }),
    {
      name: LOCAL_KEY,
      partialize: (s) => (s.isAuthed ? {} : { meals: s.meals }),
    }
  )
)

