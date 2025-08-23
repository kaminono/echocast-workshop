// file: src/utils/hotkeys.ts
'use client'
import { useEffect } from 'react'

export function useSaveHotkey(onSave: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        onSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSave])
}

export function handleTextareaEnter(e: React.KeyboardEvent<HTMLTextAreaElement>, submit: () => void) {
  if (e.key === 'Enter') {
    if (e.shiftKey) return // 换行
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      submit()
      return
    }
    // 默认 Enter 提交
    e.preventDefault()
    submit()
  }
}
