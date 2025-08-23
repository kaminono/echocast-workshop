// file: src/lib/services/rollbackToVersion.ts
import * as DraftRepo from '@/lib/repos/draft-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import type { ScriptDraft } from '@/types/domain'
import { AppError } from './errors'

export async function rollbackToVersion(finalScriptId: string, versionNumber: number): Promise<ScriptDraft> {
  const version = await FinalRepo.getVersion(finalScriptId, versionNumber)
  if (!version) throw new AppError('NOT_FOUND', '指定的定稿版本不存在')

  const existing = await DraftRepo.findByIdeaId(version.ideaId)
  const payload = {
    ideaId: version.ideaId,
    title: version.title,
    intro: version.intro,
    bulletPoints: version.bulletPoints,
    cta: version.cta,
    content: version.content,
    status: 'draft' as const,
  }
  if (!existing) {
    return DraftRepo.create(payload)
  }
  const merged: ScriptDraft = {
    ...existing,
    ...payload,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }
  return DraftRepo.save(merged)
}
