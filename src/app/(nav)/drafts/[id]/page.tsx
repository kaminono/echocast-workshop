// file: src/app/(nav)/drafts/[id]/page.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as DraftRepo from '@/lib/repos/draft-repo'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import IdeaSummary from '@/components/IdeaSummary'
import DraftEditor from '@/components/DraftEditor'
import SuggestBox from '@/components/SuggestBox'
import { useSaveHotkey } from '@/utils/hotkeys'
import { useToast } from '@/components/Toast'
import { publishDraft } from '@/lib/services/publishDraft'

export default function DraftDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { show } = useToast()

  const [draft, setDraft] = useState<any | null>(null)
  const [idea, setIdea] = useState<any | null>(null)
  const [latestVersion, setLatestVersion] = useState<number>(0)

  useEffect(() => {
    if (!id) return
    (async () => {
      const d = await DraftRepo.getById(id)
      if (!d) { show('草稿不存在', 'error'); router.push('/drafts'); return }
      setDraft(d)
      const i = await IdeaRepo.getById(d.ideaId)
      setIdea(i)
      const max = await FinalRepo.getMaxVersion(d.ideaId)
      setLatestVersion(max)
    })()
  }, [id])

  useSaveHotkey(async () => {
    if (!draft) return
    try {
      // 先保存当前编辑中的草稿，确保发布读取到的是最新内容
      await DraftRepo.save(draft)
      const res = await publishDraft(draft.ideaId)
      setLatestVersion(res.versionNumber)
      show(`已发布为 v${res.versionNumber}`, 'success')
    } catch (e) {
      show('发布失败，请重试', 'error')
    }
  })

  const onChange = (next: any) => setDraft(next)

  async function applyFourFields(four: { title: string; intro: string; bulletPoints: string[]; cta: string; content: string }) {
    if (!draft) return
    const merged = { ...draft, ...four }
    const saved = await DraftRepo.save(merged)
    setDraft(saved)
  }

  if (!draft || !idea) return <div className="max-w-4xl mx-auto px-4 py-8">加载中…</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">草稿编辑</h1>
        <div className="flex items-center gap-3">
          {latestVersion > 0 && (
            <a className="text-sm text-blue-600 hover:underline" href={`/finals/${draft.ideaId}`}>最新定稿 v{latestVersion}</a>
          )}
          <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={async () => {
            try {
              // 发布前保存当前草稿的最新更改
              await DraftRepo.save(draft)
              const res = await publishDraft(draft.ideaId)
              setLatestVersion(res.versionNumber)
              show(`已发布为 v${res.versionNumber}`, 'success')
            } catch (e) {
              show('发布失败，请重试', 'error')
            }
          }} aria-label="发布">发布</button>
        </div>
      </div>

      <IdeaSummary idea={idea} />

      <div className="bg-white rounded-lg shadow p-4">
        <DraftEditor draft={draft} onChange={onChange} />
      </div>

      <SuggestBox idea={idea} draft={draft} onApply={applyFourFields} />
    </div>
  )
}
