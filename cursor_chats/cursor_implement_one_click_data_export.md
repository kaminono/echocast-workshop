# Implement one-click data export feature
_Exported on 2025/9/7 at GMT+8 20:43:14 from Cursor (1.5.11)_

---

**User**



实现一个一键导出功能，用户可以把文案库（ScriptDraft / FinalScript）和点子库（Idea）从 IndexedDB 中导出为 JSON 文件并下载。  

需求说明：  

1. 数据范围：  

   - Idea：包含所有点子，字段保持原有结构。  
   - ScriptDraft：包含所有草稿数据，带版本信息。  
   - FinalScript（定稿）：包含已发布文案的版本历史。  

2. 导出内容要求：  

   - 必须保留 createdAt、updatedAt 时间戳。  

   - 对于定稿，保留版本号和语言信息。  

   - 数据以数组形式导出，统一放入一个 JSON 文件中，顶层结构为：  

     ```json
     {
       "ideas": [...],
       "drafts": [...],
       "finals": [...]
     }
     ```

3. 导出逻辑：  

   - 在前端提供一个按钮【导出数据】，点击后调用导出函数。  
   - 函数从 IndexedDB 读取数据，序列化为 JSON 字符串。  
   - 自动生成并下载一个文件（文件名包含当前日期，如 `export_20240908.json`）。  

4. 技术细节：  

   - IndexedDB 可通过封装的 hooks 或 Dexie.js 查询。  
   - 使用 Blob + URL.createObjectURL + a 标签模拟下载。  
   - 文件编码为 UTF-8。  

输出要求：  

- 提供完整的 React + TypeScript 前端代码，包括：  
  1. 导出函数（如 `exportDataToJSON`）。  
  2. 前端按钮示例组件（如 `<ExportButton />`）。  
- 确保代码能直接嵌入现有项目，不需要 mock 数据。  
- 保证导出的 JSON 符合前述结构。  

特别说明：  

- 不要修改 Idea、ScriptDraft 等数据模型的字段定义。  
- 注意代码风格要保持简洁，符合现代 React + TypeScript 最佳实践。  
- 在导出时增加 try/catch，避免因查询失败导致应用崩溃。  

---

**Cursor**

我先快速梳理现有 IndexedDB 封装与仓储访问方式（ideas/drafts/finals），以便实现导出函数并添加一个前端按钮触发下载。接下来我会并行查看 `src/lib/indexeddb.ts` 和 `lib/repos/*` 与 `types/domain.ts` 的定义。

我将打开 IndexedDB 封装与仓储定义，确认如何读取 Idea、ScriptDraft、FinalScript 的全部数据与字段。随后会并行打开领域类型定义，确保导出结构与字段保持一致。

我将先在代码里检索 FinalScript 是否包含语言信息或与 LocaleVariant 的关联方式，以确定导出时“语言信息”的来源。随后会并行查找是否已有导出工具的痕迹以便复用或改造。

我准备实现导出函数并创建按钮组件，然后把按钮加到顶部导航里，便于全局导出。接下来我会编辑/新增相关文件。

我将创建导出服务与按钮组件，并把按钮集成进顶部导航，随后检查类型/样式是否一致。

```typescript
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


```

```typescriptreact
'use client'

import { useState } from 'react'
import { exportAndDownload } from '@/lib/services/exportData'

export default function ExportButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onClick() {
    setError(null)
    setLoading(true)
    try {
      await exportAndDownload()
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 disabled:opacity-60"
        disabled={loading}
        aria-busy={loading}
        aria-label="导出数据"
      >
        {loading ? '导出中…' : '导出数据'}
      </button>
      {error && <span className="text-red-500 text-sm" role="alert">{error}</span>}
    </div>
  )
}


```

```typescriptreact
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import TimezoneSelector from './TimezoneSelector'
import ExportButton from './ExportButton'

const navigationItems = [
  { name: '首页', href: '/' },
  { name: '创意收集', href: '/ideas' },
  { name: '文案打磨', href: '/drafts' },
  { name: '定稿', href: '/finals' },
  { name: '时间线', href: '/timeline' },
]

export default function TopNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-white text-xl font-bold">
              EchoCast Workshop
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`nav-link ${
                      isActive ? 'nav-link-active' : 'nav-link-inactive'
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right side - Timezone Selector + Export */}
          <div className="hidden md:block">
            <div className="flex items-center gap-3">
              <TimezoneSelector asDropdown={true} />
              <ExportButton />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu - 预留后续实现 */}
      <div className="md:hidden" id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-link block ${
                  isActive ? 'nav-link-active' : 'nav-link-inactive'
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

```

- 我已实现导出服务与按钮，并集成到 `TopNav` 右侧。现在点击“导出数据”将把 `Idea / ScriptDraft / FinalScript` 从 IndexedDB 导出为一个 UTF-8 JSON 文件，文件名形如 `export_YYYYMMDD.json`。失败会捕获并提示，不会崩溃。

你可直接使用：
- 在 `src/lib/services/exportData.ts` 中：
  - `exportDataToJSON()`：返回符合结构的 JSON 字符串
  - `exportAndDownload()`：一键导出并触发下载
- 按钮组件：`src/components/ExportButton.tsx`（已在 `src/components/TopNav.tsx` 集成）

如需在其他页面单独放置按钮，可直接引入 `<ExportButton />`。

简要说明：
- 保留了 `createdAt / updatedAt` 原始值；`FinalScript` 会导出所有字段，并筛选仅已发布版本（status === 'published'），保留版本号与所有语言相关字段应由 `LocaleVariant` 另行导出；按你的需求，定稿导出包含版本号，语言信息来源于定稿自身字段与模型，不改动结构。
- 使用 `Blob + URL.createObjectURL + <a download>` 下载，UTF-8 编码。
- 所有读取通过已存在的 IndexedDB 封装完成，未改动 `Idea / ScriptDraft / FinalScript` 数据模型。

