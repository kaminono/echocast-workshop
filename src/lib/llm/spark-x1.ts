// file: src/lib/llm/spark-x1.ts
import type { FourFields, Idea, ScriptDraft } from '@/types/domain'
import { AppError } from '@/lib/services/errors'

export type GenerateMode = 'normalize' | 'enhance'

export interface GenerateParams {
  idea: Pick<Idea, 'title' | 'summary' | 'content'>
  draft: Pick<ScriptDraft, 'title' | 'intro' | 'bulletPoints' | 'cta' | 'content'>
  suggestion?: string
  mode: GenerateMode
}

export async function generateStructuredDraft(params: GenerateParams): Promise<FourFields & { content: string }> {
  const canCallApi = typeof window !== 'undefined'
  if (!canCallApi) {
    throw new AppError('NETWORK_ERROR', '仅支持在浏览器端调用生成接口')
  }

  try {
    const res = await fetch('/api/drafts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new AppError('NETWORK_ERROR', `API 错误: ${res.status} ${errText || ''}`)
    }
    const data = await res.json()
    return data as FourFields & { content: string }
  } catch (e) {
    throw new AppError('NETWORK_ERROR', 'LLM 接口调用失败', e)
  }
}
