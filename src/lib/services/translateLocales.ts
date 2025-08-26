import * as LocaleRepo from '@/lib/repos/locale-repo'

export type TargetLocale = 'en' | 'es' | 'ja'

export interface TranslateProgress {
  locale: string
  status: 'pending' | 'running' | 'translated' | 'failed'
  error?: string
}

export interface TranslateOptions { concurrency?: number }

export interface SourceFourFields { title: string; intro: string; bulletPoints: string[]; cta: string; sourceVersion: number }

export async function generateLocales(finalScriptId: string, locales: TargetLocale[], source: SourceFourFields, opts: TranslateOptions = {}, onProgress?: (p: TranslateProgress) => void): Promise<void> {
  const concurrency = Math.max(1, Math.min(3, opts.concurrency ?? 2))
  const queue = locales.slice()

  const worker = async () => {
    while (queue.length > 0) {
      const loc = queue.shift()!
      onProgress?.({ locale: loc, status: 'running' })
      try {
        const url = `/api/locale-variant/${encodeURIComponent(finalScriptId)}/${encodeURIComponent(loc)}/generate`
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: source.title, intro: source.intro, bulletPoints: source.bulletPoints.slice(0,3), cta: source.cta }) })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          onProgress?.({ locale: loc, status: 'failed', error: text || `HTTP ${res.status}` })
        } else {
          const out = await res.json()
          await LocaleRepo.upsertLocaleVariant({
            finalScriptId,
            sourceVersion: source.sourceVersion,
            locale: loc,
            languageName: loc,
            title: out.title,
            intro: out.intro,
            bulletPoints: (out.bulletPoints || []).slice(0,3),
            cta: out.cta,
            content: out.content || '',
            status: 'translated',
            translationType: 'ai',
          })
          onProgress?.({ locale: loc, status: 'translated' })
        }
      } catch (e) {
        onProgress?.({ locale: loc, status: 'failed', error: e instanceof Error ? e.message : String(e) })
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker())
  await Promise.all(workers)
}

export async function retryLocale(finalScriptId: string, locale: string, source: SourceFourFields): Promise<void> {
  const url = `/api/locale-variant/${encodeURIComponent(finalScriptId)}/${encodeURIComponent(locale)}/retry`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: source.title, intro: source.intro, bulletPoints: source.bulletPoints.slice(0,3), cta: source.cta }) })
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`))
  const out = await res.json()
  await LocaleRepo.upsertLocaleVariant({
    finalScriptId,
    sourceVersion: source.sourceVersion,
    locale,
    languageName: locale,
    title: out.title,
    intro: out.intro,
    bulletPoints: (out.bulletPoints || []).slice(0,3),
    cta: out.cta,
    content: out.content || '',
    status: 'translated',
    translationType: 'ai',
  })
}

export async function saveLocale(finalScriptId: string, locale: string, sourceVersion: number, data: { title: string; intro: string; bulletPoints: string[]; cta: string }): Promise<void> {
  await LocaleRepo.upsertLocaleVariant({
    finalScriptId,
    sourceVersion,
    locale,
    languageName: locale,
    title: data.title,
    intro: data.intro,
    bulletPoints: data.bulletPoints.slice(0,3),
    cta: data.cta,
    content: `${data.title}\n${data.intro}\n${data.bulletPoints.slice(0,3).join('\n')}\n${data.cta}`,
    status: 'translated',
    translationType: 'manual',
  })
}

export async function deleteLocale(finalScriptId: string, locale: string): Promise<void> {
  // 需要调用方传入版本以删除特定版本；此处由页面层面拿到 selected.versionNumber 后改造
  throw new Error('deleteLocale 需在页面层传入 sourceVersion 使用 LocaleRepo.deleteLocaleVariant')
}

export async function reviewLocale(finalScriptId: string, locale: string): Promise<void> {
  // 同上，由页面传入 sourceVersion 后调用 LocaleRepo.setReviewed
  throw new Error('reviewLocale 需在页面层传入 sourceVersion 使用 LocaleRepo.setReviewed')
}


