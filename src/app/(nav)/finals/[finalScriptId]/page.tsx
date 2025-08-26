// file: src/app/(nav)/finals/[finalScriptId]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as FinalRepo from '@/lib/repos/final-repo'
import FinalTimeline from '@/components/FinalTimeline'
import { rollbackToVersion } from '@/lib/services/rollbackToVersion'
import { useToast } from '@/components/Toast'
import { formatRelativeTime } from '@/utils/format'
import LocaleCards from '@/components/LocaleCards'
import LocaleGenerateDialog from '@/components/LocaleGenerateDialog'
import * as LocaleRepo from '@/lib/repos/locale-repo'

export default function FinalDetailPage() {
  const params = useParams<{ finalScriptId: string }>()
  const finalScriptId = params.finalScriptId
  const router = useRouter()
  const { show } = useToast()

  const [versions, setVersions] = useState<any[]>([])
  const [current, setCurrent] = useState<number | undefined>(undefined)
  const [locales, setLocales] = useState<any[]>([])
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    (async () => {
      const list = await FinalRepo.getSeriesVersions(finalScriptId)
      setVersions(list)
      setCurrent(list[list.length - 1]?.versionNumber)
    })()
  }, [finalScriptId])

  const selected = versions.find((v) => v.versionNumber === current)

  useEffect(() => {
    (async () => {
      if (!selected) return
      const all = await LocaleRepo.listByFinal(finalScriptId, selected.versionNumber)
      setLocales(all)
    })()
  }, [finalScriptId, selected?.versionNumber])

  async function rollback() {
    if (!current) return
    try {
      const draft = await rollbackToVersion(finalScriptId, current)
      show('已回滚到草稿', 'success')
      router.push(`/drafts/${draft.id}`)
    } catch (e) {
      show('回滚失败', 'error')
    }
  }

  if (versions.length === 0) return <div className="max-w-6xl mx-auto px-4 py-10 text-center text-gray-500">暂无定稿版本</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* Sidebar */}
      <aside className="md:col-span-4 lg:col-span-3">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-gray-700 tracking-wider">版本时间线</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <FinalTimeline versions={versions} current={current} onSelect={setCurrent} />
        </div>
      </aside>

      {/* Content */}
      <section className="md:col-span-8 lg:col-span-9">
        {selected && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-indigo-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-600 text-white">v{selected.versionNumber}</span>
                    <span className="text-xs text-blue-700/80 bg-white/70 px-2 py-0.5 rounded-full border border-blue-100">{selected.status === 'published' ? '已发布' : '已归档'}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{selected.title}</h1>
                </div>
                <div className="text-right min-w-[160px]">
                  <div className="text-xs text-gray-500">更新时间</div>
                  <div className="text-sm font-medium text-gray-700">{formatRelativeTime(selected.updatedAt)}</div>
                  {selected.publishedAt && (
                    <div className="mt-1 text-xs text-gray-500">发布于 {new Date(selected.publishedAt).toLocaleString()}</div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {/* 预留元数据标签位 */}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  共 {selected.bulletPoints?.length || 0} 个要点
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-2 border rounded-md" onClick={() => setShowDialog(true)}>生成多语种</button>
                  <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors" onClick={rollback} aria-label="回滚到此版本">回滚到此版本</button>
                </div>
              </div>
            </div>

            {/* Intro */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">引子</h3>
              <div className="text-gray-800 leading-7 max-w-[72ch] break-words">{selected.intro}</div>
            </div>

            {/* Bullets */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">要点</h3>
              <ul className="space-y-2 max-w-[72ch]">
                {selected.bulletPoints?.map((b: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 break-words">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-500"></span>
                    <span className="text-gray-800 leading-7">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="text-sm font-semibold text-emerald-900 mb-2">行动号召</div>
              <p className="text-emerald-900/90 max-w-[72ch] break-words leading-7">{selected.cta}</p>
            </div>

            {/* Full content */}
            {selected.content && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-sm font-semibold text-gray-700">完整文案</h3>
                </div>
                <div className="p-6">
                  <div className="text-sm leading-7 text-gray-800 max-w-[80ch] break-words whitespace-pre-wrap">{selected.content}</div>
                </div>
              </div>
            )}

            {/* Locales Section */}
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-700">多语种翻译</div>
                <div className="text-xs text-gray-500">新版本不会继承旧翻译</div>
              </div>
              <div className="p-6">
                {locales.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm">点击右上角生成多语种</div>
                ) : (
                  <LocaleCards
                    finalScriptId={finalScriptId}
                    sourceVersion={selected.versionNumber}
                    source={{ title: selected.title, intro: selected.intro, bulletPoints: selected.bulletPoints, cta: selected.cta }}
                    items={locales.map((l) => ({
                      locale: l.locale,
                      languageName: l.languageName || l.locale,
                      status: l.status as any,
                      updatedAt: l.updatedAt,
                      title: l.title,
                      intro: l.intro,
                      bulletPoints: l.bulletPoints,
                      cta: l.cta,
                    }))}
                    onReload={async () => {
                      const all = await LocaleRepo.listByFinal(finalScriptId, selected?.versionNumber)
                      setLocales(all)
                    }}
                  />
                )}
              </div>
            </div>
            {showDialog && (
              <LocaleGenerateDialog
                finalScriptId={finalScriptId}
                source={{ title: selected.title, intro: selected.intro, bulletPoints: selected.bulletPoints, cta: selected.cta, sourceVersion: selected.versionNumber }}
                existingLocales={locales.map((l: any) => l.locale)}
                onClose={() => setShowDialog(false)}
                onDone={async () => {
                  const all = await LocaleRepo.listByFinal(finalScriptId, selected?.versionNumber)
                  setLocales(all)
                }}
              />
            )}
          </div>
        )}
      </section>
    </div>
  )
}
