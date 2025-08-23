import 'fake-indexeddb/auto'
import { initDatabase } from '@/lib/indexeddb'
import { upsertDraft } from '@/lib/scripts.repo'
import { publishDraft, rollbackToVersion, diffDraftWithFinal, diffFinalVsFinal } from '@/lib/scripts.service'
import { listFinalScriptsByIdea } from '@/lib/indexeddb'

async function main() {
  await initDatabase()
  const ideaId = crypto.randomUUID()

  await upsertDraft({ ideaId, title: 'T', intro: 'I', bulletPoints: ['B1', 'B2'], cta: 'C', content: '# T', status: 'draft' })
  const f1 = await publishDraft({ ideaId, changeLog: 'init' })
  console.log('published v', f1.versionNumber)

  await upsertDraft({ ideaId, title: 'T2', intro: 'I2', bulletPoints: ['B1'], cta: 'C2', content: '# T2', status: 'reviewing' })
  const f2 = await publishDraft({ ideaId, changeLog: 'update' })
  console.log('published v', f2.versionNumber)

  const diff1 = await diffDraftWithFinal({ ideaId })
  console.log('draft vs latest final keys:', Object.keys(diff1.diff))

  await rollbackToVersion({ ideaId, versionNumber: 1 })
  const finals = await listFinalScriptsByIdea(ideaId)
  console.log('final versions:', finals.map(f => f.versionNumber))

  const diff2 = await diffFinalVsFinal({ ideaId, fromVersion: 1, toVersion: 2 })
  console.log('final vs final keys:', Object.keys(diff2.diff))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})


