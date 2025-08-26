import { NextRequest, NextResponse } from 'next/server'
import { simpleChat } from '@/lib/ai/x1Chat'
import { buildContentFromElements } from '@/types/zod'

interface OutputJSON {
  title: string
  intro: string
  bulletPoints: string[]
  cta: string
  content?: string
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

function normalizeAndClip(obj: any): OutputJSON {
  const title = String(obj.title ?? '').trim()
  const intro = String(obj.intro ?? '').trim()
  const arr = Array.isArray(obj.bulletPoints) ? obj.bulletPoints : []
  const bulletPoints = arr.map((x: any) => String(x).trim()).filter(Boolean).slice(0, 3)
  const cta = String(obj.cta ?? '').trim()
  let content = String(obj.content ?? '').trim()
  if (!content) {
    content = buildContentFromElements({ title, intro, bulletPoints, cta })
  }
  return { title, intro, bulletPoints, cta, content }
}

function buildSystemPrompt(targetLocale: string): string {
  return `你是资深本地化译者，请将输入文案翻译为 ${targetLocale}。严格输出 JSON：{ "title", "intro", "bulletPoints", "cta" }。\n约束：\n- title ≤ 40 字，不以句号结尾\n- intro 1–2 句\n- bulletPoints ≤ 3 条，每条一句\n- cta 单句，动词开头\n- 严禁输出除 JSON 外的任何文字。` 
}

function buildUserPrompt(input: { title: string; intro: string; bulletPoints: string[]; cta: string }): string {
  return `请翻译以下四要素：\n标题: ${input.title}\n引子: ${input.intro}\n要点: ${JSON.stringify(input.bulletPoints)}\nCTA: ${input.cta}`
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ finalScriptId: string; locale: string }> }) {
  try {
    const { finalScriptId, locale } = await ctx.params
    if (!finalScriptId || !locale) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: '缺少参数' }, { status: 400 })
    }

    const body = await req.json().catch(() => null) as null | { title: string; intro: string; bulletPoints: string[]; cta: string }
    if (!body || !body.title || !body.intro || !Array.isArray(body.bulletPoints) || !body.cta) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: '缺少翻译源文案' }, { status: 400 })
    }

    const system = buildSystemPrompt(locale)
    const user = buildUserPrompt({ title: body.title, intro: body.intro, bulletPoints: body.bulletPoints.slice(0, 3), cta: body.cta })
    const ai = await simpleChat(user, system, { temperature: 0.2, maxTokens: 600, timeout: 30000 })

    const cleaned = stripFences(ai.text || '')
    const parsed = safeParse(cleaned) || (extractJson(cleaned) ? safeParse(extractJson(cleaned)!) : null)
    if (!parsed) {
      return NextResponse.json({ code: 'PARSE_ERROR', message: '抱歉，暂时未能识别到规范格式的翻译结果，请稍后重试。' }, { status: 502 })
    }

    const out = normalizeAndClip(parsed)
    return NextResponse.json(out)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '未知错误'
    const code = msg.includes('timeout') ? 'TIMEOUT' : 'INTERNAL_ERROR'
    return NextResponse.json({ code, message: msg }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'


