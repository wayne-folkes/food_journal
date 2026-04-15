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
import { DateNav, offsetDate } from './components/DateNav'
import { ToastProvider, useToast } from './components/Toast'
import type { Entry } from './types/database'
import './App.css'

function AppInner() {
  const { entries, isAuthed, isLoading, setAuthed, loadToday, addEntry, editEntry, deleteEntry, syncLocalToRemote } =
    useEntriesStore()
  const [user, setUser] = useState<User | null>(null)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayString)
  const toast = useToast()

  // Auth listener — onAuthStateChange covers all cases including INITIAL_SESSION on page load.
  // For SIGNED_IN we must sync local→remote BEFORE calling setAuthed(true), otherwise the
  // loadToday effect fires first and overwrites the store with an empty Supabase fetch.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN') {
        await syncLocalToRemote()
        setAuthed(true)
      } else if (event === 'SIGNED_OUT') {
        setAuthed(false)
      } else {
        setAuthed(!!session)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload entries whenever the selected date or auth state changes
  useEffect(() => {
    loadToday(selectedDate)
  }, [isAuthed, selectedDate, loadToday])

  // For anonymous users the store holds ALL entries (no server-side filter).
  // Filter them down to the selected date in local time.
  const displayedEntries = isAuthed
    ? entries
    : entries.filter((e) => {
        const localDate = new Date(e.consumed_at).toLocaleDateString('sv')
        return localDate === selectedDate
      })

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

  const isViewingToday = selectedDate === todayString()
  const recent = recentDistinct(entries)

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header__title">Food Journal</span>
        <AuthButton user={user} />
      </header>

      <main className="app-main">
        {isViewingToday && (
          <h1 className="app-main__question">What did you eat or drink?</h1>
        )}
        {isViewingToday && <InputBar onAdd={handleAdd} />}
        {isViewingToday && recent.length > 0 && (
          <RecentChips items={recent} onSelect={handleRelogChip} />
        )}
        <DateNav
          date={selectedDate}
          onPrev={() => setSelectedDate((d) => offsetDate(d, -1))}
          onNext={() => setSelectedDate((d) => offsetDate(d, 1))}
        />
        <LogList
          entries={displayedEntries}
          isLoading={isLoading}
          onEdit={setEditingEntry}
          onDelete={handleDelete}
        />
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
