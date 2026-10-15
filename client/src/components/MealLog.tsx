import { useCallback, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import type { MealWithItems } from '@shared/types/database'
import { EASE_SETTLE, ZOOM_MS, fadeOutCard, flipMeals, flyBubbles, prefersReducedMotion, snapshotMeals, type Flight } from '../lib/glassMotion'
import { MealCard } from './MealCard'

/** A meal created this recently that we did not log ourselves counts as "arrived". */
const FRESH_WINDOW_MS = 20_000
/** Tolerance between this device's clock and the server's created_at. */
const FLIGHT_CLOCK_SKEW_MS = 30_000

interface Props {
  /** Meals for the selected day, any order. */
  meals: MealWithItems[]
  isLoading: boolean
  /** App root: coordinate space for flights and home of the flight layer. */
  rootRef: RefObject<HTMLElement | null>
  /** The submission whose bubbles are about to glide into their new card. */
  flight: Flight | null
  onFlightDone: (flight: Flight) => void
  /** A meal just landed or arrived — the sky blooms in its color. */
  onFresh: (meal: MealWithItems) => void
  onEdit: (meal: MealWithItems) => void
  /** Resolves true once the meal is gone, false if the delete failed. */
  onDelete: (id: string) => Promise<boolean>
  onDuplicate: (meal: MealWithItems) => void
  onUpdateCalories: (itemId: string, calories: number | null) => Promise<void>
  onEstimateCalories?: (meal: MealWithItems) => Promise<void>
  onSelect?: (meal: MealWithItems) => void
}

function LoadingSkeleton() {
  return (
    <div className="gl-list" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="gl-skel gl-glass">
          <div className="skeleton-pulse skeleton-pulse--time" />
          <div className="skeleton-pulse skeleton-pulse--desc" />
        </div>
      ))}
    </div>
  )
}

function sameItems(meal: MealWithItems, items: string[]): boolean {
  return meal.items.length === items.length && meal.items.every((it, i) => it.description === items[i])
}

/** The day's meal cards, newest first, with the glide / FLIP / fade motion. */
export function MealLog({
  meals, isLoading, rootRef, flight, onFlightDone, onFresh,
  onEdit, onDelete, onDuplicate, onUpdateCalories, onEstimateCalories, onSelect,
}: Props) {
  const sorted = useMemo(
    () => [...meals].sort((a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()),
    [meals],
  )

  // The saved meal that matches the submission: new on screen, same items.
  const landingId = useMemo(() => {
    if (!flight) return null
    const byContent = sorted.find((m) => (
      !flight.beforeIds.has(m.id)
      && sameItems(m, flight.items)
      && new Date(m.created_at).getTime() >= flight.startedAt - FLIGHT_CLOCK_SKEW_MS
    ))
    if (byContent) return byContent.id
    // Server answered but its timestamps/text disagree with ours: trust the id.
    return flight.savedId && sorted.some((m) => m.id === flight.savedId) ? flight.savedId : null
  }, [flight, sorted])

  const seenRef = useRef(new Set<string>())
  const flownRef = useRef<string | null>(null)
  const pendingFlipRef = useRef<{ id: string; before: Record<string, DOMRect> } | null>(null)

  // Landing: reflow the list and glide the bubbles into the new card.
  useLayoutEffect(() => {
    if (!flight || !landingId || flownRef.current === landingId) return
    flownRef.current = landingId
    seenRef.current.add(landingId)
    const meal = sorted.find((m) => m.id === landingId)
    if (meal) onFresh(meal)

    const root = rootRef.current
    if (!root) { onFlightDone(flight); return }
    const run = () => {
      flipMeals(root, flight.before)
      void flyBubbles(root, landingId, flight.srcs).then(() => onFlightDone(flight))
    }
    // No cleanup on purpose: this effect re-runs when `sorted` changes (e.g. a
    // calorie update), and cancelling here would strand the hidden item rows.
    if (flight.waitForZoom && !prefersReducedMotion()) window.setTimeout(run, ZOOM_MS)
    else run()
  }, [flight, landingId, sorted, rootRef, onFlightDone, onFresh])

  // Arrivals we did not log ourselves (undo, log again, another device).
  useLayoutEffect(() => {
    const root = rootRef.current
    const seen = seenRef.current
    const arrived: MealWithItems[] = []
    for (const m of sorted) {
      if (seen.has(m.id)) continue
      seen.add(m.id)
      if (m.id === landingId) continue
      if (Date.now() - new Date(m.created_at).getTime() < FRESH_WINDOW_MS) arrived.push(m)
    }
    if (arrived.length === 0) return
    arrived.forEach((m) => {
      onFresh(m)
      if (prefersReducedMotion()) return
      root?.querySelector<HTMLElement>(`[data-meal="${CSS.escape(m.id)}"]`)?.animate(
        [{ opacity: 0, transform: 'translateY(-10px) scale(.98)' }, { opacity: 1, transform: 'none' }],
        { duration: 600, easing: EASE_SETTLE },
      )
    })
  }, [sorted, landingId, rootRef, onFresh])

  // Deleted cards: remaining cards slide into the gap.
  useLayoutEffect(() => {
    const root = rootRef.current
    const pending = pendingFlipRef.current
    // Wait for the deleted card to actually leave the list (other updates,
    // e.g. a calorie edit, must not consume the reflow).
    if (!root || !pending || sorted.some((m) => m.id === pending.id)) return
    pendingFlipRef.current = null
    flipMeals(root, pending.before)
  }, [sorted, rootRef])

  const requestDelete = useCallback(async (id: string) => {
    const root = rootRef.current
    const el = root?.querySelector<HTMLElement>(`[data-meal="${CSS.escape(id)}"]`) ?? null
    const before = root ? snapshotMeals(root) : null
    const fade = el ? fadeOutCard(el) : null
    await fade?.finished
    pendingFlipRef.current = before ? { id, before } : null
    const ok = await onDelete(id)
    if (!ok) {
      pendingFlipRef.current = null
      fade?.cancel()
    }
  }, [onDelete, rootRef])

  if (isLoading) return <LoadingSkeleton />

  if (sorted.length === 0) {
    return (
      <div className="gl-empty gl-glass">
        <b>A clean slate.</b>
        Log your first meal and it will appear here.
      </div>
    )
  }

  return (
    <div className="gl-list">
      {sorted.map((meal) => (
        <MealCard
          key={meal.id}
          meal={meal}
          fx={meal.id === landingId ? 'landing' : null}
          onEdit={onEdit}
          onDelete={requestDelete}
          onDuplicate={onDuplicate}
          onUpdateCalories={onUpdateCalories}
          onEstimateCalories={onEstimateCalories}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
