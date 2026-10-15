import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { errorMessage } from '@shared/logger'
import { supabase } from './lib/supabase'
import { useEntriesStore, todayString, getWeekBounds } from './lib/store'
import { Sky, type Bloom } from './components/Sky'
import { TopBar } from './components/TopBar'
import { Compose, type ComposePayload } from './components/Compose'
import { RecentChips } from './components/RecentChips'
import { MealLog } from './components/MealLog'
import { MealDetail } from './components/MealDetail'
import { EditMealModal } from './components/EditMealModal'
import { AuthButton } from './components/AuthButton'
import { ToastProvider } from './components/Toast'
import { SearchOverlay } from './components/SearchOverlay'
import { PdfExportModal } from './components/PdfExportModal'
import { WeekView } from './components/WeekView'
import { lookupCalories, calorieSourceLabel } from './lib/caloriesLookup'
import { offsetDate } from './lib/date'
import { useToast } from './lib/toast'
import { track } from './lib/analytics'
import { log } from './lib/logger'
import { useNow, useSky } from './lib/useSky'
import { useMediaQuery, MOBILE_QUERY } from './lib/useMediaQuery'
import { useTween } from './lib/useTween'
import { captureBubbles, discardBubbles, parkBubbles, snapshotMeals, type Flight } from './lib/glassMotion'

import type { MealWithItems, MealType } from '@shared/types/database'
import type { ChipItem } from './lib/store'
import './App.css'
import './glass.css'

const FLIGHT_TIMEOUT_MS = 8_000
const BLOOM_MS = 2_700

const localDate = (iso: string) => new Date(iso).toLocaleDateString('sv')

