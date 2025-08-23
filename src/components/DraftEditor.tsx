// file: src/components/DraftEditor.tsx
'use client'
import type { ScriptDraft } from '@/types/domain'
import BulletPointsEditor from './BulletPointsEditor'
import { TITLE_MAX, validateTitle, validateBulletPoints, validateCTA } from '@/utils/validation'

export default function DraftEditor({
  draft,
  onChange,
}: {
  draft: ScriptDraft
  onChange: (next: ScriptDraft) => void
}) {
  const titleError = draft.title ? validateTitle(draft.title) : null
  const bulletError = validateBulletPoints(draft.bulletPoints || [])
  const ctaError = draft.cta ? validateCTA(draft.cta) : null

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">标题</label>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value.slice(0, TITLE_MAX) })}
          className="mt-1 w-full border rounded px-3 py-2"
          aria-invalid={!!titleError}
          aria-describedby="title-hint"
          placeholder="不超过 40 字，且不要句号结尾"
        />
        <p id="title-hint" className={`mt-1 text-xs ${titleError ? 'text-red-600' : 'text-gray-500'}`}>{titleError || `最多 ${TITLE_MAX} 字`}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">引子（1–2 句）</label>
        <textarea
          rows={3}
          value={draft.intro}
          onChange={(e) => onChange({ ...draft, intro: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
          placeholder="简述核心价值与听众收益"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">要点（最多 3 条）</label>
        <BulletPointsEditor
          points={draft.bulletPoints || []}
          onChange={(next) => onChange({ ...draft, bulletPoints: next })}
        />
        {bulletError && <p className="mt-1 text-xs text-red-600">{bulletError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">CTA（动词开头，单句）</label>
        <input
          type="text"
          value={draft.cta}
          onChange={(e) => onChange({ ...draft, cta: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
          aria-invalid={!!ctaError}
          placeholder="例如：立即开始尝试"
        />
        {ctaError && <p className="mt-1 text-xs text-red-600">{ctaError}</p>}
      </div>
    </div>
  )
}
