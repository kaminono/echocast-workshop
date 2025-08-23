import { migrateFromOldStructures } from '@/lib/scripts.migrate'
import { initDatabase } from '@/lib/indexeddb'

async function main() {
  await initDatabase()

  // 示例：从旧结构迁移
  const res = await migrateFromOldStructures({
    oldDrafts: [
      {
        id: crypto.randomUUID(),
        ideaId: 'idea-1',
        title: 'Old',
        content: '# Old\n\nIntro\n\n1. A\nCTA: Go',
        version: 2,
        versionHistory: [
          { version: 1, content: '# v1\n\nI\n\n1. B\nCTA: C', changes: 'init', createdAt: new Date().toISOString() },
          { version: 2, content: '# v2\n\nI2\n\n1. B2\nCTA: C2', changes: 'update', createdAt: new Date().toISOString() },
        ],
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    oldLocales: [],
  })

  console.log('migrated finals:', res.migratedFinals.length)
  console.log('current drafts:', res.currentDrafts.length)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})


