// file: src/lib/repos/final-repo.ts
import { withRead, withWrite, IDB_CONFIG, idbAdd, idbGetAll, idbGet, idbPut, buildSeriesVersionKey } from '@/lib/indexeddb'
import type { FinalScript } from '@/types/domain'

export interface SeriesMeta {
  finalScriptId: string
  ideaId: string
  maxVersion: number
  updatedAt: string
}

export async function listByUpdatedAtDesc(): Promise<SeriesMeta[]> {
  const items = await withRead<FinalScript[]>(IDB_CONFIG.stores.finalScripts, (store) => idbGetAll<FinalScript>(store))
  const grouped = new Map<string, FinalScript[]>()
  for (const it of items) {
    const arr = grouped.get(it.finalScriptId) || []
    arr.push(it)
    grouped.set(it.finalScriptId, arr)
  }
  const metas: SeriesMeta[] = []
  for (const [seriesId, arr] of grouped) {
    const sorted = arr.slice().sort((a, b) => a.versionNumber - b.versionNumber)
    const maxVersion = sorted[sorted.length - 1]?.versionNumber ?? 0
    const updatedAt = sorted[sorted.length - 1]?.updatedAt ?? new Date().toISOString()
    metas.push({ finalScriptId: seriesId, ideaId: sorted[0].ideaId, maxVersion, updatedAt })
  }
  return metas.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function getSeriesVersions(finalScriptId: string): Promise<FinalScript[]> {
  const items = await withRead<FinalScript[]>(IDB_CONFIG.stores.finalScripts, (store) => idbGetAll<FinalScript>(store))
  return items.filter((i) => i.finalScriptId === finalScriptId).sort((a, b) => a.versionNumber - b.versionNumber)
}

export async function getVersion(finalScriptId: string, versionNumber: number): Promise<FinalScript | null> {
  const list = await getSeriesVersions(finalScriptId)
  return list.find((v) => v.versionNumber === versionNumber) ?? null
}

export async function getMaxVersion(finalScriptId: string): Promise<number> {
  const list = await getSeriesVersions(finalScriptId)
  return list.reduce((m, v) => Math.max(m, v.versionNumber), 0)
}

export async function appendVersion(input: Omit<FinalScript, 'id' | 'createdAt' | 'updatedAt' | 'versionNumber'>, versionNumber?: number): Promise<FinalScript> {
  const now = new Date().toISOString()
  let assigned = versionNumber
  if (typeof assigned !== 'number' || assigned <= 0) {
    const currentMax = await getMaxVersion(input.finalScriptId)
    assigned = currentMax + 1
  }
  const record: FinalScript = {
    ...input,
    id: crypto.randomUUID(),
    versionNumber: assigned!,
    createdAt: now,
    updatedAt: now,
    // @ts-expect-error synthetic index key for unique constraint
    seriesVersionKey: buildSeriesVersionKey(input.finalScriptId, assigned!),
  }
  await withWrite(IDB_CONFIG.stores.finalScripts, (store) => idbAdd(store, record as any))
  return record
}
