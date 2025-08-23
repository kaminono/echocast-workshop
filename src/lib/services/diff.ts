// file: src/lib/services/diff.ts
import type { ScriptDraft, FinalScript } from '@/types/domain'

export interface DiffFieldChange<T> {
  field: keyof Pick<ScriptDraft, 'title' | 'intro' | 'bulletPoints' | 'cta' | 'content'>
  before: T | undefined
  after: T | undefined
  changed: boolean
}

export interface DiffResult {
  changes: Array<
    | DiffFieldChange<string>
    | DiffFieldChange<string[]>
  >
  hasChanges: boolean
}

function fieldChanged(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return true
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return true
    }
    return false
  }
  return a !== b
}

export function diffDraftWithFinal(draft: ScriptDraft, final?: FinalScript | null): DiffResult {
  const changes: DiffResult['changes'] = []
  const pairs: Array<DiffFieldChange<any>> = [
    { field: 'title', before: final?.title, after: draft.title, changed: false },
    { field: 'intro', before: final?.intro, after: draft.intro, changed: false },
    { field: 'bulletPoints', before: final?.bulletPoints, after: draft.bulletPoints, changed: false },
    { field: 'cta', before: final?.cta, after: draft.cta, changed: false },
    { field: 'content', before: final?.content, after: draft.content, changed: false },
  ]
  for (const p of pairs) {
    p.changed = fieldChanged(p.before, p.after)
    changes.push(p)
  }
  return { changes, hasChanges: changes.some((c) => c.changed) }
}

export function diffFinalVsFinal(a: FinalScript, b: FinalScript): DiffResult {
  const changes: DiffResult['changes'] = []
  const pairs: Array<DiffFieldChange<any>> = [
    { field: 'title', before: a.title, after: b.title, changed: false },
    { field: 'intro', before: a.intro, after: b.intro, changed: false },
    { field: 'bulletPoints', before: a.bulletPoints, after: b.bulletPoints, changed: false },
    { field: 'cta', before: a.cta, after: b.cta, changed: false },
    { field: 'content', before: a.content, after: b.content, changed: false },
  ]
  for (const p of pairs) {
    p.changed = fieldChanged(p.before, p.after)
    changes.push(p)
  }
  return { changes, hasChanges: changes.some((c) => c.changed) }
}
