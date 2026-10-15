import { useEffect, useRef, useState } from 'react'

/**
 * Tween a number toward `value` with an ease-out cubic (1-(1-p)^3).
 * Starts from 0 on mount so counts "fill up" when they first appear.
 */
export function useTween(value: number, durationMs = 650): number {
  const [shown, setShown] = useState(0)
  const current = useRef(0)

  useEffect(() => {
    const from = current.current
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      current.current = from + (value - from) * eased
      setShown(current.current)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])

  return shown
}
