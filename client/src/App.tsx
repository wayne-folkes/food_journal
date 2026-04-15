import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { useEntriesStore, recentDistinct, todayString } from './lib/store'
import { MealComposer } from './components/MealComposer'
import { suggestMealType } from './lib/mealType'
import { MealLog } from './components/MealLog'
import { RecentChips } from './components/RecentChips'
import { EditMealModal } from './components/EditMealModal'
import { AuthButton } from './components/AuthButton'
import { DateNav, offsetDate } from './components/DateNav'
import { DaySummary } from './components/DaySummary'
import { ToastProvider, useToast } from './components/Toast'
import type { MealWithItems, MealType } from './types/database'
import './App.css'

function AppInner() {
  const { meals, isAuthed, isLoading, setAuthed, loadDay, addMeal, editMeal, deleteMeal, syncLocalToRemote } =
    useEntriesStore()
  const [user, setUser] = useState<User | null>(null)
  const [editingMeal, setEditingMeal] = useState<MealWithItems | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayString)
  const toast = useToast()

  // Auth listener
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

  // Reload meals whenever the selected date or auth state changes
  useEffect(() => {
    loadDay(selectedDate)
  }, [isAuthed, selectedDate, loadDay])

  // For anonymous users, filter meals to the selected date
  const displayedMeals = isAuthed
    ? meals
    : meals.filter((m) => {
        const localDate = new Date(m.consumed_at).toLocaleDateString('sv')
        return localDate === selectedDate
      })

  async function handleAddMeal(payload: {
    mealType: MealType
    items: string[]
    consumed_at: string
    rawInput: string
  }) {
    try {
      await addMeal({
        meal_type: payload.mealType,
        consumed_at: payload.consumed_at,
        raw_input: payload.rawInput,
        items: payload.items,
      })
    } catch (err) {
      toast.error('Failed to add meal. Please try again.')
      console.error('handleAddMeal error', err)
    }
  }

  async function handleRelogItem(description: string) {
    try {
      await addMeal({
        meal_type: suggestMealType(),
        consumed_at: new Date().toISOString(),
        raw_input: description,
        items: [description],
      })
    } catch (err) {
      toast.error('Failed to add entry. Please try again.')
      console.error('handleRelogItem error', err)
    }
  }

  async function handleSaveEdit(
    id: string,
    updates: { meal_type: MealType; consumed_at: string; items: string[] }
  ) {
    try {
      await editMeal(id, updates)
      setEditingMeal(null)
    } catch (err) {
      toast.error('Failed to save changes. Please try again.')
      console.error('handleSaveEdit error', err)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMeal(id)
    } catch (err) {
      toast.error('Failed to delete meal. Please try again.')
      console.error('handleDelete error', err)
    }
  }

  async function handleDuplicate(meal: MealWithItems) {
    try {
      await addMeal({
        meal_type: meal.meal_type,
        consumed_at: new Date().toISOString(),
        raw_input: meal.raw_input ?? '',
        items: meal.items.map((i) => i.description),
      })
    } catch (err) {
      toast.error('Failed to log meal again. Please try again.')
      console.error('handleDuplicate error', err)
    }
  }

  const isViewingToday = selectedDate === todayString()
  const recent = recentDistinct(meals)

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header__title">Food Journal</span>
        <AuthButton user={user} />
      </header>

      <main className="app-main">
        {isViewingToday && <MealComposer onAdd={handleAddMeal} />}
        {isViewingToday && recent.length > 0 && (
          <RecentChips items={recent} onSelect={handleRelogItem} />
        )}
        <DateNav
          date={selectedDate}
          onPrev={() => setSelectedDate((d) => offsetDate(d, -1))}
          onNext={() => setSelectedDate((d) => offsetDate(d, 1))}
          onToday={() => setSelectedDate(todayString())}
        />
        <DaySummary meals={displayedMeals} />
        <MealLog
          meals={displayedMeals}
          isLoading={isLoading}
          selectedDate={selectedDate}
          onEdit={setEditingMeal}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      </main>

      {editingMeal && (
        <EditMealModal
          meal={editingMeal}
          onSave={handleSaveEdit}
          onCancel={() => setEditingMeal(null)}
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
