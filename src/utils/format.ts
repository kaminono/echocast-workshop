// file: src/utils/format.ts
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const rtf = new Intl.RelativeTimeFormat('zh', { numeric: 'auto' })
  const minutes = Math.round(diff / 60000)
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour')
  const days = Math.round(hours / 24)
  return rtf.format(-days, 'day')
}

export function joinContent({ title, intro, bulletPoints, cta }: { title?: string; intro?: string; bulletPoints?: string[]; cta?: string }): string {
  const parts: string[] = []
  if (title) parts.push(`# ${title}`)
  if (intro) parts.push(intro)
  if (bulletPoints?.length) parts.push(...bulletPoints.map((b) => `- ${b}`))
  if (cta) parts.push(`CTA: ${cta}`)
  return parts.join('\n')
}
