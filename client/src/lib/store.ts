import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Json, MealWithItems, MealInsert, MealType, MealItem } from '../types/database'
import { supabase } from './supabase'

const LOCAL_KEY = 'food_journal_meals'

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
  isAuthed: boolean
  isLoading: boolean
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
}

/** Returns today's date string in YYYY-MM-DD (local time). */
export function todayString(): string {
  return new Date().toLocaleDateString('sv')
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

function fromRpcMeal(data: unknown): MealWithItems {
  return normalizeMealWithItems(data as MealWithItems)
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
      isAuthed: false,
      isLoading: false,

      setAuthed: (authed) => set({ isAuthed: authed }),

      loadDay: async (date = todayString()) => {
        const { isAuthed } = get()
        if (!isAuthed) return // anon: already in localStorage

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

          if (error) { console.error('loadDay error', error); return }

          // Supabase returns the relation as `meal_items` (the table name).
          // Map it to `items` to match our MealWithItems shape.
          type SupabaseMealRow = Omit<MealWithItems, 'items'> & {
            meal_items: MealWithItems['items']
          }
          const meals: MealWithItems[] = (data as SupabaseMealRow[] ?? []).map((m) => ({
            ...m,
            items: [...(m.meal_items ?? [])].sort((a, b) => a.position - b.position),
          }))
          set({ meals })
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
          console.error('addMeal error', error)
          throw error
        }

        const mealWithItems = fromRpcMeal(data)

        set((s) => ({ meals: [...s.meals, mealWithItems] }))
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
          console.error('editMeal error', error)
          throw error
        }

        const updatedMeal = fromRpcMeal(data)

        set((s) => ({
          meals: s.meals.map((meal) => (meal.id === id ? updatedMeal : meal)),
        }))
      },

      deleteMeal: async (id) => {
        const { isAuthed } = get()

        if (!isAuthed) {
          set((s) => ({ meals: s.meals.filter((m) => m.id !== id) }))
          return
        }

        const { error } = await supabase.from('meals').delete().eq('id', id)
        if (error) { console.error('deleteMeal error', error); throw error }
        set((s) => ({ meals: s.meals.filter((m) => m.id !== id) }))
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
          meals: s.meals.map((m) => ({
            ...m,
            items: m.items.map((item) =>
              item.id === itemId ? { ...item, calories } : item
            ),
          })),
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
          console.error('updateItemCalories error', error)
          throw error
        }
      },

      searchMeals: async (query) => {
        if (!query || query.length < 2) return []

        const { isAuthed } = get()

        if (!isAuthed) {
          const q = query.toLowerCase()
          return get().meals.filter((m) => m.items.some((i) => i.description.toLowerCase().includes(q)))
        }

        // Get matching meal_item meal_ids
        const { data: itemMatches } = await supabase
          .from('meal_items')
          .select('meal_id')
          .ilike('description', `%${query}%`)

        const mealIds = [...new Set(itemMatches?.map((r) => r.meal_id) ?? [])]
        if (mealIds.length === 0) return []

        const { data, error } = await supabase
          .from('meals')
          .select('*, meal_items(*)')
          .in('id', mealIds)
          .order('consumed_at', { ascending: false })
          .limit(50)

        if (error) { console.error('searchMeals error', error); return [] }

        type SupabaseMealRow = Omit<MealWithItems, 'items'> & {
          meal_items: MealWithItems['items']
        }
        return (data as SupabaseMealRow[] ?? []).map((m) => ({
          ...m,
          items: [...(m.meal_items ?? [])].sort((a, b) => a.position - b.position),
        }))
      },

      syncLocalToRemote: async () => {
        const { meals } = get()
        const localMeals = meals.filter((m) => m.user_id === null)
        if (localMeals.length === 0) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const synced: MealWithItems[] = []
        const syncedLocalIds = new Set<string>()

        for (const m of localMeals) {
          try {
            const { data, error } = await supabase.rpc('create_meal_with_items', {
              p_meal_type: m.meal_type,
              p_consumed_at: m.consumed_at,
              p_raw_input: m.raw_input,
              p_items: serializeRpcItems(
                m.items.map((item) => ({
                  description: item.description,
                  calories: item.calories,
                  consumed_at: item.consumed_at,
                }))
              ),
            })

            if (error || !data) {
              console.error('syncLocalToRemote meal error', error)
              continue
            }

            synced.push(fromRpcMeal(data))
            syncedLocalIds.add(m.id)
          } catch (err) {
            console.error('syncLocalToRemote item error', err)
          }
        }

        if (syncedLocalIds.size === 0) return

        set((s) => ({
          meals: [...s.meals.filter((m) => !syncedLocalIds.has(m.id)), ...synced],
        }))
      },
    }),
    {
      name: LOCAL_KEY,
      partialize: (s) => (s.isAuthed ? {} : { meals: s.meals }),
    }
  )
)
