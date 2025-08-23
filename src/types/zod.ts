import { z } from 'zod'

// 错误码枚举
export enum ErrorCode {
  INVALID_TITLE = 'INVALID_TITLE',
  INVALID_INTRO = 'INVALID_INTRO',
  INVALID_BULLETS = 'INVALID_BULLETS',
  INVALID_CTA = 'INVALID_CTA',
  INVALID_STATUS = 'INVALID_STATUS',
  INVALID_VERSION = 'INVALID_VERSION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT_VERSION = 'CONFLICT_VERSION',
  PERSISTENCE_ERROR = 'PERSISTENCE_ERROR',
}

// 通用约束
export const TitleSchema = z.string().min(1, { message: ErrorCode.INVALID_TITLE }).max(120, { message: ErrorCode.INVALID_TITLE })
export const IntroSchema = z.string().min(1, { message: ErrorCode.INVALID_INTRO }).max(280, { message: ErrorCode.INVALID_INTRO })
export const BulletSchema = z.string().min(1, { message: ErrorCode.INVALID_BULLETS }).max(140, { message: ErrorCode.INVALID_BULLETS })
export const BulletPointsSchema = z.array(BulletSchema).max(3, { message: ErrorCode.INVALID_BULLETS })
export const CtaSchema = z.string().min(1, { message: ErrorCode.INVALID_CTA }).max(140, { message: ErrorCode.INVALID_CTA })

// ScriptDraft 校验
export const ScriptDraftSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string(),
  title: TitleSchema,
  intro: IntroSchema,
  bulletPoints: BulletPointsSchema,
  cta: CtaSchema,
  content: z.string().min(1),
  status: z.enum(['draft', 'reviewing'], { errorMap: () => ({ message: ErrorCode.INVALID_STATUS }) }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// FinalScript 校验
export const FinalScriptSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string(),
  versionNumber: z.number().int().positive({ message: ErrorCode.INVALID_VERSION }),
  title: TitleSchema,
  intro: IntroSchema,
  bulletPoints: BulletPointsSchema,
  cta: CtaSchema,
  content: z.string().min(1),
  status: z.enum(['published', 'archived'], { errorMap: () => ({ message: ErrorCode.INVALID_STATUS }) }),
  publishedAt: z.string().datetime().optional(),
  provenance: z
    .object({
      generator: z.enum(['ai', 'manual', 'hybrid']),
      model: z.string().optional(),
      modelParams: z.record(z.any()).optional(),
      notes: z.string().optional(),
    })
    .optional(),
  changeLog: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// LocaleVariant 校验
export const LocaleVariantSchema = z.object({
  id: z.string().uuid(),
  finalScriptId: z.string(),
  sourceVersion: z.number().int().positive({ message: ErrorCode.INVALID_VERSION }),
  locale: z.string().min(2).max(10),
  languageName: z.string().min(1).max(64),
  title: TitleSchema,
  intro: IntroSchema,
  bulletPoints: BulletPointsSchema,
  cta: CtaSchema,
  content: z.string().min(1),
  status: z.enum(['pending', 'translated', 'reviewed', 'published'], { errorMap: () => ({ message: ErrorCode.INVALID_STATUS }) }),
  translationType: z.enum(['manual', 'ai', 'hybrid']),
  localization: z
    .object({
      culturalNotes: z.string().optional(),
      terminology: z.record(z.string()).optional(),
      formatting: z.string().optional(),
    })
    .optional(),
  qualityScore: z.number().int().min(1).max(10).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type ScriptDraftInput = z.input<typeof ScriptDraftSchema>
export type FinalScriptInput = z.input<typeof FinalScriptSchema>
export type LocaleVariantInput = z.input<typeof LocaleVariantSchema>

export function buildContentFromElements(params: { title: string; intro: string; bulletPoints: string[]; cta: string }): string {
  const bullets = params.bulletPoints.map((b, i) => `${i + 1}. ${b}`).join('\n')
  return `# ${params.title}\n\n${params.intro}\n\n${bullets}${bullets ? '\n\n' : ''}CTA: ${params.cta}`
}


