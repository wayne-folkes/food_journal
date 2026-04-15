import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MealWithItems, MealInsert, MealType, MealItem } from '../types/database'
import { supabase } from './supabase'

const LOCAL_KEY = 'food_journal_meals'

interface MealsState {
  meals: MealWithItems[]
  isAuthed: boolean
  isLoading: boolean
  // Actions
  loadDay: (date?: string) => Promise<void>
  addMeal: (insert: MealInsert & { items: string[] }) => Promise<void>
  editMeal: (
    id: string,
    updates: { meal_type: MealType; consumed_at: string; items: string[] }
  ) => Promise<void>
  deleteMeal: (id: string) => Promise<void>
  syncLocalToRemote: () => Promise<void>
  setAuthed: (authed: boolean) => void
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

      setAuthed: (authed) => set({ isAuthed: authed, ...(!authed && { meals: [] }) }),

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
          set((s) => ({ meals: [...s.meals, localMeal(insert)] }))
          return
        }

        const now = new Date().toISOString()

        // 1. Insert meal row
        const { data: meal, error: mealErr } = await supabase
          .from('meals')
          .insert({
            consumed_at: insert.consumed_at,
            meal_type: insert.meal_type,
            raw_input: insert.raw_input,
          })
          .select()
          .single()

        if (mealErr || !meal) { console.error('addMeal error', mealErr); throw mealErr }

        // 2. Insert items
        const itemInserts = insert.items.map((desc, i) => ({
          meal_id: meal.id,
          description: desc,
          position: i,
        }))

        const { data: items, error: itemsErr } = await supabase
          .from('meal_items')
          .insert(itemInserts)
          .select()

        if (itemsErr) { console.error('addMeal items error', itemsErr); throw itemsErr }

        const mealWithItems: MealWithItems = {
          ...meal,
          updated_at: meal.updated_at ?? now,
          items: (items ?? []).sort((a, b) => a.position - b.position),
        }

        set((s) => ({ meals: [...s.meals, mealWithItems] }))
      },

      editMeal: async (id, updates) => {
        const { isAuthed } = get()
        const now = new Date().toISOString()

        if (!isAuthed) {
          set((s) => ({
            meals: s.meals.map((m) => {
              if (m.id !== id) return m
              const items: MealItem[] = updates.items.map((desc, i) => ({
                id: m.items[i]?.id ?? crypto.randomUUID(),
                meal_id: id,
                description: desc,
                position: i,
                created_at: m.items[i]?.created_at ?? now,
              }))
              return { ...m, ...updates, items, updated_at: now }
            }),
          }))
          return
        }

        // Update meal row
        const { error: mealErr } = await supabase
          .from('meals')
          .update({
            meal_type: updates.meal_type,
            consumed_at: updates.consumed_at,
            updated_at: now,
          })
          .eq('id', id)

        if (mealErr) { console.error('editMeal error', mealErr); throw mealErr }

        // Replace all items: delete old, insert new
        await supabase.from('meal_items').delete().eq('meal_id', id)

        const itemInserts = updates.items.map((desc, i) => ({
          meal_id: id,
          description: desc,
          position: i,
        }))

        const { data: newItems, error: itemsErr } = await supabase
          .from('meal_items')
          .insert(itemInserts)
          .select()

        if (itemsErr) { console.error('editMeal items error', itemsErr); throw itemsErr }

        set((s) => ({
          meals: s.meals.map((m) => {
            if (m.id !== id) return m
            return {
              ...m,
              meal_type: updates.meal_type,
              consumed_at: updates.consumed_at,
              updated_at: now,
              items: (newItems ?? []).sort((a, b) => a.position - b.position),
            }
          }),
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

      syncLocalToRemote: async () => {
        const { meals } = get()
        const localMeals = meals.filter((m) => m.user_id === null)
        if (localMeals.length === 0) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const synced: MealWithItems[] = []

        for (const m of localMeals) {
          try {
            const { data: meal, error: mealErr } = await supabase
              .from('meals')
              .insert({
                consumed_at: m.consumed_at,
                meal_type: m.meal_type,
                raw_input: m.raw_input,
              })
              .select()
              .single()

            if (mealErr || !meal) continue

            const itemInserts = m.items.map((item, i) => ({
              meal_id: meal.id,
              description: item.description,
              position: i,
            }))

            const { data: items } = await supabase
              .from('meal_items')
              .insert(itemInserts)
              .select()

            synced.push({
              ...meal,
              updated_at: meal.updated_at ?? new Date().toISOString(),
              items: (items ?? []).sort((a, b) => a.position - b.position),
            })
          } catch (err) {
            console.error('syncLocalToRemote item error', err)
          }
        }

        const localIds = new Set(localMeals.map((m) => m.id))
        set((s) => ({
          meals: [...s.meals.filter((m) => !localIds.has(m.id)), ...synced],
        }))
      },
    }),
    {
      name: LOCAL_KEY,
      partialize: (s) => (s.isAuthed ? {} : { meals: s.meals }),
    }
  )
)
