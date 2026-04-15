import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Entry, EntryInsert } from '../types/database'
import { supabase } from './supabase'

const LOCAL_KEY = 'food_journal_entries'

interface EntriesState {
  entries: Entry[]
  isAuthed: boolean
  isLoading: boolean
  // Actions
  loadToday: (date?: string) => Promise<void>
  addEntry: (insert: EntryInsert) => Promise<void>
  editEntry: (id: string, updates: { description: string; consumed_at: string }) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  syncLocalToRemote: () => Promise<void>
  setAuthed: (authed: boolean) => void
}

/** Returns today's date string in YYYY-MM-DD (local time). */
export function todayString(): string {
  return new Date().toLocaleDateString('sv') // sv locale gives YYYY-MM-DD
}

/** Returns the 5 most recent distinct descriptions from the store. */
export function recentDistinct(entries: Entry[], n = 5): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  const sorted = [...entries].sort(
    (a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()
  )
  for (const e of sorted) {
    const key = e.description.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      result.push(e.description)
    }
    if (result.length >= n) break
  }
  return result
}

export const useEntriesStore = create<EntriesState>()(
  persist(
    (set, get) => ({
      entries: [],
      isAuthed: false,
      isLoading: false,

      setAuthed: (authed) => set({ isAuthed: authed, ...(!authed && { entries: [] }) }),

      loadToday: async (date = todayString()) => {
        const { isAuthed } = get()

        if (!isAuthed) {
          // Entries are already loaded from localStorage via persist middleware
          return
        }

        set({ isLoading: true })

        // Use local midnight boundaries so entries aren't missed due to UTC offset
        const start = new Date(`${date}T00:00:00`).toISOString()
        const end = new Date(`${date}T23:59:59.999`).toISOString()

        try {
          const { data, error } = await supabase
            .from('entries')
            .select('*')
            .gte('consumed_at', start)
            .lte('consumed_at', end)
            .order('consumed_at', { ascending: true })

          if (error) {
            console.error('loadToday error', error)
            return
          }

          set({ entries: data ?? [] })
        } finally {
          set({ isLoading: false })
        }
      },

      addEntry: async (insert) => {
        const { isAuthed } = get()

        if (!isAuthed) {
          // Optimistic local add
          const localEntry: Entry = {
            id: crypto.randomUUID(),
            user_id: null,
            description: insert.description,
            consumed_at: insert.consumed_at,
            raw_input: insert.raw_input,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          set((s) => ({ entries: [...s.entries, localEntry] }))
          return
        }

        const { data, error } = await supabase
          .from('entries')
          .insert(insert)
          .select()
          .single()

        if (error) {
          console.error('addEntry error', error)
          return
        }

        set((s) => ({ entries: [...s.entries, data] }))
      },

      editEntry: async (id, updates) => {
        const { isAuthed } = get()

        if (!isAuthed) {
          set((s) => ({
            entries: s.entries.map((e) =>
              e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e
            ),
          }))
          return
        }

        const { data, error } = await supabase
          .from('entries')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('editEntry error', error)
          return
        }

        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? data : e)),
        }))
      },

      deleteEntry: async (id) => {
        const { isAuthed } = get()

        if (!isAuthed) {
          set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }))
          return
        }

        const { error } = await supabase.from('entries').delete().eq('id', id)

        if (error) {
          console.error('deleteEntry error', error)
          return
        }

        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }))
      },

      syncLocalToRemote: async () => {
        const { entries } = get()
        const localEntries = entries.filter((e) => e.user_id === null)
        if (localEntries.length === 0) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const inserts = localEntries.map((e) => ({
          description: e.description,
          consumed_at: e.consumed_at,
          raw_input: e.raw_input,
        }))

        const { data, error } = await supabase.from('entries').insert(inserts).select()

        if (error) {
          console.error('syncLocalToRemote error', error)
          return
        }

        // Replace local entries with synced ones
        const localIds = new Set(localEntries.map((e) => e.id))
        set((s) => ({
          entries: [...s.entries.filter((e) => !localIds.has(e.id)), ...(data ?? [])],
        }))
      },
    }),
    {
      name: LOCAL_KEY,
      // Only persist entries when not authed; when authed, source of truth is Supabase
      partialize: (s) => (s.isAuthed ? {} : { entries: s.entries }),
    }
  )
)
