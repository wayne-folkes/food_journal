import { createContext, useContext } from 'react'

export type ToastKind = 'error' | 'success'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastContextValue {
  error: (message: string, action?: ToastAction) => void
  success: (message: string, action?: ToastAction) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
