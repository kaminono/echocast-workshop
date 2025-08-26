// file: src/lib/repos/locale-repo.ts
import { withRead, withWrite, IDB_CONFIG, idbAdd, idbGetAll, idbIndexGetAll, idbPut, idbDelete, buildFinalLocaleKey } from '@/lib/indexeddb'
import type { LocaleVariant } from '@/types/domain'

export async function listByFinal(finalScriptId: string, sourceVersion?: number): Promise<LocaleVariant[]> {
  const items = await withRead<LocaleVariant[]>(IDB_CONFIG.stores.localeVariants, (store) => idbGetAll<LocaleVariant>(store))
  return items.filter((l) => l.finalScriptId === finalScriptId && (sourceVersion ? l.sourceVersion === sourceVersion : true))
}

export async function addLocaleVariant(input: Omit<LocaleVariant, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocaleVariant> {
  const now = new Date().toISOString()
  const record: LocaleVariant = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    // @ts-expect-error synthetic
    finalLocaleKey: buildFinalLocaleKey(input.finalScriptId, input.sourceVersion, input.locale),
  }
  await withWrite(IDB_CONFIG.stores.localeVariants, (store) => idbAdd(store, record as any))
  return record
}

export async function getByFinalAndLocale(finalScriptId: string, sourceVersion: number, locale: string): Promise<LocaleVariant | null> {
  const list = await withRead<LocaleVariant[]>(IDB_CONFIG.stores.localeVariants, (store) => idbIndexGetAll<LocaleVariant>(store, 'finalLocaleKey', buildFinalLocaleKey(finalScriptId, sourceVersion, locale)))
  return list[0] || null
}

export async function upsertLocaleVariant(input: Omit<LocaleVariant, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<LocaleVariant> {
  const now = new Date().toISOString()
  const existing = await getByFinalAndLocale(input.finalScriptId, input.sourceVersion, input.locale)
  const record: LocaleVariant = {
    id: existing?.id || crypto.randomUUID(),
    ...input,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    // @ts-expect-error synthetic
    finalLocaleKey: buildFinalLocaleKey(input.finalScriptId, input.sourceVersion, input.locale),
  }
  await withWrite(IDB_CONFIG.stores.localeVariants, (store) => idbPut(store, record as any))
  return record
}

export async function deleteLocaleVariant(finalScriptId: string, sourceVersion: number, locale: string): Promise<void> {
  await withWrite<void>(IDB_CONFIG.stores.localeVariants, async (store) => {
    const all = await idbGetAll<LocaleVariant>(store)
    const target = all.find((l) => l.finalScriptId === finalScriptId && l.sourceVersion === sourceVersion && l.locale === locale)
    if (!target) return
    await idbDelete(store, target.id)
  })
}

export async function setReviewed(finalScriptId: string, sourceVersion: number, locale: string): Promise<LocaleVariant | null> {
  const existing = await getByFinalAndLocale(finalScriptId, sourceVersion, locale)
  if (!existing) return null
  const updated: LocaleVariant = { ...existing, status: 'reviewed', updatedAt: new Date().toISOString() }
  await withWrite(IDB_CONFIG.stores.localeVariants, (store) => idbPut(store, updated as any))
  return updated
}
