import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastKind = 'error' | 'success'

interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  error: (message: string) => void
  success: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const MAX_TOASTS = 3
const DISMISS_MS = 3000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const add = useCallback((message: string, kind: ToastKind) => {
    const id = nextId.current++
    setToasts((prev) => {
      const next = [...prev, { id, message, kind }]
      // Keep only the last MAX_TOASTS items
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
    })
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, DISMISS_MS)
  }, [])

  const value: ToastContextValue = {
    error: useCallback((msg) => add(msg, 'error'), [add]),
    success: useCallback((msg) => add(msg, 'success'), [add]),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
