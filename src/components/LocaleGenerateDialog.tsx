'use client'
import { useMemo, useState } from 'react'
import { generateLocales, type TargetLocale } from '@/lib/services/translateLocales'
import { useToast } from '@/components/Toast'

const LOCALE_OPTIONS: { code: TargetLocale; name: string }[] = [
  { code: 'en', name: '英语' },
  { code: 'es', name: '西班牙语' },
  { code: 'ja', name: '日语' },
]

export default function LocaleGenerateDialog({ finalScriptId, source, existingLocales, onClose, onDone }: { finalScriptId: string; source: { title: string; intro: string; bulletPoints: string[]; cta: string; sourceVersion: number }; existingLocales: string[]; onClose: () => void; onDone: () => void }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<Record<string, 'pending' | 'running' | 'translated' | 'failed'>>({})
  const { show } = useToast()

  const disabled = useMemo(() => new Set(existingLocales), [existingLocales])

  function toggle(code: string) {
    if (disabled.has(code)) return
    setSelected((s) => ({ ...s, [code]: !s[code] }))
  }

  async function onConfirm() {
    const list = Object.keys(selected).filter((k) => selected[k]) as TargetLocale[]
    if (list.length === 0) return onClose()
    setRunning(true)
    let ok = 0, fail = 0
    await generateLocales(finalScriptId, list, source, { concurrency: 2 }, (p) => {
      setProgress((s) => ({ ...s, [p.locale]: p.status }))
      if (p.status === 'translated') ok += 1
      if (p.status === 'failed') fail += 1
    })
    setRunning(false)
    if (ok > 0 && fail === 0) show(`已生成 ${ok} 种语言`, 'success')
    if (ok > 0 && fail > 0) show(`已生成 ${ok} 种语言，${fail} 种失败`, 'info')
    if (ok === 0 && fail > 0) show(`全部失败，请稍后重试`, 'error')
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="px-4 py-3 border-b font-medium">选择目标语言</div>
        <div className="p-4 space-y-2">
          {LOCALE_OPTIONS.map((opt) => {
            const isDisabled = disabled.has(opt.code)
            return (
              <label key={opt.code} className={`flex items-center gap-2 p-2 rounded ${isDisabled ? 'text-gray-400' : 'cursor-pointer hover:bg-gray-50'}`}>
                <input type="checkbox" disabled={isDisabled} checked={!!selected[opt.code]} onChange={() => toggle(opt.code)} className="accent-blue-600" />
                <span>{opt.name} ({opt.code})</span>
                {isDisabled && <span className="ml-auto text-xs">已存在，可编辑</span>}
                {progress[opt.code] && <span className="ml-auto text-xs">{progress[opt.code]}</span>}
              </label>
            )
          })}
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
          <button className="px-3 py-1.5 border rounded" onClick={onClose} disabled={running}>取消</button>
          <button className="px-3 py-1.5 bg-blue-600 text-white rounded disabled:opacity-50" onClick={onConfirm} disabled={running}>{running ? '正在生成，请稍候…' : '开始生成'}</button>
        </div>
      </div>
    </div>
  )
}


