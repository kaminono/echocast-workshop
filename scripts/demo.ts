// file: scripts/demo.ts
/**
 * 运行方式：在浏览器控制台或引入到页面执行（本项目前端环境）
 * 用于演示核心流程：创建→生成→发布 v1→再次生成→发布 v2→回滚 v1→发布 v3
 */
import { openDatabase } from '@/lib/indexeddb'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import * as DraftRepo from '@/lib/repos/draft-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import { generateStructuredDraft } from '@/lib/llm/spark-x1'
import { publishDraft } from '@/lib/services/publishDraft'
import { rollbackToVersion } from '@/lib/services/rollbackToVersion'

async function main() {
  await openDatabase()
  const ideas = await IdeaRepo.search('远程')
  const idea = ideas[0]
  console.log('使用点子：', idea?.title)

  let draft = await DraftRepo.findByIdeaId(idea.id)
  if (!draft) {
    draft = await DraftRepo.create({ ideaId: idea.id, title: '', intro: '', bulletPoints: [], cta: '', content: '', status: 'draft' })
  }
  console.log('草稿：', draft)

  const g1 = await generateStructuredDraft({
    idea: { title: idea.title, summary: idea.summary, content: idea.content },
    draft: {
      title: draft.title,
      intro: draft.intro,
      bulletPoints: draft.bulletPoints,
      cta: draft.cta,
      content: draft.content,
    },
    mode: 'normalize',
  })
  await DraftRepo.save({ ...draft, ...g1 })
  const v1 = await publishDraft(idea.id)
  console.log('发布 v1:', v1)

  const g2 = await generateStructuredDraft({
    idea: { title: idea.title, summary: idea.summary, content: idea.content },
    draft: {
      title: g1.title,
      intro: g1.intro,
      bulletPoints: g1.bulletPoints,
      cta: g1.cta,
      content: '',
    },
    mode: 'enhance',
    suggestion: '强调最小投入',
  })

  const versions = await FinalRepo.getSeriesVersions(idea.id)
  console.log('最终版本列表：', versions.map(v => v.versionNumber))
}

main().catch(console.error)
