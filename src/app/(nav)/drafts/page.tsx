// file: src/app/(nav)/drafts/page.tsx
'use client'
import { useEffect, useState } from 'react'
import * as DraftRepo from '@/lib/repos/draft-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import Link from 'next/link'
import IdeasModal from '@/components/IdeasModal'
import { formatRelativeTime } from '@/utils/format'

export default function DraftsPage() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    const drafts = await DraftRepo.listByUpdatedDesc()
    const data = await Promise.all(drafts.map(async (d) => {
      const idea = await IdeaRepo.getById(d.ideaId)
      const seriesId = d.ideaId
      const max = await FinalRepo.getMaxVersion(seriesId)
      return { draft: d, idea, latestVersion: max }
    }))
    setRows(data)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">文案草稿</h1>
        <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => setOpen(true)} aria-label="新建草稿">新建草稿</button>
      </div>

      <IdeasModal open={open} onClose={() => { setOpen(false); refresh() }} />

      <div className="bg-white rounded-lg shadow divide-y">
        {rows.length === 0 && (
          <div className="py-12 text-center text-gray-500">暂无草稿，点击“新建草稿”开始</div>
        )}
        {rows.map(({ draft, idea, latestVersion }) => (
          <div key={draft.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{draft.title || '未命名草稿'}</div>
              <div className="text-sm text-gray-600">点子：{idea?.title || draft.ideaId} · 更新于 {formatRelativeTime(draft.updatedAt)}</div>
            </div>
            <div className="flex items-center gap-3">
              {latestVersion > 0 && (
                <Link href={`/finals/${draft.ideaId}`} className="text-sm text-blue-600 hover:underline">最新定稿 v{latestVersion}</Link>
              )}
              <Link href={`/drafts/${draft.id}`} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">编辑</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
