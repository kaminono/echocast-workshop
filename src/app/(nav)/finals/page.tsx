// file: src/app/(nav)/finals/page.tsx
'use client'
import { useEffect, useState } from 'react'
import * as FinalRepo from '@/lib/repos/final-repo'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import Link from 'next/link'
import { formatRelativeTime } from '@/utils/format'

export default function FinalsPage() {
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      const metas = await FinalRepo.listByUpdatedAtDesc()
      const data = await Promise.all(metas.map(async (m) => ({ meta: m, idea: await IdeaRepo.getById(m.ideaId) })))
      setRows(data)
    })()
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">定稿列表</h1>
      <div className="bg-white rounded-lg shadow divide-y">
        {rows.length === 0 && (
          <div className="py-12 text-center text-gray-500">暂无定稿</div>
        )}
        {rows.map(({ meta, idea }) => (
          <div key={meta.finalScriptId} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{idea?.title || meta.finalScriptId}</div>
              <div className="text-sm text-gray-600">最高版本 v{meta.maxVersion} · 更新于 {formatRelativeTime(meta.updatedAt)}</div>
            </div>
            <Link href={`/finals/${meta.finalScriptId}`} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">查看详情</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
