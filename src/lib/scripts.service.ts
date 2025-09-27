import type { FinalScript, ScriptDraft } from '@/types/domain'
import { buildContentFromElements, ErrorCode } from '@/types/zod'
import { createFinal, getDraftByIdeaId, upsertDraft } from '@/lib/scripts.repo'
import { listFinalScriptsByIdea, getFinalScriptByVersion } from '@/lib/indexeddb'

export async function publishDraft(params: { ideaId: string; changeLog?: string; provenance?: FinalScript['provenance'] }): Promise<FinalScript> {
  // 读取当前草稿（唯一）
  const draft = await getDraftByIdeaId(params.ideaId)
  if (!draft) {
    const err = new Error('草稿不存在') as any
    err.code = ErrorCode.NOT_FOUND
    throw err
  }

  // 组装定稿输入（versionNumber 在 repo 内部分配，保证唯一）
  const finalInput = {
    ideaId: draft.ideaId,
    finalScriptId: draft.ideaId,
    title: draft.title,
    intro: draft.intro,
    bulletPoints: draft.bulletPoints,
    cta: draft.cta,
    content: draft.content,
    status: 'published' as const,
    publishedAt: new Date().toISOString(),
    provenance: params.provenance,
    changeLog: params.changeLog ? [params.changeLog] : undefined,
  }

  // 并发安全：versionKey 唯一约束由 repo 层的 addFinalScript 的索引保证；若冲突则外抛错误，调用方可重试
  try {
    const created = await createFinal(finalInput)
    return created
  } catch (e) {
    // 简单重试一次（应对并发近同时发布）
    try {
      const created = await createFinal(finalInput)
      return created
    } catch (e2) {
      const err = new Error('发布失败') as any
      err.cause = e2
      err.code = ErrorCode.CONFLICT_VERSION
      throw err
    }
  }
}

export async function rollbackToVersion(params: { ideaId: string; versionNumber: number }): Promise<ScriptDraft> {
  const final = await getFinalScriptByVersion(params.ideaId, params.versionNumber)
  if (!final) {
    const err = new Error('定稿版本不存在') as any
    err.code = ErrorCode.NOT_FOUND
    throw err
  }

  // 将指定版本恢复为当前草稿
  const content = buildContentFromElements({
    title: final.title,
    intro: final.intro,
    bulletPoints: final.bulletPoints,
    cta: final.cta,
  })

  const draft = await upsertDraft({
    ideaId: params.ideaId,
    title: final.title,
    intro: final.intro,
    bulletPoints: final.bulletPoints,
    cta: final.cta,
    content,
    status: 'draft',
  })

  return draft
}

export async function diffDraftWithFinal(params: { ideaId: string; baseVersionNumber?: number }): Promise<{ base?: FinalScript; draft?: ScriptDraft; diff: Record<string, { from?: unknown; to?: unknown }> }> {
  const draft = await getDraftByIdeaId(params.ideaId)
  const finals = await listFinalScriptsByIdea(params.ideaId)
  const base = typeof params.baseVersionNumber === 'number' ? finals.find(f => f.versionNumber === params.baseVersionNumber) : finals[finals.length - 1]

  const diff: Record<string, { from?: unknown; to?: unknown }> = {}

  function setIfDifferent(key: keyof Pick<ScriptDraft, 'title' | 'intro' | 'bulletPoints' | 'cta' | 'content'>, from?: unknown, to?: unknown) {
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      diff[key as string] = { from, to }
    }
  }

  if (draft && base) {
    setIfDifferent('title', base.title, draft.title)
    setIfDifferent('intro', base.intro, draft.intro)
    setIfDifferent('bulletPoints', base.bulletPoints, draft.bulletPoints)
    setIfDifferent('cta', base.cta, draft.cta)
    setIfDifferent('content', base.content, draft.content)
  } else if (draft && !base) {
    setIfDifferent('title', undefined, draft.title)
    setIfDifferent('intro', undefined, draft.intro)
    setIfDifferent('bulletPoints', undefined, draft.bulletPoints)
    setIfDifferent('cta', undefined, draft.cta)
    setIfDifferent('content', undefined, draft.content)
  }

  return { base: base ?? undefined, draft: draft ?? undefined, diff }
}

export async function diffFinalVsFinal(params: { ideaId: string; fromVersion: number; toVersion: number }): Promise<{ from?: FinalScript; to?: FinalScript; diff: Record<string, { from?: unknown; to?: unknown }> }> {
  const from = await getFinalScriptByVersion(params.ideaId, params.fromVersion)
  const to = await getFinalScriptByVersion(params.ideaId, params.toVersion)
  const diff: Record<string, { from?: unknown; to?: unknown }> = {}

  function setIfDifferent(key: keyof Pick<FinalScript, 'title' | 'intro' | 'bulletPoints' | 'cta' | 'content'>, a?: unknown, b?: unknown) {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      diff[key as string] = { from: a, to: b }
    }
  }

  if (from && to) {
    setIfDifferent('title', from.title, to.title)
    setIfDifferent('intro', from.intro, to.intro)
    setIfDifferent('bulletPoints', from.bulletPoints, to.bulletPoints)
    setIfDifferent('cta', from.cta, to.cta)
    setIfDifferent('content', from.content, to.content)
  }

  return { from: from ?? undefined, to: to ?? undefined, diff }
}


