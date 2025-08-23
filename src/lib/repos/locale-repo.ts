// file: src/lib/repos/locale-repo.ts
import { withRead, withWrite, IDB_CONFIG, idbAdd, idbGetAll, buildFinalLocaleKey } from '@/lib/indexeddb'
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
