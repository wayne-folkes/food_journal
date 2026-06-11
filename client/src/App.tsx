import { useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { errorMessage } from '@shared/logger'
import { supabase } from './lib/supabase'
import { useEntriesStore, todayString, getWeekBounds } from './lib/store'
import { MealComposer } from './components/MealComposer'
import { MealLog } from './components/MealLog'
import { MealDetail } from './components/MealDetail'
import { EditMealModal } from './components/EditMealModal'
import { AuthButton } from './components/AuthButton'
import { DateNav } from './components/DateNav'
import { DaySummary } from './components/DaySummary'
import { ToastProvider } from './components/Toast'
import { SearchOverlay } from './components/SearchOverlay'
import { PdfExportModal } from './components/PdfExportModal'
import { WeekView } from './components/WeekView'
import { lookupCalories } from './lib/caloriesLookup'
import { offsetDate } from './lib/date'
import { useToast } from './lib/toast'
import { track } from './lib/analytics'
import { log } from './lib/logger'

import type { MealWithItems, MealType } from '@shared/types/database'
import type { ChipItem } from './lib/store'
import './App.css'

function AppInner() {
  const { meals, isAuthed, isLoading, setAuthed, loadDay, addMeal, editMeal, deleteMeal, updateItemCalories, loadWeek, weekMeals, weekLoading, loadItemHistory } =
    useEntriesStore()
  const [user, setUser] = useState<User | null>(null)
  const [authResolved, setAuthResolved] = useState(false)
  const [editingMeal, setEditingMeal] = useState<MealWithItems | null>(null)
  const [selectedMeal, setSelectedMeal] = useState<MealWithItems | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayString)
  const [searchOpen, setSearchOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerInitialInput, setComposerInitialInput] = useState('')
  const [pdfExportOpen, setPdfExportOpen] = useState(false)
  const activeUserIdRef = useRef<string | null>(null)
  const toast = useToast()

  // Auth listener
  useEffect(() => {
    const resetEntriesState = () => {
      useEntriesStore.setState({ meals: [], dayCache: {}, weekMeals: [], itemHistory: [] })
      void useEntriesStore.persist.clearStorage()
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const nextUserId = session?.user?.id ?? null
      const previousUserId = activeUserIdRef.current
      const hadAnonymousMeals = useEntriesStore.getState().meals.some((meal) => meal.user_id === null)

      setUser(session?.user ?? null)

      if (event === 'SIGNED_OUT' || previousUserId !== nextUserId) {
        resetEntriesState()
        setSearchOpen(false)
        setEditingMeal(null)
        setSelectedMeal(null)
        setComposerOpen(false)

        if (nextUserId !== null && hadAnonymousMeals) {
          toast.error('Local device-only meals were cleared on sign-in to protect privacy.')
        }
      }

      activeUserIdRef.current = nextUserId
      setAuthed(nextUserId !== null)
      setAuthResolved(true)
    })
    return () => subscription.unsubscribe()
  }, [setAuthed, toast])

  // Load item history for autocomplete whenever auth state is established
  useEffect(() => {
    if (!authResolved) return

    if (isAuthed) {
      loadItemHistory()
    }
  }, [authResolved, isAuthed, loadItemHistory])

  // Reload meals whenever the selected date or auth state changes
  useEffect(() => {
    if (!authResolved) return

    loadDay(selectedDate)
  }, [authResolved, isAuthed, selectedDate, loadDay])

  // Load week data when switching to week view or when date changes in week view
  useEffect(() => {
    if (!authResolved) return

    if (viewMode === 'week') {
      loadWeek(selectedDate)
    }
  }, [authResolved, viewMode, selectedDate, loadWeek])

  // For anonymous users, filter meals to the selected date
  const displayedMeals = useMemo(
    () =>
      !authResolved
        ? []
        : isAuthed
        ? meals
        : meals.filter((m) => {
            const localDate = new Date(m.consumed_at).toLocaleDateString('sv')
            return localDate === selectedDate
          }),
    [authResolved, meals, isAuthed, selectedDate]
  )

  const dayIsLoading = !authResolved || isLoading
  const weekIsLoading = !authResolved || weekLoading

  async function handleAddMeal(payload: {
    mealType: MealType
    items: string[]
    consumed_at: string
    rawInput: string
  }) {
    try {
      const savedMeal = await addMeal({
        meal_type: payload.mealType,
        consumed_at: payload.consumed_at,
        raw_input: payload.rawInput,
        items: payload.items,
      })

      track('meal_logged', {
        meal_type: payload.mealType,
        item_count: payload.items.length,
        authed: isAuthed,
      })

      if (isAuthed) {
        const itemsNeedingCalories = savedMeal.items.filter((item) => item.calories === null)
        if (itemsNeedingCalories.length > 0) {
          track('calorie_estimate_requested', {
            item_count: itemsNeedingCalories.length,
            trigger: 'auto',
          })
          // fire and forget — non-blocking
          lookupCalories(itemsNeedingCalories.map((item) => ({ id: item.id, description: item.description })))
            .then((results) => {
              results.forEach((result) => {
                if (result.calories !== null) {
                  updateItemCalories(result.id, result.calories)
                }
              })
              const found = results.filter((result) => result.calories !== null).length
              if (found > 0) toast.success(`Got calorie estimate${found === 1 ? '' : 's'} for ${found} item${found === 1 ? '' : 's'} from USDA`)
            })
            .catch(() => {
              // silently fail — calorie lookup is best-effort
            })
        }
      }
    } catch (err) {
      toast.error('Failed to add meal. Please try again.')
      log.withMetadata({ error: errorMessage(err) }).error('handleAddMeal failed')
    }
  }

  async function handleSaveEdit(
    id: string,
    updates: { meal_type: MealType; consumed_at: string; items: ChipItem[] }
  ) {
    try {
      await editMeal(id, updates)
      track('meal_edited', {
        meal_type: updates.meal_type,
        item_count: updates.items.length,
      })
      setEditingMeal(null)
    } catch (err) {
      toast.error('Failed to save changes. Please try again.')
      log.withMetadata({ error: errorMessage(err) }).error('handleSaveEdit failed')
    }
  }

  async function handleDelete(id: string) {
    // Capture the full meal object before deleting
    const meal = useEntriesStore.getState().meals.find((m) => m.id === id)
    if (!meal) return

    // Delete on the server immediately (also removes from local state)
    try {
      await deleteMeal(id)
      track('meal_deleted', {})
    } catch (err) {
      toast.error('Failed to delete meal. Please try again.')
      log.withMetadata({ error: errorMessage(err) }).error('handleDelete failed')
      return
    }

    // Show toast with Undo action — undo reinserts via a real server call
    toast.success('Meal deleted', {
      label: 'Undo',
      onClick: () => {
        addMeal({
          meal_type: meal.meal_type,
          consumed_at: meal.consumed_at,
          raw_input: meal.raw_input ?? '',
          items: meal.items.map((i) => i.description),
        }).catch(() => {
          toast.error('Failed to undo delete. Please try again.')
        })
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
      log.withMetadata({ error: errorMessage(err) }).error('handleDuplicate failed')
    }
  }

  async function handleEstimateCalories(meal: MealWithItems) {
    const itemsNeedingCalories = meal.items.filter((i) => i.calories === null)
    if (itemsNeedingCalories.length === 0) return
    track('calorie_estimate_requested', {
      item_count: itemsNeedingCalories.length,
      trigger: 'manual',
    })
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
  const step = viewMode === 'week' ? 7 : 1

  function getMastheadKicker(dateStr: string): string {
    const d = new Date(`${dateStr}T12:00:00`)
    const startOfYear = new Date(d.getFullYear(), 0, 0)
    const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000)
    const weekNum = Math.ceil(dayOfYear / 7)
    if (viewMode === 'week') {
      const { start, end } = getWeekBounds(dateStr)
      const fmt = (s: string) =>
        new Date(`${s}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      return `Week ${weekNum} · ${fmt(start)} – ${fmt(end)}`
    }
    return `Week ${weekNum} · Day ${dayOfYear}`
  }

  function getMastheadTitle(dateStr: string): string {
    const today = todayString()
    if (viewMode === 'week') {
      return getWeekBounds(dateStr).start === getWeekBounds(today).start ? 'This week' : 'That week'
    }
    if (dateStr === today) return 'Today'
    const d = new Date(`${dateStr}T12:00:00`)
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  }

  function getMastheadSubtitle(dateStr: string, meals: MealWithItems[]): string {
    if (viewMode === 'week') {
      const count = weekMeals.length
      return count > 0 ? `${count} meal${count === 1 ? '' : 's'} logged this week` : 'Nothing logged yet'
    }
    const d = new Date(`${dateStr}T12:00:00`)
    const datePart = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    const mealCount = meals.length
    const mealWord = mealCount === 1 ? 'meal' : 'meals'
    return mealCount > 0
      ? `${datePart} · ${mealCount} ${mealWord} logged`
      : datePart
  }

  return (
    <div className="app">
      <nav className="ei-nav">
        <span className="ei-nav__back" aria-hidden="true">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M8 1L2 8l6 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <div className="ei-nav__right">
          <button
            className="ei-nav__icon-btn"
            aria-label="Search meals"
            onClick={() => { track('search_opened', {}); setSearchOpen(true) }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
          <AuthButton user={user} isAdmin={!!user?.app_metadata?.is_admin} onExportPdf={() => setPdfExportOpen(true)} />
        </div>
      </nav>

      <div className="ei-masthead">
        <span className="ei-kicker">
          {getMastheadKicker(selectedDate)}
        </span>
        <h1 className="ei-masthead__title">
          {getMastheadTitle(selectedDate)}
        </h1>
        <p className="ei-masthead__sub">
          {getMastheadSubtitle(selectedDate, displayedMeals)}
        </p>
      </div>

      {/* Glowing compose bar — in flow on desktop, docked to bottom on mobile */}
      {isViewingToday && viewMode === 'day' && (
        <div className="ei-compose-pill" onClick={() => setComposerOpen(true)}>
          <svg className="ei-compose-pill__icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 13.5V16h2.5L13.07 7.43 10.57 4.93 2 13.5z" fill="currentColor" opacity="0.55"/>
            <path d="M15.41 4.59a1 1 0 000-1.42l-1.58-1.58a1 1 0 00-1.42 0L11 3l2.5 2.5 1.91-1.91z" fill="currentColor" opacity="0.55"/>
          </svg>
          <span className="ei-compose-pill__text">Log a meal…</span>
          <div className="ei-compose-pill__btn">
            <span>✎</span>
          </div>
        </div>
      )}

      <main className="app-main">
        <DateNav
          date={selectedDate}
          onPrev={() => setSelectedDate((d) => offsetDate(d, -step))}
          onNext={() => setSelectedDate((d) => offsetDate(d, step))}
          onToday={() => setSelectedDate(todayString())}
          viewMode={viewMode}
          onViewModeChange={(m) => { track('view_mode_changed', { mode: m }); setViewMode(m) }}
        />
        {viewMode === 'week' ? (
          <WeekView
            weekMeals={weekMeals}
            weekStart={getWeekBounds(selectedDate).start}
            isLoading={weekIsLoading}
            onNavigateToDay={(date) => { setSelectedDate(date); setViewMode('day') }}
          />
        ) : (
          <>
            <DaySummary meals={displayedMeals} />
            <div className="ei-section-kicker">
              <span className="ei-section-kicker__text">— Today's Menu</span>
              <div className="ei-section-kicker__rule" />
            </div>
            <MealLog
              meals={displayedMeals}
              isLoading={dayIsLoading}
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
              onSelect={(meal) => setSelectedMeal(meal)}
              onTryExample={(sentence) => {
                setComposerInitialInput(sentence)
                setComposerOpen(true)
              }}
            />
          </>
        )}
      </main>

      {composerOpen && (
        <div className="ei-compose-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setComposerOpen(false); setComposerInitialInput('') } }}>
          <div className="ei-compose-sheet">
            <MealComposer
              initialInput={composerInitialInput}
              onAdd={(payload) => { handleAddMeal(payload); setComposerOpen(false); setComposerInitialInput('') }}
              onCancel={() => { setComposerOpen(false); setComposerInitialInput('') }}
            />
          </div>
        </div>
      )}

      {selectedMeal && (
        <MealDetail
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          onEdit={(meal) => { setSelectedMeal(null); setEditingMeal(meal) }}
          onDelete={(id) => { setSelectedMeal(null); handleDelete(id) }}
        />
      )}

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

      {pdfExportOpen && (
        <PdfExportModal onClose={() => setPdfExportOpen(false)} />
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
