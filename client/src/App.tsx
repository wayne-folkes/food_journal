import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { parseEntry } from './lib/parser'
import { useEntriesStore, recentDistinct, todayString } from './lib/store'
import { InputBar } from './components/InputBar'
import { RecentChips } from './components/RecentChips'
import { LogList } from './components/LogList'
import { EditModal } from './components/EditModal'
import { AuthButton } from './components/AuthButton'
import { ToastProvider, useToast } from './components/Toast'
import type { Entry } from './types/database'
import './App.css'

function AppInner() {
  const { entries, isAuthed, isLoading, setAuthed, loadToday, addEntry, editEntry, deleteEntry, syncLocalToRemote } =
    useEntriesStore()
  const [user, setUser] = useState<User | null>(null)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const toast = useToast()

  // Auth listener — onAuthStateChange covers all cases including INITIAL_SESSION on page load.
  // For SIGNED_IN we must sync local→remote BEFORE calling setAuthed(true), otherwise the
  // loadToday effect fires first and overwrites the store with an empty Supabase fetch.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN') {
        // Sync anonymous entries to Supabase first, then mark as authed.
        // The loadToday effect will fire after setAuthed(true) — by then entries are in Supabase.
        await syncLocalToRemote()
        setAuthed(true)
      } else if (event === 'SIGNED_OUT') {
        setAuthed(false)
      } else {
        // INITIAL_SESSION, TOKEN_REFRESHED, etc. — no sync needed.
        setAuthed(!!session)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadToday(todayString())
  }, [isAuthed, loadToday])

  async function handleAdd(raw: string) {
    const { description, consumed_at } = parseEntry(raw)
    try {
      await addEntry({
        description,
        consumed_at: consumed_at.toISOString(),
        raw_input: raw,
      })
    } catch (err) {
      toast.error('Failed to add entry. Please try again.')
      console.error('handleAdd error', err)
    }
  }

  async function handleRelogChip(description: string) {
    try {
      await addEntry({
        description,
        consumed_at: new Date().toISOString(),
        raw_input: description,
      })
    } catch (err) {
      toast.error('Failed to add entry. Please try again.')
      console.error('handleRelogChip error', err)
    }
  }

  async function handleSaveEdit(id: string, updates: { description: string; consumed_at: string }) {
    try {
      await editEntry(id, updates)
      setEditingEntry(null)
    } catch (err) {
      toast.error('Failed to save changes. Please try again.')
      console.error('handleSaveEdit error', err)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteEntry(id)
    } catch (err) {
      toast.error('Failed to delete entry. Please try again.')
      console.error('handleDelete error', err)
    }
  }

  const recent = recentDistinct(entries)

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header__title">Food Journal</span>
        <AuthButton user={user} />
      </header>

      <main className="app-main">
        <h1 className="app-main__question">What did you eat or drink?</h1>
        <InputBar onAdd={handleAdd} />
        <RecentChips items={recent} onSelect={handleRelogChip} />
        <LogList entries={entries} isLoading={isLoading} onEdit={setEditingEntry} onDelete={handleDelete} />
      </main>

      {editingEntry && (
        <EditModal
          entry={editingEntry}
          onSave={handleSaveEdit}
          onCancel={() => setEditingEntry(null)}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}
