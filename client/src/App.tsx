import { useEffect, useRef, useState } from 'react'
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
import { SearchOverlay } from './components/SearchOverlay'
import { AdminPanel } from './components/AdminPanel'
import { lookupCalories } from './lib/caloriesLookup'

const ADMIN_EMAIL = 'wayne.folkes@gmail.com'
import type { MealWithItems, MealType } from './types/database'
import type { ChipItem } from './lib/store'
import './App.css'

function AppInner() {
  const { meals, isAuthed, isLoading, setAuthed, loadDay, addMeal, editMeal, deleteMeal, removeMealLocally, restoreMeal, syncLocalToRemote, updateItemCalories } =
    useEntriesStore()
  const [user, setUser] = useState<User | null>(null)
  const [editingMeal, setEditingMeal] = useState<MealWithItems | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayString)
  const [searchOpen, setSearchOpen] = useState(false)
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

      // After addMeal resolves, find the newly added meal from the store
      // (it's the last meal with items matching our payload)
      if (isAuthed) {
        const savedMeals = useEntriesStore.getState().meals
        const savedMeal = [...savedMeals]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .find((m) => m.items.some((i) => payload.items.includes(i.description)))

        if (savedMeal) {
          const itemsNeedingCalories = savedMeal.items.filter((i) => i.calories === null)
          if (itemsNeedingCalories.length > 0) {
            // fire and forget — non-blocking
            lookupCalories(itemsNeedingCalories.map((i) => ({ id: i.id, description: i.description })))
              .then((results) => {
                results.forEach((r) => {
                  if (r.calories !== null) {
                    updateItemCalories(r.id, r.calories)
                  }
                })
                const found = results.filter((r) => r.calories !== null).length
                if (found > 0) toast.success(`Got calorie estimate${found === 1 ? '' : 's'} for ${found} item${found === 1 ? '' : 's'} from USDA`)
              })
              .catch(() => {
                // silently fail — calorie lookup is best-effort
              })
          }
        }
      }
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
    updates: { meal_type: MealType; consumed_at: string; items: ChipItem[] }
  ) {
    try {
      await editMeal(id, updates)
      setEditingMeal(null)
    } catch (err) {
      toast.error('Failed to save changes. Please try again.')
      console.error('handleSaveEdit error', err)
    }
  }

  const pendingDeletes = useRef<Map<string, { meal: MealWithItems; timer: ReturnType<typeof setTimeout> }>>(new Map())

  async function handleDelete(id: string) {
    // Find the meal before removing it
    const meal = displayedMeals.find((m) => m.id === id)
    if (!meal) return

    // Optimistically remove from UI
    removeMealLocally(id)

    // Cancel any existing pending delete for this id
    const existing = pendingDeletes.current.get(id)
    if (existing) {
      clearTimeout(existing.timer)
    }

    // Schedule the real delete after 5 seconds
    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(id)
      try {
        await deleteMeal(id)
      } catch (err) {
        // If the real delete fails, restore the meal
        restoreMeal(meal)
        toast.error('Failed to delete meal. Please try again.')
        console.error('handleDelete error', err)
      }
    }, 5000)

    pendingDeletes.current.set(id, { meal, timer })

    // Show toast with Undo action
    toast.success('Meal deleted', {
      label: 'Undo',
      onClick: () => {
        const pending = pendingDeletes.current.get(id)
        if (pending) {
          clearTimeout(pending.timer)
          pendingDeletes.current.delete(id)
          restoreMeal(pending.meal)
        }
      },
    })
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

  async function handleEstimateCalories(meal: MealWithItems) {
    const itemsNeedingCalories = meal.items.filter((i) => i.calories === null)
    if (itemsNeedingCalories.length === 0) return
    try {
      const results = await lookupCalories(
        itemsNeedingCalories.map((i) => ({ id: i.id, description: i.description }))
      )
      for (const r of results) {
        if (r.calories !== null) await updateItemCalories(r.id, r.calories)
      }
      const found = results.filter((r) => r.calories !== null).length
      if (found > 0) toast.success(`Got calorie estimate${found === 1 ? '' : 's'} for ${found} item${found === 1 ? '' : 's'} from USDA`)
      else toast.error('No calorie data found for these items')
    } catch {
      toast.error('Failed to estimate calories')
    }
  }

  const isViewingToday = selectedDate === todayString()
  const recent = recentDistinct(meals)

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header__title">Food Journal</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="header-search-btn"
            aria-label="Search meals"
            onClick={() => setSearchOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
          <AuthButton user={user} />
        </div>
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
          onUpdateCalories={async (itemId, calories) => {
            try {
              await updateItemCalories(itemId, calories)
            } catch {
              toast.error('Failed to save calories')
            }
          }}
          onEstimateCalories={handleEstimateCalories}
        />
      </main>

      {editingMeal && (
        <EditMealModal
          meal={editingMeal}
          onSave={handleSaveEdit}
          onCancel={() => setEditingMeal(null)}
        />
      )}

      {searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onNavigateToDate={(date) => {
            setSelectedDate(date)
            setSearchOpen(false)
          }}
        />
      )}

      {user?.email === ADMIN_EMAIL && <AdminPanel />}
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
