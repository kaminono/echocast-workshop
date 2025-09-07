'use client'

import { useState } from 'react'
import { exportAndDownload } from '@/lib/services/exportData'

export default function ExportButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onClick() {
    setError(null)
    setLoading(true)
    try {
      await exportAndDownload()
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 disabled:opacity-60"
        disabled={loading}
        aria-busy={loading}
        aria-label="导出数据"
      >
        {loading ? '导出中…' : '导出数据'}
      </button>
      {error && <span className="text-red-500 text-sm" role="alert">{error}</span>}
    </div>
  )
}


