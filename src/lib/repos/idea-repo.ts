// file: src/lib/repos/idea-repo.ts
import { withRead, withWrite, IDB_CONFIG, idbGet, idbGetAll, idbAdd } from '@/lib/indexeddb'
import type { Idea } from '@/types/domain'

export async function getById(id: string): Promise<Idea | null> {
  return withRead<Idea | null>(IDB_CONFIG.stores.ideas, async (store) => {
    const item = await idbGet<Idea>(store, id)
    return item ?? null
  })
}

export async function search(keyword: string): Promise<Idea[]> {
  const q = keyword.trim().toLowerCase()
  if (!q) {
    return withRead<Idea[]>(IDB_CONFIG.stores.ideas, (store) => idbGetAll<Idea>(store))
  }
  const items = await withRead<Idea[]>(IDB_CONFIG.stores.ideas, (store) => idbGetAll<Idea>(store))
  return items.filter((i) =>
    i.title.toLowerCase().includes(q) ||
    (i.summary?.toLowerCase().includes(q) ?? false) ||
    i.tags.some((t) => t.toLowerCase().includes(q))
  )
}

export async function seed(ideas: Idea[]): Promise<void> {
  // 仅在空库时注入
  const existing = await withRead<Idea[]>(IDB_CONFIG.stores.ideas, (store) => idbGetAll<Idea>(store))
  if (existing.length > 0) return
  await withWrite<void>(IDB_CONFIG.stores.ideas, async (store) => {
    for (const idea of ideas) {
      await idbAdd(store, idea)
    }
  })
}
