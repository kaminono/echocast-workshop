// file: src/app/api/drafts/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { simpleChat } from '@/lib/ai/x1Chat'
import { AppError } from '@/lib/services/errors'
import { joinContent } from '@/utils/format'

interface Body {
  idea: { title: string; summary?: string; content?: string }
  draft: { title?: string; intro?: string; bulletPoints?: string[]; cta?: string; content?: string }
  suggestion?: string
  mode?: 'normalize' | 'enhance'
}

interface OutputJSON {
  title: string
  intro: string
  bulletPoints: string[]
  cta: string
  content: string
}

function stripFences(t: string): string {
  return t.replace(/^```[a-zA-Z]*\n?/g, '').replace(/```\s*$/g, '')
}

function extractJson(t: string): string | null {
  const m = t.match(/\{[\s\S]*\}/)
  return m ? m[0] : null
}

function safeParse(t: string): any | null {
  try { return JSON.parse(t) } catch { return null }
}

function validateAndNormalize(obj: any): OutputJSON {
  if (!obj || typeof obj !== 'object') throw new AppError('PARSE_ERROR', '结果不是对象')
  const title = String(obj.title ?? '').trim()
  const intro = String(obj.intro ?? '').trim()
  const bulletPoints = Array.isArray(obj.bulletPoints) ? obj.bulletPoints.map((x: any) => String(x).trim()).slice(0, 3) : []
  const cta = String(obj.cta ?? '').trim()
  let content = String(obj.content ?? '').trim()

  if (!title || title.length > 40) throw new AppError('VALIDATION_ERROR', '标题不合法')
  if (!intro) throw new AppError('VALIDATION_ERROR', '引子不能为空')
  if (!cta) throw new AppError('VALIDATION_ERROR', 'CTA 不能为空')
  if (!Array.isArray(bulletPoints)) throw new AppError('VALIDATION_ERROR', '要点需为数组')

  if (!content) {
    content = joinContent({ title, intro, bulletPoints, cta })
  }
  return { title, intro, bulletPoints, cta, content }
}

function buildSystemPrompt(mode: 'normalize' | 'enhance' = 'normalize'): string {
  const policy = mode === 'normalize' ? '仅结构化与轻微润色，不得新增事实。' : '可在不虚构事实前提下做适度增强。'
  return `你是资深文案编辑，请基于输入生成【严格 JSON】的草稿：\n- 仅输出 JSON：{ "title", "intro", "bulletPoints", "cta", "content" }\n- title ≤ 40 字，且不得以句号结尾\n- intro 为 1–2 句\n- bulletPoints ≤ 3 条，每条一句\n- cta 动词开头，单句\n- content = 将 title + intro + bulletPoints + cta 按顺序拼接的完整文案\n- 模式要求：${policy}\n- 严禁输出除 JSON 以外的任何文字`
}

function buildUserPrompt(body: Body): string {
  const { idea, draft, suggestion } = body
  return `请根据以下输入生成优化后的文案草稿：\n\n【点子（Idea）】\n标题: ${idea.title}\n摘要: ${idea.summary || ''}\n内容: ${idea.content || ''}\n\n【当前草稿（Draft）】\n标题: ${draft.title || ''}\n开场白: ${draft.intro || ''}\n要点: ${JSON.stringify(draft.bulletPoints || [])}\n结尾: ${draft.cta || ''}\n\n【用户建议】\n${suggestion || ''}\n\n输出要求：\n1. 严格返回 JSON，不要多余解释\n2. JSON 字段：title, intro, bulletPoints, cta, content\n3. bulletPoints 数组最多 3 条\n4. content = title + intro + bulletPoints + cta 拼接`
}

async function callModel(body: Body): Promise<string> {
  const system = buildSystemPrompt(body.mode)
  const user = buildUserPrompt(body)
  const res = await simpleChat(user, system, { temperature: 0.3, maxTokens: 800, timeout: 30000 })
  return res.text || ''
}

function parseStrict(text: string): OutputJSON | null {
  const cleaned = stripFences(text.trim())
  const parsed = safeParse(cleaned) || (extractJson(cleaned) ? safeParse(extractJson(cleaned)!) : null)
  if (!parsed) return null
  try { return validateAndNormalize(parsed) } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body
    if (!body?.idea?.title || !body?.draft) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: '参数缺失' }, { status: 400 })
    }

    // 首次调用
    const first = await callModel(body)
    let result = parseStrict(first)

    // 自纠重试一次
    if (!result) {
      const userRepair = buildUserPrompt(body) + '\n\n严格要求：仅输出合法 JSON，不要额外解释。'
      const system = buildSystemPrompt(body.mode)
      const retry = await simpleChat(userRepair, system, { temperature: 0.2, maxTokens: 800, timeout: 30000 })
      result = parseStrict(retry.text || '')
    }

    if (!result) {
      return NextResponse.json({ code: 'PARSE_ERROR', message: '结果格式错误' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '未知错误'
    const code = msg.includes('timeout') ? 'TIMEOUT' : 'INTERNAL_ERROR'
    return NextResponse.json({ code, message: msg }, { status: 500 })
  }
}
