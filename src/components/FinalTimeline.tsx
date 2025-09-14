// file: src/components/FinalTimeline.tsx
'use client'
import type { FinalScript } from '@/types/domain'
import { useTimezone } from './TimezoneProvider'
import { formatDateTime } from '@/lib/time'

export default function FinalTimeline({ versions, current, onSelect }: { versions: FinalScript[]; current?: number; onSelect: (v: number) => void }) {
  const { timezone } = useTimezone()
  return (
    <div className="space-y-2">
      {versions.map((v) => (
        <button key={v.versionNumber} onClick={() => onSelect(v.versionNumber)} className={`w-full text-left px-3 py-2 rounded ${current===v.versionNumber?'bg-blue-50 text-blue-700':'hover:bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div className="font-medium">v{v.versionNumber} · {v.title}</div>
            <div className="text-xs text-gray-500">{formatDateTime(v.updatedAt, timezone)}</div>
          </div>
          <div className="text-sm text-gray-600 line-clamp-2">{v.intro}</div>
        </button>
      ))}
    </div>
  )
}
