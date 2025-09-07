'use client'

import { withRead, IDB_CONFIG, idbGetAll } from '@/lib/indexeddb'
import type { Idea, ScriptDraft, FinalScript } from '@/types/domain'

/**
 * 导出 IndexedDB 中的 Ideas / Drafts / Finals 为单一 JSON 字符串
 * 符合结构：{ ideas: [...], drafts: [...], finals: [...] }
 * - Finals 仅包含已发布版本（status === 'published'）
 * - 保留 createdAt / updatedAt 等原始字段
 */
export async function exportDataToJSON(): Promise<string> {
  try {
    const [ideas, drafts, finalsAll] = await Promise.all([
      withRead<Idea[]>(IDB_CONFIG.stores.ideas, (store) => idbGetAll<Idea>(store)),
      withRead<ScriptDraft[]>(IDB_CONFIG.stores.drafts, (store) => idbGetAll<ScriptDraft>(store)),
      withRead<FinalScript[]>(IDB_CONFIG.stores.finalScripts, (store) => idbGetAll<FinalScript>(store)),
    ])

    const finals = finalsAll.filter((f) => f.status === 'published')

    const payload = {
      ideas,
      drafts,
      finals,
    }

    return JSON.stringify(payload, null, 2)
  } catch (error) {
    console.error('导出失败', error)
    throw new Error('导出失败，请稍后重试')
  }
}

/**
 * 触发浏览器下载 JSON 文件
 * 文件名：export_YYYYMMDD.json
 */
export function triggerDownloadFromJSON(jsonString: string): void {
  try {
    const now = new Date()
    const yyyy = now.getFullYear().toString()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const filename = `export_${yyyy}${mm}${dd}.json`

    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载失败', error)
    throw new Error('下载失败，请稍后重试')
  }
}

/**
 * 一键导出并下载
 */
export async function exportAndDownload(): Promise<void> {
  const json = await exportDataToJSON()
  triggerDownloadFromJSON(json)
}


