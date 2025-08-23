// file: src/components/IdeaSummary.tsx
'use client'
import type { Idea } from '@/types/domain'
import { formatRelativeTime } from '@/utils/format'

export default function IdeaSummary({ idea }: { idea: Idea }) {
  const createdAtIso = new Date(idea.createdAt).toISOString()
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{idea.title}</h2>
          <p className="text-sm text-gray-500 mt-1">来源：{idea.source || 'text'} · 创建于 {formatRelativeTime(createdAtIso)}</p>
        </div>
      </div>
      <div className="mt-3 text-gray-700 text-sm leading-6">
        {idea.summary || idea.rawInputText || '（无摘要）'}
      </div>
    </div>
  )
}
