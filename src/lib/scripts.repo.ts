import type { FinalScript, ScriptDraft, LocaleVariant } from '@/types/domain'
import { DB_CONFIG } from '@/lib/indexeddb'
import { ScriptDraftSchema, FinalScriptSchema, LocaleVariantSchema } from '@/types/zod'

// 仅导出与脚本相关的仓储接口，复用已有 getDatabase 通过 indexeddb.ts 暴露的 API
// 这里选择最小实现：依赖 indexeddb.ts 中的 object store 名称与事务

async function getDB(): Promise<IDBDatabase> {
  // 通过现有 initDatabase 间接获取实例
  const { initDatabase } = await import('@/lib/indexeddb')
  return initDatabase()
}

export async function upsertDraft(draft: Omit<ScriptDraft, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ScriptDraft> {
  const db = await getDB()
  const tx = db.transaction([DB_CONFIG.stores.scripts], 'readwrite')
  const store = tx.objectStore(DB_CONFIG.stores.scripts)

  const now = new Date().toISOString()
  // 保证一个 ideaId 只有一份草稿：如果未提供 id，则按 ideaId 查询现有草稿并复用其 id
  let targetId = draft.id
  if (!targetId) {
    const index = store.index('ideaId')
    const existing: ScriptDraft | null = await new Promise((resolve, reject) => {
      const r = index.get(draft.ideaId)
      r.onsuccess = () => resolve((r.result as ScriptDraft) || null)
      r.onerror = () => reject(new Error('读取草稿失败'))
    })
    targetId = existing?.id ?? crypto.randomUUID()
  }
  const entity: ScriptDraft = {
    id: targetId,
    ...draft,
    content: draft.content,
    createdAt: draft.id ? (await getDraftByIdInternal(store, draft.id))?.createdAt ?? now : now,
    updatedAt: now,
  }

  ScriptDraftSchema.parse(entity)

  return new Promise((resolve, reject) => {
    const req = store.put(entity)
    req.onsuccess = () => resolve(entity)
    req.onerror = () => reject(new Error('保存草稿失败'))
  })
}

async function getDraftByIdInternal(store: IDBObjectStore, id: string): Promise<ScriptDraft | null> {
  return new Promise((resolve, reject) => {
    const r = store.get(id)
    r.onsuccess = () => resolve((r.result as ScriptDraft) || null)
    r.onerror = () => reject(new Error('读取草稿失败'))
  })
}

export async function getDraftByIdeaId(ideaId: string): Promise<ScriptDraft | null> {
  const db = await getDB()
  const store = db.transaction([DB_CONFIG.stores.scripts], 'readonly').objectStore(DB_CONFIG.stores.scripts)
  const index = store.index('ideaId')
  return new Promise((resolve, reject) => {
    const req = index.get(ideaId)
    req.onsuccess = () => resolve((req.result as ScriptDraft) || null)
    req.onerror = () => reject(new Error('读取草稿失败'))
  })
}

export async function createFinal(input: Omit<FinalScript, 'id' | 'createdAt' | 'updatedAt' | 'versionNumber'> & { versionNumber?: number }): Promise<FinalScript> {
  const { addFinalScript } = await import('@/lib/indexeddb')
  // addFinalScript 内部保证 versionKey 唯一性
  const next = await addFinalScript(input)
  FinalScriptSchema.parse(next)
  return next
}

export async function addOrUpdateLocale(input: Omit<LocaleVariant, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<LocaleVariant> {
  const db = await getDB()
  const tx = db.transaction([DB_CONFIG.stores.locales], 'readwrite')
  const store = tx.objectStore(DB_CONFIG.stores.locales)

  const now = new Date().toISOString()
  const entity: LocaleVariant = {
    id: input.id ?? crypto.randomUUID(),
    ...input,
    // @ts-expect-error synthetic index key for uniqueness
    finalLocaleKey: `${input.finalScriptId}#${input.locale}`,
    createdAt: input.id ? (await getLocaleInternal(store, input.id))?.createdAt ?? now : now,
    updatedAt: now,
  }

  LocaleVariantSchema.parse(entity)

  return new Promise((resolve, reject) => {
    const req = store.put(entity as any)
    req.onsuccess = () => resolve(entity)
    req.onerror = () => reject(new Error('保存多语版本失败'))
  })
}

async function getLocaleInternal(store: IDBObjectStore, id: string): Promise<LocaleVariant | null> {
  return new Promise((resolve, reject) => {
    const r = store.get(id)
    r.onsuccess = () => resolve((r.result as LocaleVariant) || null)
    r.onerror = () => reject(new Error('读取多语版本失败'))
  })
}


