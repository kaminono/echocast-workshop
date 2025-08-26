'use client'
import { useState } from 'react'
import { formatRelativeTime } from '@/utils/format'
import { validateTitle, validateBulletPoints, validateCTA } from '@/utils/validation'
import { saveLocale, retryLocale } from '@/lib/services/translateLocales'
import { useToast } from '@/components/Toast'
import * as LocaleRepo from '@/lib/repos/locale-repo'

export interface LocaleItem {
  locale: string
  languageName: string
  status: 'pending' | 'translated' | 'reviewed' | 'scheduled' | 'published' | 'failed'
  updatedAt: string
  title: string
  intro: string
  bulletPoints: string[]
  cta: string
}

export default function LocaleCards({ finalScriptId, sourceVersion, source, items, onReload }: { finalScriptId: string; sourceVersion: number; source: { title: string; intro: string; bulletPoints: string[]; cta: string }; items: LocaleItem[]; onReload: () => void }) {
  const { show } = useToast()
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState<Record<string, { title: string; intro: string; bulletPoints: string[]; cta: string }>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [retrying, setRetrying] = useState<Record<string, boolean>>({})

  function onEdit(loc: string, it: LocaleItem) {
    setEditing((s) => ({ ...s, [loc]: true }))
    setForm((s) => ({ ...s, [loc]: { title: it.title, intro: it.intro, bulletPoints: it.bulletPoints.slice(0, 3), cta: it.cta } }))
  }

  function onCancel(loc: string) {
    setEditing((s) => ({ ...s, [loc]: false }))
  }

  async function onSave(loc: string) {
    const data = form[loc]
    if (!data) return
    const e1 = validateTitle(data.title)
    if (e1) return alert(e1)
    if (!data.intro) return alert('引子不能为空')
    const e2 = validateBulletPoints(data.bulletPoints)
    if (e2) return alert(e2)
    const e3 = validateCTA(data.cta)
    if (e3) return alert(e3)
    try {
      setSaving((s) => ({ ...s, [loc]: true }))
      await saveLocale(finalScriptId, loc, sourceVersion, data)
      setEditing((s) => ({ ...s, [loc]: false }))
      onReload()
      show('已保存翻译', 'success')
    } catch (e) {
      show(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setSaving((s) => ({ ...s, [loc]: false }))
    }
  }

  async function onDelete(loc: string) {
    if (!confirm('确认删除该语言翻译？')) return
    try {
      setDeleting((s) => ({ ...s, [loc]: true }))
      await LocaleRepo.deleteLocaleVariant(finalScriptId, sourceVersion, loc)
      onReload()
      show('已删除翻译', 'success')
    } catch (e) {
      show(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setDeleting((s) => ({ ...s, [loc]: false }))
    }
  }

  async function onReview(loc: string) {
    try {
      await LocaleRepo.setReviewed(finalScriptId, sourceVersion, loc)
      onReload()
      show('已设为已审核', 'success')
    } catch (e) {
      show(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  async function onRetry(loc: string) {
    try {
      setRetrying((s) => ({ ...s, [loc]: true }))
      await retryLocale(finalScriptId, loc, { ...source, sourceVersion })
      onReload()
      show('已重新生成该语言', 'success')
    } catch (e) {
      show(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setRetrying((s) => ({ ...s, [loc]: false }))
    }
  }

  const statusPriority: Record<LocaleItem['status'], number> = {
    reviewed: 1,
    translated: 2,
    failed: 3,
    pending: 4,
    scheduled: 5,
    published: 6,
  }

  // 仅展示成功的翻译
  const visible = items.filter((it) => ['translated', 'reviewed', 'published', 'scheduled'].includes(it.status))
  const sorted = visible.slice().sort((a, b) => statusPriority[a.status] - statusPriority[b.status])

  return (
    <div className="space-y-3">
      {sorted.map((it) => {
        const isEditing = !!editing[it.locale]
        const f = form[it.locale] || { title: it.title, intro: it.intro, bulletPoints: it.bulletPoints, cta: it.cta }
        const content = isEditing ? (
          <div className="space-y-2">
            <input className="w-full border rounded px-2 py-1" value={f.title} onChange={(e) => setForm((s) => ({ ...s, [it.locale]: { ...f, title: e.target.value } }))} placeholder="标题" />
            <textarea className="w-full border rounded px-2 py-1" value={f.intro} onChange={(e) => setForm((s) => ({ ...s, [it.locale]: { ...f, intro: e.target.value } }))} placeholder="引子" rows={3} />
            {[0,1,2].map((i) => (
              <input key={i} className="w-full border rounded px-2 py-1" value={f.bulletPoints[i] || ''} onChange={(e) => {
                const arr = f.bulletPoints.slice(0, 3)
                arr[i] = e.target.value
                setForm((s) => ({ ...s, [it.locale]: { ...f, bulletPoints: arr } }))
              }} placeholder={`要点 ${i+1}`} />
            ))}
            <input className="w-full border rounded px-2 py-1" value={f.cta} onChange={(e) => setForm((s) => ({ ...s, [it.locale]: { ...f, cta: e.target.value } }))} placeholder="CTA" />
          </div>
        ) : (
          <div className="text-sm text-gray-800 space-y-2">
            <div className="font-semibold">{it.title || <span className="text-gray-400">—</span>}</div>
            <div className="text-gray-700">{it.intro || <span className="text-gray-400">—</span>}</div>
            <ul className="list-disc pl-5 text-gray-700">
              {it.bulletPoints.slice(0, 3).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <div className="text-emerald-700">{it.cta || <span className="text-gray-400">—</span>}</div>
          </div>
        )

        return (
          <div key={it.locale} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start gap-4">
              <div className="w-36 shrink-0">
                <div className="text-sm font-medium text-gray-800">{it.languageName} ({it.locale})</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                  <span className="px-2 py-0.5 rounded-full border" aria-label={it.status}>{it.status}</span>
                  <span className="text-gray-500">{formatRelativeTime(it.updatedAt)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!isEditing && <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={() => onEdit(it.locale, it)}>编辑</button>}
                  {isEditing && <button className="px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50" disabled={!!saving[it.locale]} onClick={() => onSave(it.locale)}>{saving[it.locale] ? '保存中…' : '保存'}</button>}
                  {isEditing && <button className="px-2 py-1 border rounded" onClick={() => onCancel(it.locale)}>取消</button>}
                  <button className="px-2 py-1 border rounded hover:bg-red-50 text-red-600 disabled:opacity-50" disabled={!!deleting[it.locale] || it.status === 'published'} onClick={() => onDelete(it.locale)}>{deleting[it.locale] ? '删除中…' : '删除'}</button>
                  {it.status === 'translated' && <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={() => onReview(it.locale)}>设为已审核</button>}
                </div>
              </div>
              <div className="flex-1">{content}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}



