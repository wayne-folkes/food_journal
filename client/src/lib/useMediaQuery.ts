import { useSyncExternalStore } from 'react'

/** Subscribe to a CSS media query. Returns false where matchMedia is missing. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  )
}

/** Phone layout: docked compose bar, compact top bar. Keep in sync with glass.css. */
export const MOBILE_QUERY = '(max-width: 720px)'
