import { NextRequest, NextResponse } from 'next/server'
import * as LocaleRepo from '@/lib/repos/locale-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import { buildContentFromElements } from '@/types/zod'

export async function PUT(req: NextRequest, ctx: { params: Promise<{ finalScriptId: string; locale: string }> }) {
  const { finalScriptId, locale } = await ctx.params
  const versions = await FinalRepo.getSeriesVersions(finalScriptId)
  const current = versions[versions.length - 1]
  if (!current) return NextResponse.json({ code: 'NOT_FOUND', message: '定稿版本不存在' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ code: 'INVALID_JSON', message: '请求格式错误' }, { status: 400 })
  const title = String(body.title || '').trim()
  const intro = String(body.intro || '').trim()
  const bulletPoints = Array.isArray(body.bulletPoints) ? body.bulletPoints.map((x: any) => String(x).trim()).slice(0, 3) : []
  const cta = String(body.cta || '').trim()
  if (!title || !intro || !cta) return NextResponse.json({ code: 'VALIDATION_ERROR', message: '缺少必要字段' }, { status: 400 })
  const content = buildContentFromElements({ title, intro, bulletPoints, cta })

  // 不允许修改已发布/排期
  const existing = await LocaleRepo.getByFinalAndLocale(finalScriptId, current.versionNumber, locale)
  if (existing && (existing.status === 'published' || existing.status === 'scheduled')) {
    return NextResponse.json({ code: 'CONFLICT', message: '已发布/排期不可修改' }, { status: 409 })
  }

  const saved = await LocaleRepo.upsertLocaleVariant({
    finalScriptId,
    sourceVersion: current.versionNumber,
    locale,
    languageName: locale,
    title,
    intro,
    bulletPoints,
    cta,
    content,
    status: 'translated',
    translationType: 'manual',
  })
  return NextResponse.json(saved)
}

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ finalScriptId: string; locale: string }> }) {
  const { finalScriptId, locale } = await ctx.params
  const versions = await FinalRepo.getSeriesVersions(finalScriptId)
  const current = versions[versions.length - 1]
  if (!current) return NextResponse.json({ code: 'NOT_FOUND', message: '定稿版本不存在' }, { status: 404 })

  const existing = await LocaleRepo.getByFinalAndLocale(finalScriptId, current.versionNumber, locale)
  if (!existing) return NextResponse.json({ code: 'NOT_FOUND', message: '翻译不存在' }, { status: 404 })
  if (existing.status === 'published') return NextResponse.json({ code: 'CONFLICT', message: '已发布不可删除' }, { status: 409 })
  if (existing.status === 'scheduled') return NextResponse.json({ code: 'CONFLICT', message: '排期中，先取消排期' }, { status: 409 })

  await LocaleRepo.deleteLocaleVariant(finalScriptId, current.versionNumber, locale)
  return NextResponse.json({ success: true })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'


