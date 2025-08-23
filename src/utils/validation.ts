// file: src/utils/validation.ts
export const TITLE_MAX = 40
export const BULLET_MAX = 3
export const BULLET_LEN_MAX = 80

export function validateTitle(title: string): string | null {
  const t = (title || '').trim()
  if (t.length === 0) return '标题不能为空'
  if (t.length > TITLE_MAX) return `标题不能超过 ${TITLE_MAX} 字`
  if (/[。.]$/.test(t)) return '标题不得以句号结尾'
  return null
}

export function validateBulletPoints(points: string[]): string | null {
  if (points.length > BULLET_MAX) return `要点最多 ${BULLET_MAX} 条`
  for (const p of points) {
    if ((p || '').trim().length > BULLET_LEN_MAX) return `要点不能超过 ${BULLET_LEN_MAX} 字符`
  }
  return null
}

export function validateCTA(cta: string): string | null {
  const t = (cta || '').trim()
  if (!t) return 'CTA 不能为空'
  if (!/^[\u4e00-\u9fa5A-Za-z]/.test(t)) return 'CTA 需以动词开头'
  if (t.split(/[。.!?]/).length > 2) return 'CTA 需为单句'
  return null
}
