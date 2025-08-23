// file: src/lib/services/publishDraft.ts
import type { FinalScript, ScriptDraft } from '@/types/domain'
import * as DraftRepo from '@/lib/repos/draft-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import { AppError } from './errors'

const MAX_RETRY = 3

export async function publishDraft(ideaId: string, createdBy?: string): Promise<FinalScript> {
  // 读取草稿
  const draft = await DraftRepo.findByIdeaId(ideaId)
  if (!draft) {
    throw new AppError('NOT_FOUND', '草稿不存在')
  }

  const finalScriptId = ideaId // 系列稳定 ID 采用 ideaId

  // 计算冗余 content
  const content = buildContent(draft)

  // 重试追加版本（主键冲突）
  let lastErr: unknown
  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    try {
      const nextVersion = (await FinalRepo.getMaxVersion(finalScriptId)) + 1
      const record: Omit<FinalScript, 'id' | 'createdAt' | 'updatedAt' | 'versionNumber'> = {
        finalScriptId,
        ideaId,
        title: draft.title,
        intro: draft.intro,
        bulletPoints: draft.bulletPoints,
        cta: draft.cta,
        content,
        status: 'published',
        publishedAt: new Date().toISOString(),
        createdBy,
      }
      return await FinalRepo.appendVersion(record, nextVersion)
    } catch (err) {
      lastErr = err
      // 指数退避：50ms, 100ms, 200ms
      await delay(50 * Math.pow(2, attempt))
    }
  }
  throw new AppError('CONCURRENCY_RETRY_EXCEEDED', '发布失败：并发冲突重试超限', lastErr)
}

function buildContent(d: ScriptDraft): string {
  const parts: string[] = []
  if (d.title) parts.push(`# ${d.title}`)
  if (d.intro) parts.push(d.intro)
  if (d.bulletPoints?.length) {
    parts.push(...d.bulletPoints.map((b) => `- ${b}`))
  }
  if (d.cta) parts.push(`CTA: ${d.cta}`)
  return parts.join('\n')
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)) }
