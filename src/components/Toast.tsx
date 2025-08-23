// file: src/components/Toast.tsx
'use client'
import React, { createContext, useCallback, useContext, useState } from 'react'

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem { id: string; kind: ToastKind; message: string }

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = crypto.randomUUID()
    setItems((prev) => [...prev, { id, kind, message }])
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {items.map((t) => (
          <div key={t.id} role="status" className={
            `min-w-[240px] px-4 py-3 rounded shadow text-white ` +
            (t.kind === 'success' ? 'bg-green-600' : t.kind === 'error' ? 'bg-red-600' : 'bg-gray-800')
          }>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
