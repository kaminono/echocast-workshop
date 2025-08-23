import { describe, it, expect } from 'vitest'
import { initDatabase } from '@/lib/indexeddb'
import { upsertDraft } from '@/lib/scripts.repo'
import { publishDraft, rollbackToVersion, diffDraftWithFinal, diffFinalVsFinal } from '@/lib/scripts.service'
import { listFinalScriptsByIdea } from '@/lib/indexeddb'

describe('Scripts domain E2E', () => {
  it('正常发布与回滚与对比', async () => {
    await initDatabase()
    const ideaId = crypto.randomUUID()

    // 创建草稿
    await upsertDraft({
      ideaId,
      title: 'A',
      intro: 'I',
      bulletPoints: ['B1', 'B2'],
      cta: 'C',
      content: '# A',
      status: 'draft',
    })

    const final1 = await publishDraft({ ideaId, changeLog: 'init' })
    expect(final1.versionNumber).toBe(1)

    // 更新草稿再发布第二版
    await upsertDraft({
      ideaId,
      title: 'A2',
      intro: 'I2',
      bulletPoints: ['B1', 'B3'],
      cta: 'C2',
      content: '# A2',
      status: 'reviewing',
    })

    const final2 = await publishDraft({ ideaId, changeLog: 'update' })
    expect(final2.versionNumber).toBe(2)

    // 对比草稿与最新定稿
    const draftVsFinal = await diffDraftWithFinal({ ideaId })
    expect(draftVsFinal.base?.versionNumber).toBe(2)

    // 回滚到第一版
    const draftRolled = await rollbackToVersion({ ideaId, versionNumber: 1 })
    expect(draftRolled.title).toBe('A')

    // 对比两个定稿
    const finalVsFinal = await diffFinalVsFinal({ ideaId, fromVersion: 1, toVersion: 2 })
    expect(Object.keys(finalVsFinal.diff).length).toBeGreaterThan(0)

    const finals = await listFinalScriptsByIdea(ideaId)
    expect(finals.map(f => f.versionNumber)).toEqual([1, 2])
  })

  it('并发发布保证版本不乱序（唯一索引冲突重试）', async () => {
    await initDatabase()
    const ideaId = crypto.randomUUID()

    await upsertDraft({
      ideaId,
      title: 'T', intro: 'I', bulletPoints: ['B'], cta: 'C', content: '# T', status: 'draft',
    })

    // 并发两次发布
    const [r1, r2] = await Promise.allSettled([
      publishDraft({ ideaId }),
      publishDraft({ ideaId }),
    ])

    // 允许一个成功，一个失败（冲突）
    const successes = [r1, r2].filter(r => r.status === 'fulfilled')
    expect(successes.length).toBe(1)
    const finals = await listFinalScriptsByIdea(ideaId)
    expect(finals.length).toBe(1)
    expect(finals[0].versionNumber).toBe(1)
  })
})


