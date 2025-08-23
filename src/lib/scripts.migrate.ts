import type { ScriptDraft, FinalScript, LocaleVariant } from '@/types/domain'
import { addFinalScript } from '@/lib/indexeddb'
import { upsertDraft, addOrUpdateLocale } from '@/lib/scripts.repo'
import { buildContentFromElements } from '@/types/zod'

// 旧结构定义（最小）
type OldScriptDraft = {
  id: string
  ideaId: string
  title: string
  content: string
  version: number
  versionHistory: { version: number; content: string; changes: string; createdAt: string; createdBy?: string }[]
  status: string
  createdAt: string | Date
  updatedAt: string | Date
}

type OldLocaleVariant = {
  id: string
  scriptId: string
  locale: string
  languageName: string
  title: string
  content: string
  status: string
  translationType: 'manual' | 'ai' | 'hybrid'
  localization?: OldLocaleVariant['localization']
  createdAt: string | Date
  updatedAt: string | Date
}

function parseFourElementsFromContent(content: string): { title: string; intro: string; bulletPoints: string[]; cta: string } {
  // 简单启发式：基于标题行、CTA 前缀解析；真实环境可替换为更可靠的结构化元数据
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const title = lines[0]?.replace(/^#\s*/, '') || ''
  const ctaLine = lines.find(l => /^CTA:/i.test(l)) || ''
  const cta = ctaLine.replace(/^CTA:\s*/i, '')
  const bullets = lines.filter(l => /^\d+\./.test(l)).map(l => l.replace(/^\d+\.\s*/, ''))
  const intro = lines.slice(1).find(l => !/^\d+\./.test(l) && !/^CTA:/i.test(l)) || ''
  return { title, intro, bulletPoints: bullets.slice(0, 3), cta }
}

export async function migrateFromOldStructures(params: {
  oldDrafts: OldScriptDraft[]
  oldLocales: OldLocaleVariant[]
}): Promise<{ migratedFinals: FinalScript[]; currentDrafts: ScriptDraft[]; migratedLocales: LocaleVariant[] }> {
  const migratedFinals: FinalScript[] = []
  const migratedLocales: LocaleVariant[] = []
  const currentDrafts: ScriptDraft[] = []

  // 按 ideaId 聚合旧草稿，处理 versionHistory
  for (const old of params.oldDrafts) {
    // 历史按版本排序
    const histories = [...(old.versionHistory || [])].sort((a, b) => a.version - b.version)
    if (histories.length > 0) {
      // 其余 history（除最后一条） => FinalScript 版本
      const finals = histories.slice(0, -1)
      for (const h of finals) {
        const parts = parseFourElementsFromContent(h.content)
        const content = buildContentFromElements(parts)
        const migrated = await addFinalScript({
          ideaId: old.ideaId,
          versionNumber: h.version,
          title: parts.title,
          intro: parts.intro,
          bulletPoints: parts.bulletPoints,
          cta: parts.cta,
          content,
          status: 'published',
          publishedAt: new Date(h.createdAt).toISOString(),
          changeLog: h.changes,
        })
        migratedFinals.push(migrated)
      }

      // 最后一条 history => 当前 ScriptDraft
      const last = histories[histories.length - 1]
      const parts = parseFourElementsFromContent(last.content)
      const content = buildContentFromElements(parts)
      const draft = await upsertDraft({
        ideaId: old.ideaId,
        title: parts.title,
        intro: parts.intro,
        bulletPoints: parts.bulletPoints,
        cta: parts.cta,
        content,
        status: 'draft',
      })
      currentDrafts.push(draft)
    } else {
      // 没有历史：尝试从当前 content 解析，生成草稿
      const parts = parseFourElementsFromContent(old.content)
      const content = buildContentFromElements(parts)
      const draft = await upsertDraft({
        ideaId: old.ideaId,
        title: parts.title,
        intro: parts.intro,
        bulletPoints: parts.bulletPoints,
        cta: parts.cta,
        content,
        status: 'draft',
      })
      currentDrafts.push(draft)
    }
  }

  // 迁移多语版本：绑定到 FinalScript + versionNumber（以旧的 scriptId 对应 ideaId，按 version 匹配）
  for (const loc of params.oldLocales) {
    // 这里假设旧的 scriptId 对应 ideaId；实际可根据映射表修正
    const ideaId = (loc as any).ideaId || (loc as any).scriptId
    const versionNumber = (loc as any).version || 1
    // 查找对应定稿（若不存在则跳过或记录）
    // 简化：直接绑定到最新定稿
    const boundFinals = await (await import('@/lib/indexeddb')).listFinalScriptsByIdea(ideaId)
    const base = boundFinals.find(f => f.versionNumber === versionNumber) || boundFinals[boundFinals.length - 1]
    if (!base) continue

    // 解析四要素
    const parts = parseFourElementsFromContent(loc.content)
    const content = buildContentFromElements(parts)
    const created = await addOrUpdateLocale({
      finalScriptId: base.id,
      sourceVersion: base.versionNumber,
      locale: loc.locale,
      languageName: loc.languageName,
      title: parts.title || base.title,
      intro: parts.intro || base.intro,
      bulletPoints: parts.bulletPoints.length ? parts.bulletPoints : base.bulletPoints,
      cta: parts.cta || base.cta,
      content,
      status: (loc.status as any) ?? 'translated',
      translationType: loc.translationType,
      localization: loc.localization as any,
      qualityScore: undefined,
    })
    migratedLocales.push(created)
  }

  return { migratedFinals, currentDrafts, migratedLocales }
}