function AppInner() {
  const { meals, isAuthed, isLoading, setAuthed, loadDay, addMeal, editMeal, deleteMeal, updateItemCalories, loadWeek, weekMeals, weekLoading, loadItemHistory, itemHistory } =
    useEntriesStore()
  const [user, setUser] = useState<User | null>(null)
  const [authResolved, setAuthResolved] = useState(false)
  const [editingMeal, setEditingMeal] = useState<MealWithItems | null>(null)
  const [selectedMeal, setSelectedMeal] = useState<MealWithItems | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayString)
  const [searchOpen, setSearchOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [composeText, setComposeText] = useState('')
  const [pdfExportOpen, setPdfExportOpen] = useState(false)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [blooms, setBlooms] = useState<Bloom[]>([])
  // Bumped each time the week view is shown so its tubes re-fill
  const [weekKey, setWeekKey] = useState(0)
  const activeUserIdRef = useRef<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const now = useNow()
  const sky = useSky(now)
  const mobile = useMediaQuery(MOBILE_QUERY)

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

  // ⌘K / Ctrl+K opens the search palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        track('search_opened', {})
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // The store can briefly hold another day's meals (or, for anonymous users,
  // every day's) — only ever show the selected date.
  const displayedMeals = useMemo(
    () => (!authResolved ? [] : meals.filter((m) => localDate(m.consumed_at) === selectedDate)),
    [authResolved, meals, selectedDate]
  )

  const dayIsLoading = !authResolved || isLoading
  const weekIsLoading = !authResolved || weekLoading

  async function handleAddMeal(payload: ComposePayload): Promise<MealWithItems | null> {
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
              if (found > 0) toast.success(`Got calorie estimate${found === 1 ? '' : 's'} for ${found} item${found === 1 ? '' : 's'} from ${calorieSourceLabel(results)}`)
            })
            .catch(() => {
              // silently fail — calorie lookup is best-effort
            })
        }
      }
      return savedMeal
    } catch (err) {
      toast.error('Failed to add meal. Please try again.')
      log.withMetadata({ error: errorMessage(err) }).error('handleAddMeal failed')
      return null
    }
  }

  /**
   * Log from the compose bar: park the bubbles over the tray (they glide into
   * the new card once it exists), save, then jump to the day it belongs to.
   */
  function handleCompose(payload: ComposePayload) {
    const root = rootRef.current
    const inDay = viewMode === 'day'
    let started: Flight | null = null
    if (root) {
      const startedAt = Date.now()
      const srcs = captureBubbles(root)
      parkBubbles(root, srcs)
      started = {
        beforeIds: new Set(displayedMeals.map((m) => m.id)),
        items: payload.items,
        srcs,
        // From week view the day layer is still shrunk — nothing to measure
        before: inDay ? snapshotMeals(root) : {},
        waitForZoom: !inDay,
        startedAt,
        expiresAt: startedAt + FLIGHT_TIMEOUT_MS,
        savedId: null,
      }
      setFlight(started)
    }
    setViewMode('day')
    setComposeText('')
    void handleAddMeal(payload).then((saved) => {
      if (!saved) {
        // Save failed: bubbles fade away and the typed text comes back
        if (started) discardBubbles(started.srcs)
        setFlight((f) => (f && started && f.startedAt === started.startedAt ? null : f))
        setComposeText((t) => t || payload.rawInput)
        return
      }
      // Jump only once saved — loading the target day while the save is in
      // flight could return a list that misses the new meal.
      setSelectedDate(localDate(payload.consumed_at))
      setFlight((f) => (f && started && f.startedAt === started.startedAt ? { ...f, savedId: saved.id } : f))
    })
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

  async function handleDelete(id: string): Promise<boolean> {
    // Capture the full meal object before deleting
    const meal = useEntriesStore.getState().meals.find((m) => m.id === id)
    if (!meal) return false

    // Delete on the server immediately (also removes from local state)
    try {
      await deleteMeal(id)
      track('meal_deleted', {})
    } catch (err) {
      toast.error('Failed to delete meal. Please try again.')
      log.withMetadata({ error: errorMessage(err) }).error('handleDelete failed')
      return false
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
    return true
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
      if (found > 0) toast.success(`Got calorie estimate${found === 1 ? '' : 's'} for ${found} item${found === 1 ? '' : 's'} from ${calorieSourceLabel(results)}`)
      else toast.error('No calorie data found for these items')
    } catch {
      toast.error('Failed to estimate calories')
    }
  }

  const today = todayString()
  const step = viewMode === 'week' ? 7 : 1
  const selected = new Date(`${selectedDate}T12:00:00`)
  const dayTitle =
    selectedDate === today ? 'Today'
    : selectedDate === offsetDate(today, -1) ? 'Yesterday'
    : selected.toLocaleDateString(undefined, { weekday: 'long' })
  const dayKicker =
    (selectedDate === today ? `Good ${sky.greeting} · ` : '') +
    selected.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  // Zoom toward the selected weekday's column (Mon = 0)
  const zoomOrigin = `${((((selected.getDay() + 6) % 7) + 0.5) / 7 * 100).toFixed(1)}% 30%`
  const nextDisabled =
    viewMode === 'week' ? getWeekBounds(selectedDate).end >= today : selectedDate >= today

  const mealCount = useTween(displayedMeals.length)
  const dayItemTotal = displayedMeals.reduce((n, m) => n + m.items.length, 0)
  const itemCount = useTween(dayItemTotal)

  function changeView(mode: 'day' | 'week') {
    if (mode === viewMode) return
    track('view_mode_changed', { mode })
    if (mode === 'week') setWeekKey((k) => k + 1)
    setViewMode(mode)
  }

  // Abandon a flight whose meal never showed up (failed save, wrong day…)
  useEffect(() => {
    if (!flight) return
    const t = setTimeout(() => {
      discardBubbles(flight.srcs)
      setFlight((f) => (f?.startedAt === flight.startedAt ? null : f))
    }, Math.max(0, flight.expiresAt - Date.now()))
    return () => clearTimeout(t)
  }, [flight])

  const handleFlightDone = useCallback((done: Flight) => {
    setFlight((current) => (current?.startedAt === done.startedAt ? null : current))
  }, [])

  const handleFresh = useCallback((meal: MealWithItems) => {
    const bloom: Bloom = { id: meal.id, color: `var(--meal-${meal.meal_type})` }
    setBlooms((b) => (b.some((x) => x.id === bloom.id) ? b : [...b, bloom]))
    setTimeout(() => setBlooms((b) => b.filter((x) => x.id !== bloom.id)), BLOOM_MS)
  }, [])

  return (
    <div className="app gl-root" ref={rootRef}>
      <Sky phase={sky.phase} blooms={blooms} />

      <TopBar
        viewMode={viewMode}
        onViewModeChange={changeView}
        onPrev={() => setSelectedDate((d) => offsetDate(d, -step))}
        onNext={() => setSelectedDate((d) => {
          // never step past today (a week step from last week would)
          const next = offsetDate(d, step)
          return next > todayString() ? todayString() : next
        })}
        onToday={() => setSelectedDate(todayString())}
        nextDisabled={nextDisabled}
        onSearch={() => { track('search_opened', {}); setSearchOpen(true) }}
        account={
          <AuthButton user={user} isAdmin={!!user?.app_metadata?.is_admin} onExportPdf={() => setPdfExportOpen(true)} />
        }
      />

      {/* Day and week are stacked layers; switching zooms between them */}
      <div className="gl-view">
        <div
          className={`zl zl--day${viewMode === 'day' ? '' : ' zl--off'}`}
          style={{ transformOrigin: zoomOrigin }}
          inert={viewMode !== 'day'}
        >
          <div className="gl-day">
            <div className="gl-left">
              <span className="gl-kick"><i />{dayKicker}</span>
              <h1 className="gl-h1">{dayTitle}</h1>
              <span className="gl-sub">
                <b>{Math.round(mealCount)}</b> {displayedMeals.length === 1 ? 'meal' : 'meals'} ·{' '}
                <b>{Math.round(itemCount)}</b> {dayItemTotal === 1 ? 'item' : 'items'}
              </span>

              {!mobile && (
                <Compose variant="panel" value={composeText} onChange={setComposeText} now={now} onSubmit={handleCompose} />
              )}

              {/* Recent items — tap to append to the compose input */}
              {!mobile && isAuthed && itemHistory.length > 0 && (
                <RecentChips
                  items={itemHistory.slice(0, 8)}
                  onSelect={(item) => setComposeText((t) => (t.trim() ? `${t.trim()}, ${item}` : item))}
                />
              )}

              {/* Anonymous-mode notice — meals are device-only until sign-in */}
              {authResolved && !isAuthed && (
                <p className="ei-signedout-banner">
                  Meals stay on this device. <span>Sign in to sync, search, and estimate calories.</span>
                </p>
              )}
            </div>

            <MealLog
              meals={displayedMeals}
              isLoading={dayIsLoading}
              rootRef={rootRef}
              flight={flight}
              onFlightDone={handleFlightDone}
              onFresh={handleFresh}
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
            />
          </div>
        </div>

        <div className={`zl zl--week${viewMode === 'week' ? '' : ' zl--off'}`} inert={viewMode !== 'week'}>
          <WeekView
            key={weekKey}
            weekMeals={weekMeals}
            weekStart={getWeekBounds(selectedDate).start}
            isLoading={weekIsLoading}
            onNavigateToDay={(date) => { setSelectedDate(date); setViewMode('day') }}
          />
        </div>
      </div>

      {mobile && (
        <Compose variant="dock" value={composeText} onChange={setComposeText} now={now} onSubmit={handleCompose} />
      )}

      <div className="fj-flight" data-flight-layer="" aria-hidden="true" />

      {selectedMeal && (
        <MealDetail
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          onEdit={(meal) => { setSelectedMeal(null); setEditingMeal(meal) }}
          onDelete={(id) => { setSelectedMeal(null); void handleDelete(id) }}
          onDuplicate={(meal) => { setSelectedMeal(null); handleDuplicate(meal) }}
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
