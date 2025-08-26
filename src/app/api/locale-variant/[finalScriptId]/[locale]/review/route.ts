import { NextResponse } from 'next/server'
import * as LocaleRepo from '@/lib/repos/locale-repo'
import * as FinalRepo from '@/lib/repos/final-repo'

export async function POST(_: Request, ctx: { params: Promise<{ finalScriptId: string; locale: string }> }) {
  const { finalScriptId, locale } = await ctx.params
  const versions = await FinalRepo.getSeriesVersions(finalScriptId)
  const current = versions[versions.length - 1]
  if (!current) return NextResponse.json({ code: 'NOT_FOUND', message: '定稿版本不存在' }, { status: 404 })

  const existing = await LocaleRepo.getByFinalAndLocale(finalScriptId, current.versionNumber, locale)
  if (!existing) return NextResponse.json({ code: 'NOT_FOUND', message: '翻译不存在' }, { status: 404 })
  if (existing.status === 'published') return NextResponse.json({ code: 'CONFLICT', message: '已发布不可变更' }, { status: 409 })

  const updated = await LocaleRepo.setReviewed(finalScriptId, current.versionNumber, locale)

  // 预留事件回调（可在此发出 reviewed 事件）
  // e.g., await emitLocaleReviewed({ finalScriptId, version: current.versionNumber, locale })

  return NextResponse.json(updated)
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'


