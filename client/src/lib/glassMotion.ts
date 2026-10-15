/**
 * Imperative DOM motion for the Liquid Glass log flow: FLIP for reordering
 * cards and the "glide" that flies typed bubbles into the new meal card.
 *
 * Everything keys off data attributes so the React tree stays declarative:
 *   [data-meal="<id>"]  a meal card
 *   [data-land]         an item row inside a card (a bubble's destination)
 *   [data-src-chip]     a live bubble in the compose tray (a flight's origin)
 *   [data-flight-layer] overlay the flying clones are appended to
 */

export const EASE_MOVE = 'cubic-bezier(.65,0,.35,1)'
export const EASE_SETTLE = 'cubic-bezier(.22,1,.36,1)'

export const FLIP_MS = 560
export const FLIGHT_MS = 820
export const FLIGHT_STAGGER_MS = 70
/** The real row fades in this long after a bubble starts flying. */
const ROW_REVEAL_MS = 700
/** Day ↔ week zoom duration; flights wait for it when switching views. */
export const ZOOM_MS = 620

export interface FlightSource {
  el: HTMLElement
  rect: DOMRect
}

export interface Flight {
  /** Ids on screen when the meal was submitted — anything else is new. */
  beforeIds: Set<string>
  /** Item descriptions that were submitted, used to recognise the saved meal. */
  items: string[]
  srcs: FlightSource[]
  before: Record<string, DOMRect>
  /** Wait for the week → day zoom before measuring targets. */
  waitForZoom: boolean
  /** Epoch ms of submission — a matching saved meal cannot be much older. */
  startedAt: number
  /** Epoch ms after which an unmatched flight is abandoned. */
  expiresAt: number
  /** Id of the saved meal once the server has answered — a fallback match. */
  savedId: string | null
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Ratio of rendered to layout size (differs from 1 under CSS transforms). */
function scaleOf(root: HTMLElement): { rect: DOMRect; s: number } {
  const rect = root.getBoundingClientRect()
  return { rect, s: rect.width / root.offsetWidth || 1 }
}

export function snapshotMeals(root: HTMLElement): Record<string, DOMRect> {
  const out: Record<string, DOMRect> = {}
  root.querySelectorAll<HTMLElement>('[data-meal]').forEach((el) => {
    out[el.dataset.meal!] = el.getBoundingClientRect()
  })
  return out
}

/** Slide cards from where they were to where they are now. */
export function flipMeals(root: HTMLElement, before: Record<string, DOMRect>): void {
  if (prefersReducedMotion()) return
  const { s } = scaleOf(root)
  root.querySelectorAll<HTMLElement>('[data-meal]').forEach((el) => {
    const b = before[el.dataset.meal!]
    if (!b) return
    const a = el.getBoundingClientRect()
    const dy = (b.top - a.top) / s
    const dx = (b.left - a.left) / s
    if (Math.abs(dy) < 1 && Math.abs(dx) < 1) return
    el.animate(
      [{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'translate(0,0)' }],
      { duration: FLIP_MS, easing: EASE_MOVE },
    )
  })
}

/** Clone the live bubbles (with their on-screen rects) ready to be flown. */
export function captureBubbles(root: HTMLElement): FlightSource[] {
  return [...root.querySelectorAll<HTMLElement>('[data-src-chip]')].map((el) => ({
    el: el.cloneNode(true) as HTMLElement,
    rect: el.getBoundingClientRect(),
  }))
}

/** Pin a cloned bubble over the spot its original occupied. */
function placeBubble(el: HTMLElement, rect: DOMRect, rootRect: DOMRect, s: number): void {
  Object.assign(el.style, {
    position: 'absolute',
    margin: '0',
    left: `${(rect.left - rootRect.left) / s}px`,
    top: `${(rect.top - rootRect.top) / s}px`,
    width: `${rect.width / s}px`,
    height: `${rect.height / s}px`,
    transformOrigin: '0 0',
    animation: 'none',
    zIndex: '60',
  })
}

/**
 * Put the clones on the flight layer right away, exactly over the live
 * bubbles, so they stay visible while the meal is being saved.
 */
export function parkBubbles(root: HTMLElement, srcs: FlightSource[]): void {
  const layer = root.querySelector<HTMLElement>('[data-flight-layer]')
  if (!layer || prefersReducedMotion()) return
  const { rect: rootRect, s } = scaleOf(root)
  srcs.forEach(({ el, rect }) => {
    placeBubble(el, rect, rootRect, s)
    layer.appendChild(el)
  })
}

/** A flight that never landed (failed save, timeout): fade its bubbles away. */
export function discardBubbles(srcs: FlightSource[]): void {
  srcs.forEach(({ el }) => {
    if (!el.isConnected) return
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = () => el.remove()
  })
}

function revealRows(targets: HTMLElement[]): void {
  targets.forEach((t) => { t.style.opacity = '1' })
}

/**
 * Fly each captured bubble to its matching item row of meal `mealId`.
 * Resolves once every bubble has landed (or immediately if there is nothing
 * to animate). No bounce or overshoot anywhere.
 */
export function flyBubbles(root: HTMLElement, mealId: string, srcs: FlightSource[]): Promise<void> {
  const targets = [...root.querySelectorAll<HTMLElement>(`[data-meal="${CSS.escape(mealId)}"] [data-land]`)]
  const layer = root.querySelector<HTMLElement>('[data-flight-layer]')

  if (!layer || prefersReducedMotion()) {
    revealRows(targets)
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const { rect: rootRect, s } = scaleOf(root)
    let pending = 0

    srcs.forEach((src, i) => {
      const tgt = targets[i]
      if (!tgt) return
      const sr = src.rect
      const tr = tgt.getBoundingClientRect()
      const el = src.el
      placeBubble(el, sr, rootRect, s)
      layer.appendChild(el)

      const dx = (tr.left - sr.left) / s
      const dy = (tr.top - sr.top) / s
      const k = tr.height / sr.height
      const lift = Math.min(60, Math.abs(dy) * 0.25 + 18)
      pending++

      const anim = el.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1, filter: 'blur(0px)' },
          {
            transform: `translate(${dx * 0.5}px,${dy * 0.5 - lift}px) scale(${((1 + k) / 2) * 1.06})`,
            opacity: 1,
            filter: 'blur(0.4px)',
            offset: 0.5,
          },
          { transform: `translate(${dx}px,${dy}px) scale(${k})`, opacity: 1, filter: 'blur(0px)', offset: 0.86 },
          { transform: `translate(${dx}px,${dy}px) scale(${k})`, opacity: 0, filter: 'blur(0px)' },
        ],
        { duration: FLIGHT_MS, delay: i * FLIGHT_STAGGER_MS, easing: EASE_MOVE, fill: 'both' },
      )
      window.setTimeout(() => { tgt.style.opacity = '1' }, i * FLIGHT_STAGGER_MS + ROW_REVEAL_MS)
      anim.onfinish = () => {
        el.remove()
        if (--pending === 0) resolve()
      }
    })

    // Rows without a bubble (more rows than bubbles) just appear.
    targets.slice(srcs.length).forEach((t) => { t.style.opacity = '1' })
    if (pending === 0) resolve()
  })
}

/** Fade a card out (opacity / scale / blur). Resolves when it is gone. */
export function fadeOutCard(el: HTMLElement): { finished: Promise<void>; cancel: () => void } {
  el.style.pointerEvents = 'none'
  if (prefersReducedMotion()) {
    el.style.visibility = 'hidden'
    return { finished: Promise.resolve(), cancel: () => { el.style.visibility = ''; el.style.pointerEvents = '' } }
  }
  const anim = el.animate(
    [
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' },
      { opacity: 0, transform: 'scale(.95)', filter: 'blur(3px)' },
    ],
    { duration: 260, easing: EASE_MOVE, fill: 'forwards' },
  )
  const finished = new Promise<void>((resolve) => {
    anim.onfinish = () => { el.style.visibility = 'hidden'; resolve() }
  })
  return {
    finished,
    cancel: () => {
      anim.cancel()
      el.style.visibility = ''
      el.style.pointerEvents = ''
    },
  }
}
