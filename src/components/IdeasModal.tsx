// file: src/components/IdeasModal.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import * as DraftRepo from '@/lib/repos/draft-repo'
import type { Idea } from '@/types/domain'
import { useRouter } from 'next/navigation'

export default function IdeasModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [keyword, setKeyword] = useState('')
  const [onlyWithoutDraft, setOnlyWithoutDraft] = useState(true)
  const [items, setItems] = useState<Idea[]>([])
  const [ideaIdsWithDraft, setIdeaIdsWithDraft] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      const [ideas, drafts] = await Promise.all([
        IdeaRepo.search(keyword),
        DraftRepo.listByUpdatedDesc(),
      ])
      if (cancelled) return
      setItems(ideas)
      setIdeaIdsWithDraft(new Set(drafts.map((d) => d.ideaId)))
    })()
    return () => { cancelled = true }
  }, [open, keyword])

  const filtered = useMemo(() => {
    if (!onlyWithoutDraft) return items
    return items.filter((i) => !ideaIdsWithDraft.has(i.id))
  }, [items, onlyWithoutDraft, ideaIdsWithDraft])

  async function choose(idea: Idea) {
    const existing = await DraftRepo.findByIdeaId(idea.id)
    if (existing) {
      onClose()
      router.push(`/drafts/${existing.id}`)
      return
    }
    const draft = await DraftRepo.create({
      ideaId: idea.id,
      title: '',
      intro: '',
      bulletPoints: [],
      cta: '',
      content: '',
      status: 'draft',
    })
    onClose()
    router.push(`/drafts/${draft.id}`)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">选择点子</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="关闭">✕</button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="搜索关键词"
            aria-label="搜索"
          />
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={onlyWithoutDraft} onChange={(e) => setOnlyWithoutDraft(e.target.checked)} />
            仅显示尚未创建草稿的点子
          </label>
        </div>

        <div className="mt-4 max-h-80 overflow-auto divide-y">
          {filtered.length === 0 && (
            <div className="text-gray-500 text-sm py-8 text-center">无匹配点子</div>
          )}
          {filtered.map((idea) => (
            <button key={idea.id} onClick={() => choose(idea)} className="w-full text-left py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none px-2 rounded">
              <div className="font-medium text-gray-900">{idea.title}</div>
              <div className="text-sm text-gray-600 line-clamp-2">{idea.summary || idea.rawInputText}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
