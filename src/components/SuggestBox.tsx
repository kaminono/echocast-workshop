// file: src/components/SuggestBox.tsx
'use client'
import { useState } from 'react'
import type { Idea, ScriptDraft } from '@/types/domain'
import { generateStructuredDraft, type GenerateMode } from '@/lib/llm/spark-x1'
import { handleTextareaEnter } from '@/utils/hotkeys'
import { useToast } from './Toast'

export default function SuggestBox({ idea, draft, onApply }: { idea: Idea; draft: ScriptDraft; onApply: (four: { title: string; intro: string; bulletPoints: string[]; cta: string; content: string }) => void }) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<GenerateMode>('normalize')
  const [loading, setLoading] = useState(false)
  const { show } = useToast()

  async function submit() {
    setLoading(true)
    try {
      const four = await generateStructuredDraft({ idea: {
        title: idea.title,
        summary: idea.summary,
        content: idea.content,
      }, draft: {
        title: draft.title,
        intro: draft.intro,
        bulletPoints: draft.bulletPoints,
        cta: draft.cta,
        content: draft.content,
      }, suggestion: text, mode })
      onApply(four)
      show('已应用模型建议', 'success')
    } catch (e) {
      show('生成失败，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm">
            <input type="radio" name="mode" value="normalize" checked={mode==='normalize'} onChange={() => setMode('normalize')} /> 结构化/轻润色
          </label>
          <label className="text-sm">
            <input type="radio" name="mode" value="enhance" checked={mode==='enhance'} onChange={() => setMode('enhance')} /> 增强（不虚构）
          </label>
        </div>
        <button className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50" onClick={submit} disabled={loading} aria-label="提交建议">
          {loading ? '生成中…' : '提交建议'}
        </button>
      </div>
      <textarea
        className="mt-3 w-full border rounded p-2"
        rows={3}
        placeholder="输入你的建议，Enter 提交，Shift+Enter 换行"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => handleTextareaEnter(e, submit)}
      />
    </div>
  )
}
