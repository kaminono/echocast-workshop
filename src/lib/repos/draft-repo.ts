// file: src/lib/repos/draft-repo.ts
import { withRead, withWrite, IDB_CONFIG, idbGet, idbPut, idbAdd, idbGetAll } from '@/lib/indexeddb'
import type { ScriptDraft } from '@/types/domain'

export async function getById(id: string): Promise<ScriptDraft | null> {
  return withRead<ScriptDraft | null>(IDB_CONFIG.stores.drafts, async (store) => {
    const item = await idbGet<ScriptDraft>(store, id)
    return item ?? null
  })
}

export async function findByIdeaId(ideaId: string): Promise<ScriptDraft | null> {
  const items = await withRead<ScriptDraft[]>(IDB_CONFIG.stores.drafts, (store) => idbGetAll<ScriptDraft>(store))
  return items.find((d) => d.ideaId === ideaId) ?? null
}

export async function listByUpdatedDesc(): Promise<ScriptDraft[]> {
  const rows = await withRead<ScriptDraft[]>(IDB_CONFIG.stores.drafts, (store) => idbGetAll<ScriptDraft>(store))
  return rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function create(draft: Omit<ScriptDraft, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScriptDraft> {
  const now = new Date().toISOString()
  const record: ScriptDraft = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...draft }
  await withWrite(IDB_CONFIG.stores.drafts, (store) => idbAdd(store, record))
  return record
}

export async function save(draft: ScriptDraft): Promise<ScriptDraft> {
  const next: ScriptDraft = { ...draft, updatedAt: new Date().toISOString() }
  await withWrite(IDB_CONFIG.stores.drafts, (store) => idbPut(store, next))
  return next
}

export async function upsertByIdeaId(partial: Omit<ScriptDraft, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScriptDraft> {
  const existing = await findByIdeaId(partial.ideaId)
  if (!existing) {
    return create(partial)
  }
  const merged: ScriptDraft = {
    ...existing,
    ...partial,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }
  await withWrite(IDB_CONFIG.stores.drafts, (store) => idbPut(store, merged))
  return merged
}

export async function remove(id: string): Promise<void> {
  await withWrite(IDB_CONFIG.stores.drafts, (store) => new Promise<void>((resolve, reject) => {
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error || new Error('delete 失败'))
  }))
}
