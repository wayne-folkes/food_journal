import { useCallback, useRef, useState } from 'react'
import { ToastContext, type ToastAction, type ToastContextValue, type ToastKind } from '../lib/toast'

interface ToastItem {
  id: number
  message: string
  kind: ToastKind
  action?: ToastAction
}

const MAX_TOASTS = 3
const DISMISS_MS = 5500

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const add = useCallback((message: string, kind: ToastKind, action?: ToastAction) => {
    const id = nextId.current++
    setToasts((prev) => {
      const next = [...prev, { id, message, kind, action }]
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
    })
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, DISMISS_MS)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value: ToastContextValue = {
    error: useCallback((msg, action) => add(msg, 'error', action), [add]),
    success: useCallback((msg, action) => add(msg, 'success', action), [add]),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          <span className="toast__message">{t.message}</span>
          {t.action && (
            <button
              className="toast__action"
              onClick={() => { t.action!.onClick(); onDismiss(t.id) }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
