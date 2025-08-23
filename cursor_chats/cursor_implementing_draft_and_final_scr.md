# Implementing draft and final script management
_Exported on 2025/8/23 at GMT+8 20:29:58 from Cursor (1.5.4)_

---

**User**

提示词目标（说明要解决的问题）

实现“文案打磨工作台”的前端功能闭环：在 /drafts 查看与创建草稿 → 通过弹窗从 ideas 中选择点子进入草稿编辑 → 使用大模型（讯飞星火 x1）基于「点子 + 当前草稿 + 用户建议」多轮生成/更新四要素 → 发布为定稿，生成递增版本号 v1/v2/… → 在 /finals 查看定稿列表与详情 → 在 /finals/[finalScriptId] 回滚指定版本到草稿继续打磨。要求以 Next.js App Router + TypeScript + Tailwind（可选 shadcn/ui） 产出可运行代码，持久化使用 IndexedDB，并严格对齐我们既定的存储契约（Idea 只读且保持原样；ScriptDraft 仅最新一份；FinalScript 追加版本；LocaleVariant 绑定定稿版本）。

需求说明（列出逻辑和约束）
业务主线与页面路由

/drafts（草稿列表页）

列表字段：草稿标题（title；为空显示“未命名草稿”）、关联 idea 标题、updatedAt 相对时间、状态 badge（draft/reviewing）。

顶部按钮「新建草稿」：弹出 IdeasModal（支持检索与“仅显示尚未创建草稿的点子”筛选）。

选择某个 idea：

若该 idea 已存在草稿 → 直接跳转 /drafts/[draftId]（不重复创建）。

否则创建新 ScriptDraft（四要素置空、status=draft、ideaId 绑定），写入 IndexedDB 后跳转草稿页。

/drafts/[id]（草稿编辑页）

上部 IdeaSummary：展示 idea 详情（title、summary/rawInputText、source、createdAt）。

中部 DraftEditor（四区）：

TitleInput（≤40 字，软校验/超限提示）

IntroTextarea（1–2 句提示）

BulletPointsEditor（最多 3 条，逐条编辑；超限禁用新增；允许删除/重新排序）

CTAInput（单行、动词开头提示）

下部 SuggestBox（多行 textarea + 提交按钮 + 模式切换）：

支持 Enter 提交（Shift+Enter 换行；⌘/Ctrl+Enter 亦可提交）。

组装上下文：{ idea 核心字段, 当前草稿四要素, 用户建议, mode: normalize|enhance }。

调用 SparkX1 LLM 适配器，按“四要素 JSON 协议”请求；响应进行 严格 JSON 校验与纠错重试（详见 LLM 适配器要求）。

合并回填四要素到草稿；字段级高亮 3 秒提示差异（可比对旧值）。

右上角 发布按钮：

调用 publishDraft(ideaId)：读取草稿 → 取该系列最大 versionNumber + 1 → 追加 FinalScript 新版本（只追加不覆盖，保证不跳号，含 publishedAt）。

成功 toast：已发布为 vN；展示“最新定稿：vN（时间）”与跳转 /finals/[finalScriptId] 的链接（finalScriptId 为该系列稳定 ID）。

顶部/侧栏 最新定稿信息：显示最新 vN 与时间；点击可跳转定稿详情。

/finals（定稿列表页）

列表字段：关联 idea 标题、最高版本号 vN、最后更新时间（series 维度）、查看详情链接。

排序：按该系列最后更新时间倒序。

/finals/[finalScriptId]（定稿详情页）

左侧 版本列表 / 时间线：v1…vN（显示版本号、时间、摘要/标题）。

右侧 版本内容区：展示所选版本的四要素与可选全文 content。

按钮「回滚到此版本」：

调用 rollbackToVersion(ideaId, versionNumber)：将该版本四要素覆盖回 ScriptDraft（最新草稿），不修改历史版本；回滚成功后跳转 /drafts/[draftId]。

提示：回滚后再次发布将产生 vN+1（不修改历史号段）。

数据契约与持久化（沿用已定策略）

Idea：不可修改（只读）；当前仅需最小读取接口（按 id 查询、按关键字搜索列表）。

ScriptDraft（草稿）：仅保存“最新草稿”；字段包括 id, ideaId, title, intro, bulletPoints(≤3), cta, content?(冗余拼接), status('draft'|'reviewing'), createdAt, updatedAt（均为 ISO 字符串）；不允许 version/versionHistory。

FinalScript（定稿）：版本记录（只追加），字段包括 finalScriptId(系列稳定 ID), ideaId, versionNumber(1..N), title, intro, bulletPoints, cta, content?, status('published'|'archived'), publishedAt, createdBy?, provenance?, changeLog?[]；保证 (finalScriptId, versionNumber) 唯一。

LocaleVariant（多语）（本迭代可先保留 repo/类型，UI 非必须）：绑定 finalScriptId + sourceVersion，字段同四要素与译文元数据。

IndexedDB：对象仓库与索引

stores：ideas（只读镜像/种子）、drafts（by id, by ideaId unique, by updatedAt desc）、final_scripts（by finalScriptId, by ideaId, by updatedAt/publishedAt, by (finalScriptId+versionNumber) unique）、locale_variants。

并发发布：在同一“发布”工作流内读取 max(versionNumber) → 追加 → 捕获主键冲突重试 3 次（指数退避）。

LLM 适配器（讯飞星火 x1）

导出 generateStructuredDraft(params): Promise<FourFields>，其中 FourFields = { title, intro, bulletPoints: string[], cta }。

四要素 JSON 协议（强约束）：

输出仅包含四键：title（≤40 且不得句号结尾）、intro（1–2 句）、bulletPoints（数组 ≤3；每条 ≤80 字符、独立成句）、cta（动词开头）。

mode：normalize 仅结构化与轻润色；enhance 允许补全骨架但不得虚构事实。

严格 JSON 解析：先尝试直接 JSON.parse；若失败，进行“再请求/自纠”一次，或从大段文本中提取最近的 JSON 区块；最终仍失败则返回可恢复错误并提示用户。

接口占位：提供可配置的星火 x1 API Key、Endpoint 环境变量占位（.env.local）；在本地无密钥时用 mock 返回（可在 SuggestBox UI 标注 “Mock 响应”）。

交互细节与可用性

键盘：DraftEditor 中 ⌘/Ctrl+S = 发布；SuggestBox 中 Enter 提交 / Shift+Enter 换行 / ⌘/Ctrl+Enter 亦可提交。

提示：保存/发布/回滚成功 toast；错误 toast；字段级变更高亮 3 秒。

空态/加载态/出错态：三态 UI 完整覆盖列表页、详情页、弹窗、建议提交按钮。

搜索与筛选：IdeasModal 支持关键字过滤；草稿/定稿列表支持轻量 client 端过滤。

断网/失败：IndexedDB 写入失败回退提示；LLM 超时/限流有退避提示。

输出要求（定义产物和格式）

总体约束

产出必须为可编译、可运行的前端代码；所有代码用 TypeScript/TSX；给出完整文件树与每个文件的代码；路径清晰（建议在代码块第一行用注释 // file: <relative-path> 明示文件路径）。

不输出与代码无关的长篇说明；必要注释写在代码里（可用 TODO 标识可扩展点）。

若依赖 Tailwind 或 shadcn/ui，请包含最小配置与安装说明（package.json、tailwind.config、postcss.config、globals.css 片段）。

请按以下顺序输出：

文件结构树

domain/types.ts

FourFields、ScriptDraft、FinalScript、LocaleVariant（禁止出现 Idea 定义）

lib/db/indexeddb.ts

IndexedDB 初始化、存储名称、主键与索引定义、版本号管理

lib/repos/

idea-repo.ts（只读最小接口：getById、search、seed，仅镜像/种子，不定义 Idea 类型）

draft-repo.ts（CRUD、findByIdeaId、save、upsert、delete）

final-repo.ts（appendVersion、getSeriesMeta、getVersion、listByUpdatedAt、getMaxVersion）

locale-repo.ts（占位接口）

lib/services/

publishDraft.ts（并发安全追加版本，重试 3 次；返回 FinalScript）

rollbackToVersion.ts（把 vX 覆盖回草稿并返回草稿；不改历史）

diff.ts（diffDraftWithFinal、diffFinalVsFinal；返回逐字段差异摘要 DiffResult）

lib/llm/spark-x1.ts

generateStructuredDraft(params) 实现：构造“系统+用户”消息、调用星火 x1、严格 JSON 校验、错误处理与 Mock

内置四要素提示词协议模板（normalize/enhance）

app/layout.tsx + 全局样式

app/(nav)/drafts/page.tsx（草稿列表）
app/(nav)/drafts/[id]/page.tsx（草稿编辑页 + IdeaSummary + DraftEditor + SuggestBox + VersionBadge）
app/(nav)/finals/page.tsx（定稿列表）
app/(nav)/finals/[finalScriptId]/page.tsx（定稿详情页 + 版本列表/时间线 + 回滚按钮）

components/

IdeaSummary.tsx、DraftEditor.tsx、BulletPointsEditor.tsx、SuggestBox.tsx、IdeasModal.tsx、VersionBadge.tsx、FinalTimeline.tsx、Toast.tsx（或用 shadcn/ui）

utils/

format.ts（相对时间、拼接 content 等）、validation.ts（前端软校验）、hotkeys.ts（⌘S / Enter 等）

mock/seed.ts

最小种子：若本地无数据，则注入 3 条 ideas、1 条草稿、2 条定稿版本（演示 v1/v2）

README.md（运行指南）

pnpm i / npm i，本地开发 npm run dev，Tailwind 配置说明，环境变量 .env.local 示例（SPARK_API_KEY=...），以及如何启用 Mock

E2E 演示脚本（可选，无测试框架）

scripts/demo.ts：模拟“创建→生成→发布 v1→再次生成→发布 v2→回滚到 v1→再发布 v3”打印日志

编码风格与 UI 要求

Tailwind 简洁风：卡片圆角、阴影、间距合理；空态图标或文本；加载 skeleton。

输入限制：Title ≤ 40；Bullet ≤ 3 条（超限禁用新增）；CTA 单句。

组件拆分：避免巨型组件；状态下放到具体编辑组件；通过 props 向上汇报变更。

可访问性：按钮 aria-label、表单 label、焦点态。

严格校验与错误码

在 repos/services/adapter 中定义 ErrorCode 与错误消息（校验错误、外键缺失、主键冲突、并发冲突、解析失败、网络错误/超时）。

LLM 解析失败要可恢复，且不污染草稿；给出 UI 提示与再次尝试入口。

特别说明（强调注意事项）

Idea 模型：严禁修改字段或语义。前端仅通过 IdeaRepo 只读访问（可由本地种子镜像）。

所有日期统一 ISO 字符串；ScriptDraft 不得出现 version/versionHistory。

FinalScript 必须保证 versionNumber 递增 与 (finalScriptId, versionNumber) 唯一；发布为只追加写入，不覆盖旧版本。

回滚仅覆盖 ScriptDraft 当前内容，不回写历史版本；回滚后再次发布产生 vN+1。

输出务必是完整可运行的代码（含必要配置与依赖说明）；每个文件以清晰路径注释标识。

如遇第三方 API（星火 x1）无法直接访问，需提供 Mock 分支 保证本地流程可测。

如需占位实现，使用 TODO: 注明扩展点，保证项目能启动且核心流程可演示。

---

**Cursor**

我先会创建一组待办来分解实现步骤，然后读取几条工作区规则（Typed Storage 和可访问性样式）以确保实现符合规范。接着我会并行读取现有的 IndexedDB 封装文件（如果有）和 Tailwind/全局样式等关键文件以决定如何落地新封装与页面结构。随后我会开始按模块依次新增/修改文件。

我先并行读取现有的页面与 IndexedDB 封装等关键文件，确认当前实现与需要新增/修改的范围，然后开始从类型定义入手补充 FourFields 与 FinalScript.finalScriptId。

我先补充类型定义：新增 `FourFields`，为 `FinalScript` 增加 `finalScriptId`、`createdBy?`、`changeLog?`（数组）。随后会创建 `src/lib/idb.ts` 封装并开始仓库层实现。

```typescript
/**
 * 领域模型类型定义
 * 
 * 定义 EchoCast Workshop 核心业务实体类型
 */

/**
 * 创意点子实体
 * 
 * 用于存储用户的创意想法和灵感记录
 */
export interface Idea {
  /** 唯一标识符 */
  id: string
  /** 创意标题 */
  title: string
  /** 创意摘要（可选） */
  summary?: string
  /** 创意内容描述 */
  content: string
  /** 创意标签 */
  tags: string[]
  /** 创意来源（如：text、voice、image 等） */
  source?: 'text' | 'voice'
  /** 是否星标 */
  starred?: boolean
  /** 优先级（1-5，5为最高） */
  priority: number
  /** 创意状态 */
  status: 'draft' | 'reviewed' | 'selected' | 'archived'
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
  /** 附件信息（图片、音频等） */
  attachments?: {
    type: 'image' | 'audio' | 'video' | 'file'
    url: string
    name: string
  }[]
  
  // === 语音收集相关字段 ===
  /** 原始输入文本：文字输入原文或语音转写文本（未优化） */
  rawInputText?: string
  /** 音频 Blob 的引用 ID */
  audioBlobId?: string
  /** 录音 MIME 类型 */
  audioMimeType?: string
  /** 实际录音时长（毫秒） */
  audioDurationMs?: number
  /** 使用的补全模型标识 */
  optimizeModel?: 'x1'
}

/**
 * 文案草稿实体
 * 
 * 用于存储从创意转化而来的文案内容及其版本历史
 */
export interface ScriptDraft {
  /** 唯一标识符 */
  id: string
  /** 关联的创意 ID */
  ideaId: string
  /** 四要素：标题 */
  title: string
  /** 四要素：引子（1-2 句） */
  intro: string
  /** 四要素：要点（最多 3 条，每条一句） */
  bulletPoints: string[]
  /** 四要素：行动号召 */
  cta: string
  /** 冗余：四要素拼接后的全文 */
  content: string
  /** 草稿状态 */
  status: 'draft' | 'reviewing'
  /** 创建时间（ISO 字符串） */
  createdAt: string
  /** 更新时间（ISO 字符串） */
  updatedAt: string
}

/**
 * 音频资产实体
 * 
 * 用于存储音频文件 Blob 数据
 */
export interface IdeaAsset {
  /** 唯一标识符 */
  id: string
  /** 音频 Blob 数据 */
  blob: Blob
  /** MIME 类型 */
  mimeType: string
  /** 音频时长（毫秒） */
  durationMs: number
  /** 文件大小（字节） */
  sizeBytes: number
  /** 创建时间 */
  createdAt: Date
}

/**
 * 文案定稿实体（可版本化）
 * 
 * 每次发布生成一个新版本，按 ideaId 分组递增 versionNumber
 */
export interface FinalScript {
  /** 唯一标识符 */
  id: string
  /** 定稿系列稳定 ID（通常等同于 ideaId，便于按系列聚合） */
  finalScriptId: string
  /** 关联的创意 ID（版本系列分组键） */
  ideaId: string
  /** 版本号（从 1 开始递增） */
  versionNumber: number
  /** 四要素：标题 */
  title: string
  /** 四要素：引子 */
  intro: string
  /** 四要素：要点（最多 3 条） */
  bulletPoints: string[]
  /** 四要素：行动号召 */
  cta: string
  /** 冗余：四要素拼接后的全文 */
  content: string
  /** 定稿状态 */
  status: 'published' | 'archived'
  /** 发布时间（ISO 字符串，可选：仅当 published） */
  publishedAt?: string
  /** 生成溯源信息（模型/人工/规则等） */
  provenance?: {
    generator: 'ai' | 'manual' | 'hybrid'
    model?: string
    modelParams?: Record<string, unknown>
    notes?: string
  }
  /** 变更说明记录 */
  changeLog?: string[]
  /** 创建者（可选） */
  createdBy?: string
  /** 创建时间（ISO 字符串） */
  createdAt: string
  /** 更新时间（ISO 字符串） */
  updatedAt: string
}

/**
 * 多语种版本实体
 * 
 * 用于存储文案的多语种翻译版本和本地化信息
 */
export interface LocaleVariant {
  /** 唯一标识符 */
  id: string
  /** 绑定的定稿 ID */
  finalScriptId: string
  /** 源定稿版本号（与定稿绑定） */
  sourceVersion: number
  /** 语言代码（如：en, ja, ko, es 等） */
  locale: string
  /** 语言显示名称 */
  languageName: string
  /** 翻译后的标题（四要素） */
  title: string
  /** 翻译后的引子 */
  intro: string
  /** 翻译后的要点（最多 3 条） */
  bulletPoints: string[]
  /** 翻译后的行动号召 */
  cta: string
  /** 冗余：四要素拼接后的全文 */
  content: string
  /** 翻译状态 */
  status: 'pending' | 'translated' | 'reviewed' | 'published'
  /** 翻译方式 */
  translationType: 'manual' | 'ai' | 'hybrid'
  /** 本地化信息 */
  localization?: {
    /** 文化适配说明 */
    culturalNotes?: string
    /** 特殊用词处理 */
    terminology?: Record<string, string>
    /** 格式调整说明 */
    formatting?: string
  }
  /** 质量评分（1-10） */
  qualityScore?: number
  /** 创建时间（ISO 字符串） */
  createdAt: string
  /** 更新时间（ISO 字符串） */
  updatedAt: string
}

/**
 * 通用响应类型
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 分页响应结果
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 四要素结构体
 * 
 * 用于 Draft/Final 的核心可编辑字段集合
 */
export interface FourFields {
  /** 标题（≤40，且不以句号结尾） */
  title: string
  /** 引子（1-2 句） */
  intro: string
  /** 要点（≤3 条） */
  bulletPoints: string[]
  /** 行动号召（单句，动词开头） */
  cta: string
}

```

我将并行读取已存在的 API 路由以决定是否复用，随后开始新增 `src/lib/idb.ts`。

我将创建新的 IndexedDB 封装 `src/lib/idb.ts`，定义 stores、索引和基础事务工具，以供后续 repos 使用。

```typescript
// file: src/lib/idb.ts
/**
 * IndexedDB 封装（单一入口）
 * 
 * stores:
 * - ideas           只读镜像/种子
 * - drafts          仅保存最新草稿；ideaId 唯一；支持 updatedAt 倒序
 * - final_scripts   定稿版本追加；(finalScriptId, versionNumber) 唯一
 * - locale_variants 多语绑定（finalScriptId + sourceVersion + locale 唯一）
 */

import type { ScriptDraft, FinalScript, LocaleVariant, Idea } from '@/types/domain'

export const IDB_CONFIG = {
  name: 'echocast_workshop',
  version: 1,
  stores: {
    ideas: 'ideas',
    drafts: 'drafts',
    finalScripts: 'final_scripts',
    localeVariants: 'locale_variants',
  },
} as const

let dbRef: IDBDatabase | null = null

export async function openDatabase(): Promise<IDBDatabase> {
  if (dbRef) return dbRef

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_CONFIG.name, IDB_CONFIG.version)

    request.onerror = () => reject(new Error('IndexedDB 打开失败'))

    request.onupgradeneeded = (ev) => {
      const db = (ev.target as IDBOpenDBRequest).result
      const tr = (ev.target as IDBOpenDBRequest).transaction!

      // ideas
      if (!db.objectStoreNames.contains(IDB_CONFIG.stores.ideas)) {
        const store = db.createObjectStore(IDB_CONFIG.stores.ideas, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('title', 'title', { unique: false })
      }

      // drafts
      if (!db.objectStoreNames.contains(IDB_CONFIG.stores.drafts)) {
        const store = db.createObjectStore(IDB_CONFIG.stores.drafts, { keyPath: 'id' })
        // 一个 idea 仅允许一份草稿
        store.createIndex('ideaId', 'ideaId', { unique: true })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
        store.createIndex('status', 'status', { unique: false })
      } else {
        const store = tr.objectStore(IDB_CONFIG.stores.drafts)
        safeRecreateIndex(store, 'ideaId', 'ideaId', { unique: true })
        safeRecreateIndex(store, 'updatedAt', 'updatedAt', { unique: false })
        safeRecreateIndex(store, 'status', 'status', { unique: false })
      }

      // final_scripts
      if (!db.objectStoreNames.contains(IDB_CONFIG.stores.finalScripts)) {
        const store = db.createObjectStore(IDB_CONFIG.stores.finalScripts, { keyPath: 'id' })
        store.createIndex('finalScriptId', 'finalScriptId', { unique: false })
        store.createIndex('ideaId', 'ideaId', { unique: false })
        store.createIndex('versionNumber', 'versionNumber', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
        store.createIndex('publishedAt', 'publishedAt', { unique: false })
        // 组合唯一键：确保同系列版本号不重复
        store.createIndex('seriesVersionKey', 'seriesVersionKey', { unique: true })
      } else {
        const store = tr.objectStore(IDB_CONFIG.stores.finalScripts)
        safeRecreateIndex(store, 'finalScriptId', 'finalScriptId', { unique: false })
        safeRecreateIndex(store, 'ideaId', 'ideaId', { unique: false })
        safeRecreateIndex(store, 'versionNumber', 'versionNumber', { unique: false })
        safeRecreateIndex(store, 'updatedAt', 'updatedAt', { unique: false })
        safeRecreateIndex(store, 'publishedAt', 'publishedAt', { unique: false })
        safeRecreateIndex(store, 'seriesVersionKey', 'seriesVersionKey', { unique: true })
      }

      // locale_variants
      if (!db.objectStoreNames.contains(IDB_CONFIG.stores.localeVariants)) {
        const store = db.createObjectStore(IDB_CONFIG.stores.localeVariants, { keyPath: 'id' })
        store.createIndex('finalScriptId', 'finalScriptId', { unique: false })
        store.createIndex('sourceVersion', 'sourceVersion', { unique: false })
        store.createIndex('locale', 'locale', { unique: false })
        // 唯一：每个定稿版本每个 locale 仅一份
        store.createIndex('finalLocaleKey', 'finalLocaleKey', { unique: true })
      } else {
        const store = tr.objectStore(IDB_CONFIG.stores.localeVariants)
        safeRecreateIndex(store, 'finalScriptId', 'finalScriptId', { unique: false })
        safeRecreateIndex(store, 'sourceVersion', 'sourceVersion', { unique: false })
        safeRecreateIndex(store, 'locale', 'locale', { unique: false })
        safeRecreateIndex(store, 'finalLocaleKey', 'finalLocaleKey', { unique: true })
      }
    }

    request.onsuccess = () => {
      dbRef = request.result
      resolve(dbRef)
    }
  })
}

function safeRecreateIndex(store: IDBObjectStore, name: string, keyPath: string | string[], options?: IDBIndexParameters) {
  try { store.deleteIndex(name) } catch {}
  store.createIndex(name, keyPath as any, options)
}

export type StoreName = typeof IDB_CONFIG.stores[keyof typeof IDB_CONFIG.stores]

export async function withRead<T>(storeName: StoreName, fn: (store: IDBObjectStore) => T | Promise<T>): Promise<T> {
  const db = await openDatabase()
  const tx = db.transaction([storeName], 'readonly')
  const store = tx.objectStore(storeName)
  const res = await fn(store)
  await txDone(tx)
  return res
}

export async function withWrite<T>(storeName: StoreName, fn: (store: IDBObjectStore) => T | Promise<T>): Promise<T> {
  const db = await openDatabase()
  const tx = db.transaction([storeName], 'readwrite')
  const store = tx.objectStore(storeName)
  const res = await fn(store)
  await txDone(tx)
  return res
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('事务失败'))
    tx.onabort = () => reject(tx.error || new Error('事务中止'))
  })
}

// =============== 基础读写工具 ===============

export function idbAdd<T>(store: IDBObjectStore, value: T): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const req = store.add(value as any)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('add 失败'))
  })
}

export function idbPut<T>(store: IDBObjectStore, value: T): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const req = store.put(value as any)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('put 失败'))
  })
}

export function idbGet<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error || new Error('get 失败'))
  })
}

export function idbIndexGetAll<T>(store: IDBObjectStore, indexName: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const idx = store.index(indexName)
    const req = query === undefined ? idx.getAll() : idx.getAll(query)
    req.onsuccess = () => resolve((req.result || []) as T[])
    req.onerror = () => reject(req.error || new Error('index.getAll 失败'))
  })
}

export function idbGetAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve((req.result || []) as T[])
    req.onerror = () => reject(req.error || new Error('getAll 失败'))
  })
}

// =============== 辅助构造字段 ===============

export function buildSeriesVersionKey(finalScriptId: string, versionNumber: number): string {
  return `${finalScriptId}#${versionNumber}`
}

export function buildFinalLocaleKey(finalScriptId: string, sourceVersion: number, locale: string): string {
  return `${finalScriptId}#${sourceVersion}#${locale}`
}
```

我将开始实现仓库层（idea/draft/final/locale）以支撑页面与服务调用。

```typescript
// file: src/lib/repos/idea-repo.ts
import { withRead, withWrite, IDB_CONFIG, idbGet, idbGetAll, idbAdd } from '@/lib/idb'
import type { Idea } from '@/types/domain'

export async function getById(id: string): Promise<Idea | null> {
  return withRead<Idea | null>(IDB_CONFIG.stores.ideas, async (store) => {
    const item = await idbGet<Idea>(store, id)
    return item ?? null
  })
}

export async function search(keyword: string): Promise<Idea[]> {
  const q = keyword.trim().toLowerCase()
  if (!q) {
    return withRead<Idea[]>(IDB_CONFIG.stores.ideas, (store) => idbGetAll<Idea>(store))
  }
  const items = await withRead<Idea[]>(IDB_CONFIG.stores.ideas, (store) => idbGetAll<Idea>(store))
  return items.filter((i) =>
    i.title.toLowerCase().includes(q) ||
    (i.summary?.toLowerCase().includes(q) ?? false) ||
    i.tags.some((t) => t.toLowerCase().includes(q))
  )
}

export async function seed(ideas: Idea[]): Promise<void> {
  // 仅在空库时注入
  const existing = await withRead<Idea[]>(IDB_CONFIG.stores.ideas, (store) => idbGetAll<Idea>(store))
  if (existing.length > 0) return
  await withWrite<void>(IDB_CONFIG.stores.ideas, async (store) => {
    for (const idea of ideas) {
      await idbAdd(store, idea)
    }
  })
}
```

```typescript
// file: src/lib/repos/draft-repo.ts
import { withRead, withWrite, IDB_CONFIG, idbGet, idbPut, idbAdd, idbGetAll } from '@/lib/idb'
import type { ScriptDraft } from '@/types/domain'

export async function getById(id: string): Promise<ScriptDraft | null> {
  return withRead<ScriptDraft | null>(IDB_CONFIG.stores.drafts, async (store) => {
    const item = await idbGet<ScriptDraft>(store, id)
    return item ?? null
  })
}

export async function findByIdeaId(ideaId: string): Promise<ScriptDraft | null> {
  const items = await withRead<ScriptDraft[]>(IDB_CONFIG.stores.drafts, (store) => idbGetAll<ScriptDraft>(store))
  return items.find((d) => d.ideaId === ideaId) ?? null
}

export async function listByUpdatedDesc(): Promise<ScriptDraft[]> {
  const rows = await withRead<ScriptDraft[]>(IDB_CONFIG.stores.drafts, (store) => idbGetAll<ScriptDraft>(store))
  return rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function create(draft: Omit<ScriptDraft, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScriptDraft> {
  const now = new Date().toISOString()
  const record: ScriptDraft = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...draft }
  await withWrite(IDB_CONFIG.stores.drafts, (store) => idbAdd(store, record))
  return record
}

export async function save(draft: ScriptDraft): Promise<ScriptDraft> {
  const next: ScriptDraft = { ...draft, updatedAt: new Date().toISOString() }
  await withWrite(IDB_CONFIG.stores.drafts, (store) => idbPut(store, next))
  return next
}

export async function upsertByIdeaId(partial: Omit<ScriptDraft, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScriptDraft> {
  const existing = await findByIdeaId(partial.ideaId)
  if (!existing) {
    return create(partial)
  }
  const merged: ScriptDraft = {
    ...existing,
    ...partial,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }
  await withWrite(IDB_CONFIG.stores.drafts, (store) => idbPut(store, merged))
  return merged
}

export async function remove(id: string): Promise<void> {
  await withWrite(IDB_CONFIG.stores.drafts, (store) => new Promise<void>((resolve, reject) => {
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error || new Error('delete 失败'))
  }))
}
```

```typescript
// file: src/lib/repos/final-repo.ts
import { withRead, withWrite, IDB_CONFIG, idbAdd, idbGetAll, idbGet, idbPut, buildSeriesVersionKey } from '@/lib/idb'
import type { FinalScript } from '@/types/domain'

export interface SeriesMeta {
  finalScriptId: string
  ideaId: string
  maxVersion: number
  updatedAt: string
}

export async function listByUpdatedAtDesc(): Promise<SeriesMeta[]> {
  const items = await withRead<FinalScript[]>(IDB_CONFIG.stores.finalScripts, (store) => idbGetAll<FinalScript>(store))
  const grouped = new Map<string, FinalScript[]>()
  for (const it of items) {
    const arr = grouped.get(it.finalScriptId) || []
    arr.push(it)
    grouped.set(it.finalScriptId, arr)
  }
  const metas: SeriesMeta[] = []
  for (const [seriesId, arr] of grouped) {
    const sorted = arr.slice().sort((a, b) => a.versionNumber - b.versionNumber)
    const maxVersion = sorted[sorted.length - 1]?.versionNumber ?? 0
    const updatedAt = sorted[sorted.length - 1]?.updatedAt ?? new Date().toISOString()
    metas.push({ finalScriptId: seriesId, ideaId: sorted[0].ideaId, maxVersion, updatedAt })
  }
  return metas.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function getSeriesVersions(finalScriptId: string): Promise<FinalScript[]> {
  const items = await withRead<FinalScript[]>(IDB_CONFIG.stores.finalScripts, (store) => idbGetAll<FinalScript>(store))
  return items.filter((i) => i.finalScriptId === finalScriptId).sort((a, b) => a.versionNumber - b.versionNumber)
}

export async function getVersion(finalScriptId: string, versionNumber: number): Promise<FinalScript | null> {
  const list = await getSeriesVersions(finalScriptId)
  return list.find((v) => v.versionNumber === versionNumber) ?? null
}

export async function getMaxVersion(finalScriptId: string): Promise<number> {
  const list = await getSeriesVersions(finalScriptId)
  return list.reduce((m, v) => Math.max(m, v.versionNumber), 0)
}

export async function appendVersion(input: Omit<FinalScript, 'id' | 'createdAt' | 'updatedAt' | 'versionNumber'>, versionNumber?: number): Promise<FinalScript> {
  const now = new Date().toISOString()
  let assigned = versionNumber
  if (typeof assigned !== 'number' || assigned <= 0) {
    const currentMax = await getMaxVersion(input.finalScriptId)
    assigned = currentMax + 1
  }
  const record: FinalScript = {
    ...input,
    id: crypto.randomUUID(),
    versionNumber: assigned!,
    createdAt: now,
    updatedAt: now,
    // @ts-expect-error synthetic index key for unique constraint
    seriesVersionKey: buildSeriesVersionKey(input.finalScriptId, assigned!),
  }
  await withWrite(IDB_CONFIG.stores.finalScripts, (store) => idbAdd(store, record as any))
  return record
}
```

```typescript
// file: src/lib/repos/locale-repo.ts
import { withRead, withWrite, IDB_CONFIG, idbAdd, idbGetAll, buildFinalLocaleKey } from '@/lib/idb'
import type { LocaleVariant } from '@/types/domain'

export async function listByFinal(finalScriptId: string, sourceVersion?: number): Promise<LocaleVariant[]> {
  const items = await withRead<LocaleVariant[]>(IDB_CONFIG.stores.localeVariants, (store) => idbGetAll<LocaleVariant>(store))
  return items.filter((l) => l.finalScriptId === finalScriptId && (sourceVersion ? l.sourceVersion === sourceVersion : true))
}

export async function addLocaleVariant(input: Omit<LocaleVariant, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocaleVariant> {
  const now = new Date().toISOString()
  const record: LocaleVariant = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    // @ts-expect-error synthetic
    finalLocaleKey: buildFinalLocaleKey(input.finalScriptId, input.sourceVersion, input.locale),
  }
  await withWrite(IDB_CONFIG.stores.localeVariants, (store) => idbAdd(store, record as any))
  return record
}
```

我将实现服务层：发布与回滚，以及 diff 工具；随后再补 LLM 适配与 UI。

---

**User**

请你继续你的任务

---

**Cursor**

我先实现服务层：发布、回滚和 diff；随后并行新增 LLM 适配与基础 utils（format/validation/hotkeys），以便后续页面与组件直接调用。

```typescript
// file: src/lib/services/errors.ts
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNIQUE_VIOLATION'
  | 'CONCURRENCY_RETRY_EXCEEDED'
  | 'FOREIGN_KEY_MISSING'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'PARSE_ERROR'

export class AppError extends Error {
  code: ErrorCode
  cause?: unknown
  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message)
    this.code = code
    this.cause = cause
    this.name = 'AppError'
  }
}

export function isAppError(err: unknown, code?: ErrorCode): err is AppError {
  return (
    err instanceof AppError && (code ? err.code === code : true)
  )
}

export function createConflict(message: string, cause?: unknown) {
  return new AppError('CONFLICT', message, cause)
}

export function createNotFound(message: string) {
  return new AppError('NOT_FOUND', message)
}

export function createValidation(message: string) {
  return new AppError('VALIDATION_ERROR', message)
}

export function createParseError(message: string, cause?: unknown) {
  return new AppError('PARSE_ERROR', message, cause)
}
```

```typescript
// file: src/lib/services/diff.ts
import type { ScriptDraft, FinalScript } from '@/types/domain'

export interface DiffFieldChange<T> {
  field: keyof Pick<ScriptDraft, 'title' | 'intro' | 'bulletPoints' | 'cta' | 'content'>
  before: T | undefined
  after: T | undefined
  changed: boolean
}

export interface DiffResult {
  changes: Array<
    | DiffFieldChange<string>
    | DiffFieldChange<string[]>
  >
  hasChanges: boolean
}

function fieldChanged(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return true
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return true
    }
    return false
  }
  return a !== b
}

export function diffDraftWithFinal(draft: ScriptDraft, final?: FinalScript | null): DiffResult {
  const changes: DiffResult['changes'] = []
  const pairs: Array<DiffFieldChange<any>> = [
    { field: 'title', before: final?.title, after: draft.title, changed: false },
    { field: 'intro', before: final?.intro, after: draft.intro, changed: false },
    { field: 'bulletPoints', before: final?.bulletPoints, after: draft.bulletPoints, changed: false },
    { field: 'cta', before: final?.cta, after: draft.cta, changed: false },
    { field: 'content', before: final?.content, after: draft.content, changed: false },
  ]
  for (const p of pairs) {
    p.changed = fieldChanged(p.before, p.after)
    changes.push(p)
  }
  return { changes, hasChanges: changes.some((c) => c.changed) }
}

export function diffFinalVsFinal(a: FinalScript, b: FinalScript): DiffResult {
  const changes: DiffResult['changes'] = []
  const pairs: Array<DiffFieldChange<any>> = [
    { field: 'title', before: a.title, after: b.title, changed: false },
    { field: 'intro', before: a.intro, after: b.intro, changed: false },
    { field: 'bulletPoints', before: a.bulletPoints, after: b.bulletPoints, changed: false },
    { field: 'cta', before: a.cta, after: b.cta, changed: false },
    { field: 'content', before: a.content, after: b.content, changed: false },
  ]
  for (const p of pairs) {
    p.changed = fieldChanged(p.before, p.after)
    changes.push(p)
  }
  return { changes, hasChanges: changes.some((c) => c.changed) }
}
```

```typescript
// file: src/lib/services/publishDraft.ts
import type { FinalScript, ScriptDraft } from '@/types/domain'
import * as DraftRepo from '@/lib/repos/draft-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import { AppError } from './errors'

const MAX_RETRY = 3

export async function publishDraft(ideaId: string, createdBy?: string): Promise<FinalScript> {
  // 读取草稿
  const draft = await DraftRepo.findByIdeaId(ideaId)
  if (!draft) {
    throw new AppError('NOT_FOUND', '草稿不存在')
  }

  const finalScriptId = ideaId // 系列稳定 ID 采用 ideaId

  // 计算冗余 content
  const content = buildContent(draft)

  // 重试追加版本（主键冲突）
  let lastErr: unknown
  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    try {
      const nextVersion = (await FinalRepo.getMaxVersion(finalScriptId)) + 1
      const record: Omit<FinalScript, 'id' | 'createdAt' | 'updatedAt' | 'versionNumber'> = {
        finalScriptId,
        ideaId,
        title: draft.title,
        intro: draft.intro,
        bulletPoints: draft.bulletPoints,
        cta: draft.cta,
        content,
        status: 'published',
        publishedAt: new Date().toISOString(),
        createdBy,
      }
      return await FinalRepo.appendVersion(record, nextVersion)
    } catch (err) {
      lastErr = err
      // 指数退避：50ms, 100ms, 200ms
      await delay(50 * Math.pow(2, attempt))
    }
  }
  throw new AppError('CONCURRENCY_RETRY_EXCEEDED', '发布失败：并发冲突重试超限', lastErr)
}

function buildContent(d: ScriptDraft): string {
  const parts: string[] = []
  if (d.title) parts.push(`# ${d.title}`)
  if (d.intro) parts.push(d.intro)
  if (d.bulletPoints?.length) {
    parts.push(...d.bulletPoints.map((b) => `- ${b}`))
  }
  if (d.cta) parts.push(`CTA: ${d.cta}`)
  return parts.join('\n')
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)) }
```

```typescript
// file: src/lib/services/rollbackToVersion.ts
import * as DraftRepo from '@/lib/repos/draft-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import type { ScriptDraft } from '@/types/domain'
import { AppError } from './errors'

export async function rollbackToVersion(finalScriptId: string, versionNumber: number): Promise<ScriptDraft> {
  const version = await FinalRepo.getVersion(finalScriptId, versionNumber)
  if (!version) throw new AppError('NOT_FOUND', '指定的定稿版本不存在')

  const existing = await DraftRepo.findByIdeaId(version.ideaId)
  const payload = {
    ideaId: version.ideaId,
    title: version.title,
    intro: version.intro,
    bulletPoints: version.bulletPoints,
    cta: version.cta,
    content: version.content,
    status: 'draft' as const,
  }
  if (!existing) {
    return DraftRepo.create(payload)
  }
  const merged: ScriptDraft = {
    ...existing,
    ...payload,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }
  return DraftRepo.save(merged)
}
```

我将并行新增 LLM 适配与基础工具模块（format/validation/hotkeys），以及 Toast Provider 与 Client 端种子注入组件，供后续页面与组件使用。

```typescript
// file: src/lib/llm/spark-x1.ts
import { simpleChat } from '@/lib/ai/x1Chat'
import type { FourFields, Idea, ScriptDraft } from '@/types/domain'
import { AppError, createParseError } from '@/lib/services/errors'

export type GenerateMode = 'normalize' | 'enhance'

export interface GenerateParams {
  idea: Pick<Idea, 'id' | 'title' | 'summary' | 'rawInputText' | 'source' | 'createdAt'>
  draft: Pick<ScriptDraft, 'title' | 'intro' | 'bulletPoints' | 'cta' | 'content'>
  suggestion?: string
  mode: GenerateMode
}

export async function generateStructuredDraft(params: GenerateParams): Promise<FourFields> {
  const useMock = !process.env.NEXT_PUBLIC_SPARK_API_KEY
  if (useMock) {
    return mockGenerate(params)
  }

  const system = buildSystemPrompt(params.mode)
  const user = buildUserPrompt(params)

  // 首次请求
  const first = await callLLM(system, user)
  const parsed1 = tryParseFourFields(first)
  if (parsed1) return parsed1

  // 自纠重试一次
  const repair = await callLLM(system, `${user}\n\n严格要求：仅输出合法 JSON，键为 title/intro/bulletPoints/cta。不得包含额外文本。`)
  const parsed2 = tryParseFourFields(repair)
  if (parsed2) return parsed2

  throw createParseError('LLM 返回无法解析为四要素 JSON')
}

async function callLLM(system: string, user: string): Promise<string> {
  try {
    const res = await simpleChat(user, system, { temperature: 0.3, maxTokens: 800, timeout: 30000 })
    return res.text || ''
  } catch (e) {
    throw new AppError('NETWORK_ERROR', 'LLM 调用失败', e)
  }
}

function buildSystemPrompt(mode: GenerateMode): string {
  const policy = mode === 'normalize'
    ? '仅结构化并轻度润色，不得新增事实。'
    : '可在保持事实前提下补全骨架，不得虚构事实。'
  return `你是资深文案编辑，请将输入内容转换为【四要素 JSON】并遵循以下规则：\n\n要求：\n- 仅输出 JSON：{ "title", "intro", "bulletPoints", "cta" } 四个键\n- title：≤40 字，且不得以句号结尾\n- intro：1–2 句\n- bulletPoints：数组，≤3 条；每条 ≤80 字符，独立成句\n- cta：动词开头，单句\n- 模式：${policy}\n- 不要输出除 JSON 以外的任何文本`
}

function buildUserPrompt({ idea, draft, suggestion }: GenerateParams): string {
  const ideaCore = {
    title: idea.title,
    summary: idea.summary ?? idea.rawInputText ?? '',
    source: idea.source,
    createdAt: idea.createdAt,
  }
  const draftCore = {
    title: draft.title,
    intro: draft.intro,
    bulletPoints: draft.bulletPoints,
    cta: draft.cta,
  }
  return `【点子核心】\n${JSON.stringify(ideaCore, null, 2)}\n\n【当前草稿】\n${JSON.stringify(draftCore, null, 2)}\n\n【用户建议】\n${suggestion || '（无）'}\n`
}

function tryParseFourFields(text: string): FourFields | null {
  const cleaned = stripFences(text.trim())
  // 1) 直接 JSON.parse
  const direct = safeParse(cleaned)
  if (direct) return normalizeFourFields(direct)
  // 2) 从文本中提取最近的 JSON 代码块
  const extracted = extractJson(cleaned)
  if (extracted) {
    const p = safeParse(extracted)
    if (p) return normalizeFourFields(p)
  }
  return null
}

function stripFences(t: string): string {
  return t.replace(/^```[a-zA-Z]*\n?/g, '').replace(/```$/g, '')
}

function extractJson(t: string): string | null {
  const match = t.match(/\{[\s\S]*\}/)
  return match ? match[0] : null
}

function safeParse(t: string): any | null {
  try {
    return JSON.parse(t)
  } catch {
    return null
  }
}

function normalizeFourFields(obj: any): FourFields {
  if (!obj || typeof obj !== 'object') throw createParseError('结果不是对象')
  const title = String(obj.title ?? '').trim()
  const intro = String(obj.intro ?? '').trim()
  const bulletPoints = Array.isArray(obj.bulletPoints) ? obj.bulletPoints.map((x: any) => String(x).trim()).slice(0, 3) : []
  const cta = String(obj.cta ?? '').trim()
  if (!title || !intro || !cta) throw createParseError('缺少必需字段')
  return { title, intro, bulletPoints, cta }
}

function mockGenerate(params: GenerateParams): FourFields {
  const base = params.draft
  const suffix = params.mode === 'enhance' ? '（增强版）' : '（整理版）'
  return {
    title: (base.title || params.idea.title || '未命名草稿').slice(0, 40).replace(/[。.]$/g, '') + suffix,
    intro: base.intro || (params.idea.summary || '基于点子的梳理版本。'),
    bulletPoints: base.bulletPoints && base.bulletPoints.length > 0 ? base.bulletPoints.slice(0, 3) : [
      '要点一：围绕创意的核心价值展开。',
      '要点二：强调听众能获得的收获。',
    ],
    cta: base.cta || '现在就开始行动吧',
  }
}
```

```typescript
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
```

```typescript
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
```

```typescript
// file: src/utils/hotkeys.ts
'use client'
import { useEffect } from 'react'

export function useSaveHotkey(onSave: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        onSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSave])
}

export function handleTextareaEnter(e: React.KeyboardEvent<HTMLTextAreaElement>, submit: () => void) {
  if (e.key === 'Enter') {
    if (e.shiftKey) return // 换行
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      submit()
      return
    }
    // 默认 Enter 提交
    e.preventDefault()
    submit()
  }
}
```

```typescriptreact
// file: src/components/Toast.tsx
'use client'
import React, { createContext, useCallback, useContext, useState } from 'react'

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem { id: string; kind: ToastKind; message: string }

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = crypto.randomUUID()
    setItems((prev) => [...prev, { id, kind, message }])
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {items.map((t) => (
          <div key={t.id} role="status" className={
            `min-w-[240px] px-4 py-3 rounded shadow text-white ` +
            (t.kind === 'success' ? 'bg-green-600' : t.kind === 'error' ? 'bg-red-600' : 'bg-gray-800')
          }>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
```

```typescriptreact
// file: src/app/ClientBootstrap.tsx
'use client'
import { useEffect } from 'react'
import { openDatabase } from '@/lib/idb'
import { seed as seedIdeas } from '@/lib/repos/idea-repo'
import { defaultSeed } from '@/mock/seed'

export default function ClientBootstrap() {
  useEffect(() => {
    openDatabase().then(async () => {
      await seedIdeas(defaultSeed.ideas)
      // 其他种子由页面首次访问时按需注入
    })
  }, [])
  return null
}
```

```typescript
// file: src/mock/seed.ts
import type { Idea, ScriptDraft, FinalScript } from '@/types/domain'

const nowIso = () => new Date().toISOString()

export const defaultSeed: {
  ideas: Idea[]
  draft?: ScriptDraft
  finals?: FinalScript[]
} = {
  ideas: [
    {
      id: 'idea-1',
      title: '远程办公效率提升技巧',
      summary: '分享工具与方法，提升远程团队协作效率',
      content: '围绕远程办公的习惯与流程优化',
      tags: ['效率', '远程办公'],
      source: 'text',
      starred: true,
      priority: 3,
      status: 'reviewed',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'idea-2',
      title: 'AI 写作实践',
      summary: '如何与大模型协作，提升创作效率',
      content: '示例与最佳实践',
      tags: ['AI', '写作'],
      source: 'text',
      priority: 4,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'idea-3',
      title: '音频剪辑流程优化',
      summary: '从录音到发布的高效流程',
      content: '软件选择与预设模板',
      tags: ['音频', '流程'],
      source: 'text',
      priority: 2,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  draft: {
    id: 'draft-1',
    ideaId: 'idea-1',
    title: '远程办公效率提升技巧（初稿）',
    intro: '针对远程团队的协作障碍，提供一套可落地的方法。',
    bulletPoints: ['工具与流程', '沟通与节奏'],
    cta: '立即应用到你的团队',
    content: '# 远程办公效率提升技巧\n针对远程团队的协作障碍，提供一套可落地的方法。\n- 工具与流程\n- 沟通与节奏\nCTA: 立即应用到你的团队',
    status: 'draft',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  finals: [
    {
      id: 'final-1',
      finalScriptId: 'idea-1',
      ideaId: 'idea-1',
      versionNumber: 1,
      title: '远程办公效率提升技巧',
      intro: '从工具、流程与沟通三方面入手，系统提升远程协作效率。',
      bulletPoints: ['工具与流程选择', '沟通节奏与文档协作', '度量与复盘'],
      cta: '从今天开始优化你的远程工作方式',
      content: '# 远程办公效率提升技巧\n从工具、流程与沟通三方面入手，系统提升远程协作效率。\n- 工具与流程选择\n- 沟通节奏与文档协作\n- 度量与复盘\nCTA: 从今天开始优化你的远程工作方式',
      status: 'published',
      publishedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: 'final-2',
      finalScriptId: 'idea-1',
      ideaId: 'idea-1',
      versionNumber: 2,
      title: '远程办公效率提升的三把钥匙',
      intro: '以最小投入提升协作效率，专注于关键环节。',
      bulletPoints: ['工具预设', '沟通准则', '节奏优先'],
      cta: '为团队制定一套协作准则',
      content: '# 远程办公效率提升的三把钥匙\n以最小投入提升协作效率，专注于关键环节。\n- 工具预设\n- 沟通准则\n- 节奏优先\nCTA: 为团队制定一套协作准则',
      status: 'published',
      publishedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ],
}
```

```typescriptreact
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import TopNav from '@/components/TopNav'
import { ToastProvider } from '@/components/Toast'
import ClientBootstrap from '@/app/ClientBootstrap'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EchoCast Workshop',
  description: '内容创作与多语种处理工作台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className={inter.className}>
        <ToastProvider>
          <ClientBootstrap />
          <TopNav />
          <main>
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  )
}

```

我将先删除旧的 `src/app/drafts/page.tsx` 防止路由冲突，并创建新的 `(nav)` 分组下的页面和所需组件。随后我会更新 `ClientBootstrap` 以注入完整的草稿与定稿种子。

我将删除旧的草稿页面以避免路由冲突，并新增分组路由下的页面与所需组件。随后更新种子注入逻辑。

我将创建草稿与定稿相关的页面和组件，并更新种子注入逻辑，确保页面可从 IndexedDB 读取与写入。

```typescriptreact
// file: src/components/IdeaSummary.tsx
'use client'
import type { Idea } from '@/types/domain'
import { formatRelativeTime } from '@/utils/format'

export default function IdeaSummary({ idea }: { idea: Idea }) {
  const createdAtIso = new Date(idea.createdAt).toISOString()
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{idea.title}</h2>
          <p className="text-sm text-gray-500 mt-1">来源：{idea.source || 'text'} · 创建于 {formatRelativeTime(createdAtIso)}</p>
        </div>
      </div>
      <div className="mt-3 text-gray-700 text-sm leading-6">
        {idea.summary || idea.rawInputText || '（无摘要）'}
      </div>
    </div>
  )
}
```

```typescriptreact
// file: src/components/BulletPointsEditor.tsx
'use client'
import { BULLET_MAX, BULLET_LEN_MAX } from '@/utils/validation'

export default function BulletPointsEditor({
  points,
  onChange,
}: {
  points: string[]
  onChange: (next: string[]) => void
}) {
  function update(index: number, value: string) {
    const next = [...points]
    next[index] = value
    onChange(next)
  }
  function add() {
    if (points.length >= BULLET_MAX) return
    onChange([...points, ''])
  }
  function remove(index: number) {
    const next = points.filter((_, i) => i !== index)
    onChange(next)
  }
  function move(index: number, dir: -1 | 1) {
    const i2 = index + dir
    if (i2 < 0 || i2 >= points.length) return
    const next = [...points]
    const t = next[index]
    next[index] = next[i2]
    next[i2] = t
    onChange(next)
  }
  return (
    <div className="space-y-2">
      {points.map((p, i) => (
        <div key={i} className="flex items-start gap-2">
          <textarea
            aria-label={`要点 ${i + 1}`}
            className="flex-1 border rounded p-2 text-sm"
            rows={2}
            maxLength={BULLET_LEN_MAX}
            value={p}
            onChange={(e) => update(i, e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <button className="px-2 py-1 text-xs bg-gray-100 rounded" onClick={() => move(i, -1)} aria-label="上移">↑</button>
            <button className="px-2 py-1 text-xs bg-gray-100 rounded" onClick={() => move(i, 1)} aria-label="下移">↓</button>
            <button className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded" onClick={() => remove(i)} aria-label="删除">删</button>
          </div>
        </div>
      ))}
      <button
        className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
        onClick={add}
        disabled={points.length >= BULLET_MAX}
        aria-label="新增要点"
      >新增要点</button>
    </div>
  )
}
```

```typescriptreact
// file: src/components/DraftEditor.tsx
'use client'
import type { ScriptDraft } from '@/types/domain'
import BulletPointsEditor from './BulletPointsEditor'
import { TITLE_MAX, validateTitle, validateBulletPoints, validateCTA } from '@/utils/validation'

export default function DraftEditor({
  draft,
  onChange,
}: {
  draft: ScriptDraft
  onChange: (next: ScriptDraft) => void
}) {
  const titleError = draft.title ? validateTitle(draft.title) : null
  const bulletError = validateBulletPoints(draft.bulletPoints || [])
  const ctaError = draft.cta ? validateCTA(draft.cta) : null

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">标题</label>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value.slice(0, TITLE_MAX) })}
          className="mt-1 w-full border rounded px-3 py-2"
          aria-invalid={!!titleError}
          aria-describedby="title-hint"
          placeholder="不超过 40 字，且不要句号结尾"
        />
        <p id="title-hint" className={`mt-1 text-xs ${titleError ? 'text-red-600' : 'text-gray-500'}`}>{titleError || `最多 ${TITLE_MAX} 字`}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">引子（1–2 句）</label>
        <textarea
          rows={3}
          value={draft.intro}
          onChange={(e) => onChange({ ...draft, intro: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
          placeholder="简述核心价值与听众收益"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">要点（最多 3 条）</label>
        <BulletPointsEditor
          points={draft.bulletPoints || []}
          onChange={(next) => onChange({ ...draft, bulletPoints: next })}
        />
        {bulletError && <p className="mt-1 text-xs text-red-600">{bulletError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">CTA（动词开头，单句）</label>
        <input
          type="text"
          value={draft.cta}
          onChange={(e) => onChange({ ...draft, cta: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
          aria-invalid={!!ctaError}
          placeholder="例如：立即开始尝试"
        />
        {ctaError && <p className="mt-1 text-xs text-red-600">{ctaError}</p>}
      </div>
    </div>
  )
}
```

```typescriptreact
// file: src/components/IdeasModal.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import * as DraftRepo from '@/lib/repos/draft-repo'
import type { Idea } from '@/types/domain'
import { useRouter } from 'next/navigation'

export default function IdeasModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [keyword, setKeyword] = useState('')
  const [onlyWithoutDraft, setOnlyWithoutDraft] = useState(true)
  const [items, setItems] = useState<Idea[]>([])
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    IdeaRepo.search(keyword).then((res) => setItems(res))
  }, [open, keyword])

  const filtered = useMemo(() => items, [items])

  async function choose(idea: Idea) {
    const existing = await DraftRepo.findByIdeaId(idea.id)
    if (existing) {
      onClose()
      router.push(`/drafts/${existing.id}`)
      return
    }
    const draft = await DraftRepo.create({
      ideaId: idea.id,
      title: '',
      intro: '',
      bulletPoints: [],
      cta: '',
      content: '',
      status: 'draft',
    })
    onClose()
    router.push(`/drafts/${draft.id}`)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">选择点子</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="关闭">✕</button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="搜索关键词"
            aria-label="搜索"
          />
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={onlyWithoutDraft} onChange={(e) => setOnlyWithoutDraft(e.target.checked)} />
            仅显示尚未创建草稿的点子
          </label>
        </div>

        <div className="mt-4 max-h-80 overflow-auto divide-y">
          {filtered.length === 0 && (
            <div className="text-gray-500 text-sm py-8 text-center">无匹配点子</div>
          )}
          {filtered.map((idea) => (
            <button key={idea.id} onClick={() => choose(idea)} className="w-full text-left py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none px-2 rounded">
              <div className="font-medium text-gray-900">{idea.title}</div>
              <div className="text-sm text-gray-600 line-clamp-2">{idea.summary || idea.rawInputText}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

```typescriptreact
// file: src/components/VersionBadge.tsx
'use client'
import Link from 'next/link'

export default function VersionBadge({ finalScriptId, versionNumber, updatedAt }: { finalScriptId: string; versionNumber: number; updatedAt?: string }) {
  return (
    <Link href={`/finals/${finalScriptId}`} className="inline-flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100">
      <span>最新定稿：v{versionNumber}</span>
      {updatedAt && <span className="text-blue-500">{new Date(updatedAt).toLocaleString()}</span>}
    </Link>
  )
}
```

```typescriptreact
// file: src/components/SuggestBox.tsx
'use client'
import { useState } from 'react'
import type { Idea, ScriptDraft } from '@/types/domain'
import { generateStructuredDraft, type GenerateMode } from '@/lib/llm/spark-x1'
import { handleTextareaEnter } from '@/utils/hotkeys'
import { useToast } from './Toast'

export default function SuggestBox({ idea, draft, onApply }: { idea: Idea; draft: ScriptDraft; onApply: (four: { title: string; intro: string; bulletPoints: string[]; cta: string }) => void }) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<GenerateMode>('normalize')
  const [loading, setLoading] = useState(false)
  const { show } = useToast()

  async function submit() {
    setLoading(true)
    try {
      const four = await generateStructuredDraft({ idea: {
        id: idea.id,
        title: idea.title,
        summary: idea.summary,
        rawInputText: idea.rawInputText,
        source: idea.source,
        createdAt: idea.createdAt,
      }, draft: {
        title: draft.title,
        intro: draft.intro,
        bulletPoints: draft.bulletPoints,
        cta: draft.cta,
        content: draft.content,
      }, suggestion: text, mode })
      onApply(four)
      show(process.env.NEXT_PUBLIC_SPARK_API_KEY ? '已应用模型建议' : '已应用 Mock 响应', 'success')
    } catch (e) {
      show('生成失败，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm">
            <input type="radio" name="mode" value="normalize" checked={mode==='normalize'} onChange={() => setMode('normalize')} /> 结构化/轻润色
          </label>
          <label className="text-sm">
            <input type="radio" name="mode" value="enhance" checked={mode==='enhance'} onChange={() => setMode('enhance')} /> 增强（不虚构）
          </label>
        </div>
        <button className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50" onClick={submit} disabled={loading} aria-label="提交建议">
          {loading ? '生成中…' : '提交建议'}
        </button>
      </div>
      <textarea
        className="mt-3 w-full border rounded p-2"
        rows={3}
        placeholder={process.env.NEXT_PUBLIC_SPARK_API_KEY ? '输入你的建议，Enter 提交，Shift+Enter 换行' : '本地未配置 API Key，使用 Mock 响应'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => handleTextareaEnter(e, submit)}
      />
    </div>
  )
}
```

```typescriptreact
// file: src/app/(nav)/drafts/page.tsx
'use client'
import { useEffect, useState } from 'react'
import * as DraftRepo from '@/lib/repos/draft-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import Link from 'next/link'
import IdeasModal from '@/components/IdeasModal'
import { formatRelativeTime } from '@/utils/format'

export default function DraftsPage() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    const drafts = await DraftRepo.listByUpdatedDesc()
    const data = await Promise.all(drafts.map(async (d) => {
      const idea = await IdeaRepo.getById(d.ideaId)
      const seriesId = d.ideaId
      const max = await FinalRepo.getMaxVersion(seriesId)
      return { draft: d, idea, latestVersion: max }
    }))
    setRows(data)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">文案草稿</h1>
        <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => setOpen(true)} aria-label="新建草稿">新建草稿</button>
      </div>

      <IdeasModal open={open} onClose={() => { setOpen(false); refresh() }} />

      <div className="bg-white rounded-lg shadow divide-y">
        {rows.length === 0 && (
          <div className="py-12 text-center text-gray-500">暂无草稿，点击“新建草稿”开始</div>
        )}
        {rows.map(({ draft, idea, latestVersion }) => (
          <div key={draft.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{draft.title || '未命名草稿'}</div>
              <div className="text-sm text-gray-600">点子：{idea?.title || draft.ideaId} · 更新于 {formatRelativeTime(draft.updatedAt)}</div>
            </div>
            <div className="flex items-center gap-3">
              {latestVersion > 0 && (
                <Link href={`/finals/${draft.ideaId}`} className="text-sm text-blue-600 hover:underline">最新定稿 v{latestVersion}</Link>
              )}
              <Link href={`/drafts/${draft.id}`} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">编辑</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

```typescriptreact
// file: src/app/(nav)/drafts/[id]/page.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as DraftRepo from '@/lib/repos/draft-repo'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import IdeaSummary from '@/components/IdeaSummary'
import DraftEditor from '@/components/DraftEditor'
import SuggestBox from '@/components/SuggestBox'
import { useSaveHotkey } from '@/utils/hotkeys'
import { useToast } from '@/components/Toast'
import { publishDraft } from '@/lib/services/publishDraft'

export default function DraftDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { show } = useToast()

  const [draft, setDraft] = useState<any | null>(null)
  const [idea, setIdea] = useState<any | null>(null)
  const [latestVersion, setLatestVersion] = useState<number>(0)

  useEffect(() => {
    if (!id) return
    (async () => {
      const d = await DraftRepo.getById(id)
      if (!d) { show('草稿不存在', 'error'); router.push('/drafts'); return }
      setDraft(d)
      const i = await IdeaRepo.getById(d.ideaId)
      setIdea(i)
      const max = await FinalRepo.getMaxVersion(d.ideaId)
      setLatestVersion(max)
    })()
  }, [id])

  useSaveHotkey(async () => {
    if (!draft) return
    try {
      const res = await publishDraft(draft.ideaId)
      setLatestVersion(res.versionNumber)
      show(`已发布为 v${res.versionNumber}`, 'success')
    } catch (e) {
      show('发布失败，请重试', 'error')
    }
  })

  const onChange = (next: any) => setDraft(next)

  async function applyFourFields(four: { title: string; intro: string; bulletPoints: string[]; cta: string }) {
    if (!draft) return
    const merged = { ...draft, ...four }
    const saved = await DraftRepo.save(merged)
    setDraft(saved)
  }

  if (!draft || !idea) return <div className="max-w-4xl mx-auto px-4 py-8">加载中…</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">草稿编辑</h1>
        <div className="flex items-center gap-3">
          {latestVersion > 0 && (
            <a className="text-sm text-blue-600 hover:underline" href={`/finals/${draft.ideaId}`}>最新定稿 v{latestVersion}</a>
          )}
          <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={async () => {
            try {
              const res = await publishDraft(draft.ideaId)
              setLatestVersion(res.versionNumber)
              show(`已发布为 v${res.versionNumber}`, 'success')
            } catch (e) {
              show('发布失败，请重试', 'error')
            }
          }} aria-label="发布">发布</button>
        </div>
      </div>

      <IdeaSummary idea={idea} />

      <div className="bg-white rounded-lg shadow p-4">
        <DraftEditor draft={draft} onChange={onChange} />
      </div>

      <SuggestBox idea={idea} draft={draft} onApply={applyFourFields} />
    </div>
  )
}
```

```typescriptreact
// file: src/components/FinalTimeline.tsx
'use client'
import type { FinalScript } from '@/types/domain'

export default function FinalTimeline({ versions, current, onSelect }: { versions: FinalScript[]; current?: number; onSelect: (v: number) => void }) {
  return (
    <div className="space-y-2">
      {versions.map((v) => (
        <button key={v.versionNumber} onClick={() => onSelect(v.versionNumber)} className={`w-full text-left px-3 py-2 rounded ${current===v.versionNumber?'bg-blue-50 text-blue-700':'hover:bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div className="font-medium">v{v.versionNumber} · {v.title}</div>
            <div className="text-xs text-gray-500">{new Date(v.updatedAt).toLocaleString()}</div>
          </div>
          <div className="text-sm text-gray-600 line-clamp-2">{v.intro}</div>
        </button>
      ))}
    </div>
  )
}
```

```typescriptreact
// file: src/app/(nav)/finals/page.tsx
'use client'
import { useEffect, useState } from 'react'
import * as FinalRepo from '@/lib/repos/final-repo'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import Link from 'next/link'
import { formatRelativeTime } from '@/utils/format'

export default function FinalsPage() {
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      const metas = await FinalRepo.listByUpdatedAtDesc()
      const data = await Promise.all(metas.map(async (m) => ({ meta: m, idea: await IdeaRepo.getById(m.ideaId) })))
      setRows(data)
    })()
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">定稿列表</h1>
      <div className="bg-white rounded-lg shadow divide-y">
        {rows.length === 0 && (
          <div className="py-12 text-center text-gray-500">暂无定稿</div>
        )}
        {rows.map(({ meta, idea }) => (
          <div key={meta.finalScriptId} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{idea?.title || meta.finalScriptId}</div>
              <div className="text-sm text-gray-600">最高版本 v{meta.maxVersion} · 更新于 {formatRelativeTime(meta.updatedAt)}</div>
            </div>
            <Link href={`/finals/${meta.finalScriptId}`} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">查看详情</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
```

```typescriptreact
// file: src/app/(nav)/finals/[finalScriptId]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as FinalRepo from '@/lib/repos/final-repo'
import FinalTimeline from '@/components/FinalTimeline'
import { rollbackToVersion } from '@/lib/services/rollbackToVersion'
import { useToast } from '@/components/Toast'

export default function FinalDetailPage() {
  const params = useParams<{ finalScriptId: string }>()
  const finalScriptId = params.finalScriptId
  const router = useRouter()
  const { show } = useToast()

  const [versions, setVersions] = useState<any[]>([])
  const [current, setCurrent] = useState<number | undefined>(undefined)

  useEffect(() => {
    (async () => {
      const list = await FinalRepo.getSeriesVersions(finalScriptId)
      setVersions(list)
      setCurrent(list[list.length - 1]?.versionNumber)
    })()
  }, [finalScriptId])

  const selected = versions.find((v) => v.versionNumber === current)

  async function rollback() {
    if (!current) return
    try {
      const draft = await rollbackToVersion(finalScriptId, current)
      show('已回滚到草稿', 'success')
      router.push(`/drafts/${draft.id}`)
    } catch (e) {
      show('回滚失败', 'error')
    }
  }

  if (versions.length === 0) return <div className="max-w-5xl mx-auto px-4 py-6">暂无版本</div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">版本</h2>
        <FinalTimeline versions={versions} current={current} onSelect={setCurrent} />
      </div>
      <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">v{selected.versionNumber} · {selected.title}</h1>
              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={rollback} aria-label="回滚到此版本">回滚到此版本</button>
            </div>
            <p className="text-gray-700">{selected.intro}</p>
            <ul className="list-disc pl-6 text-gray-700">
              {selected.bulletPoints?.map((b: string, i: number) => <li key={i}>{b}</li>)}
            </ul>
            <p className="text-gray-700"><strong>CTA：</strong>{selected.cta}</p>
            {selected.content && (
              <pre className="p-3 bg-gray-50 rounded border overflow-auto text-sm whitespace-pre-wrap">{selected.content}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

```typescriptreact
// file: src/app/ClientBootstrap.tsx
'use client'
import { useEffect } from 'react'
import { openDatabase, withRead, withWrite, IDB_CONFIG, idbGetAll, idbAdd } from '@/lib/idb'
import { seed as seedIdeas } from '@/lib/repos/idea-repo'
import { defaultSeed } from '@/mock/seed'

export default function ClientBootstrap() {
  useEffect(() => {
    openDatabase().then(async () => {
      await seedIdeas(defaultSeed.ideas)
      // drafts
      const hasDraft = await withRead(IDB_CONFIG.stores.drafts, (store) => idbGetAll<any>(store)).then((x) => x.length > 0)
      if (!hasDraft && defaultSeed.draft) {
        await withWrite(IDB_CONFIG.stores.drafts, (store) => idbAdd(store, defaultSeed.draft!))
      }
      // finals
      const hasFinals = await withRead(IDB_CONFIG.stores.finalScripts, (store) => idbGetAll<any>(store)).then((x) => x.length > 0)
      if (!hasFinals && defaultSeed.finals?.length) {
        for (const f of defaultSeed.finals) {
          // @ts-expect-error add synthetic key for unique index
          f.seriesVersionKey = `${f.finalScriptId}#${f.versionNumber}`
          await withWrite(IDB_CONFIG.stores.finalScripts, (store) => idbAdd(store, f as any))
        }
      }
    })
  }, [])
  return null
}

```

我将先完善 IdeasModal 的“仅显示尚未创建草稿的点子”筛选逻辑，并在导航中添加“定稿”入口；之后新增 scripts/demo.ts 脚本与 README 增补说明。随后我会检查并勾选对应待办。

```typescriptreact
// file: src/components/IdeasModal.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import * as DraftRepo from '@/lib/repos/draft-repo'
import type { Idea } from '@/types/domain'
import { useRouter } from 'next/navigation'

export default function IdeasModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [keyword, setKeyword] = useState('')
  const [onlyWithoutDraft, setOnlyWithoutDraft] = useState(true)
  const [items, setItems] = useState<Idea[]>([])
  const [ideaIdsWithDraft, setIdeaIdsWithDraft] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      const [ideas, drafts] = await Promise.all([
        IdeaRepo.search(keyword),
        DraftRepo.listByUpdatedDesc(),
      ])
      if (cancelled) return
      setItems(ideas)
      setIdeaIdsWithDraft(new Set(drafts.map((d) => d.ideaId)))
    })()
    return () => { cancelled = true }
  }, [open, keyword])

  const filtered = useMemo(() => {
    if (!onlyWithoutDraft) return items
    return items.filter((i) => !ideaIdsWithDraft.has(i.id))
  }, [items, onlyWithoutDraft, ideaIdsWithDraft])

  async function choose(idea: Idea) {
    const existing = await DraftRepo.findByIdeaId(idea.id)
    if (existing) {
      onClose()
      router.push(`/drafts/${existing.id}`)
      return
    }
    const draft = await DraftRepo.create({
      ideaId: idea.id,
      title: '',
      intro: '',
      bulletPoints: [],
      cta: '',
      content: '',
      status: 'draft',
    })
    onClose()
    router.push(`/drafts/${draft.id}`)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">选择点子</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="关闭">✕</button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="搜索关键词"
            aria-label="搜索"
          />
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={onlyWithoutDraft} onChange={(e) => setOnlyWithoutDraft(e.target.checked)} />
            仅显示尚未创建草稿的点子
          </label>
        </div>

        <div className="mt-4 max-h-80 overflow-auto divide-y">
          {filtered.length === 0 && (
            <div className="text-gray-500 text-sm py-8 text-center">无匹配点子</div>
          )}
          {filtered.map((idea) => (
            <button key={idea.id} onClick={() => choose(idea)} className="w-full text-left py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none px-2 rounded">
              <div className="font-medium text-gray-900">{idea.title}</div>
              <div className="text-sm text-gray-600 line-clamp-2">{idea.summary || idea.rawInputText}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

```

```typescriptreact
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

```typescript
// file: scripts/demo.ts
/**
 * 运行方式：在浏览器控制台或引入到页面执行（本项目前端环境）
 * 用于演示核心流程：创建→生成→发布 v1→再次生成→发布 v2→回滚 v1→发布 v3
 */
import { openDatabase } from '@/lib/idb'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import * as DraftRepo from '@/lib/repos/draft-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import { generateStructuredDraft } from '@/lib/llm/spark-x1'
import { publishDraft } from '@/lib/services/publishDraft'
import { rollbackToVersion } from '@/lib/services/rollbackToVersion'

async function main() {
  await openDatabase()
  const ideas = await IdeaRepo.search('远程')
  const idea = ideas[0]
  console.log('使用点子：', idea?.title)

  let draft = await DraftRepo.findByIdeaId(idea.id)
  if (!draft) {
    draft = await DraftRepo.create({ ideaId: idea.id, title: '', intro: '', bulletPoints: [], cta: '', content: '', status: 'draft' })
  }
  console.log('草稿：', draft)

  const g1 = await generateStructuredDraft({ idea: { id: idea.id, title: idea.title, summary: idea.summary, rawInputText: idea.rawInputText, source: idea.source, createdAt: idea.createdAt }, draft, mode: 'normalize' })
  await DraftRepo.save({ ...draft, ...g1 })
  const v1 = await publishDraft(idea.id)
  console.log('发布 v1:', v1)

  const g2 = await generateStructuredDraft({ idea: { id: idea.id, title: idea.title, summary: idea.summary, rawInputText: idea.rawInputText, source: idea.source, createdAt: idea.createdAt }, draft: { ...draft, ...g1, content: '' }, mode: 'enhance', suggestion: '强调最小投入' })
  draft = await DraftRepo.save({ ...draft, ...g2 })
  const v2 = await publishDraft(idea.id)
  console.log('发布 v2:', v2)

  const rolled = await rollbackToVersion(idea.id, 1)
  console.log('回滚到 v1 草稿:', rolled)
  const v3 = await publishDraft(idea.id)
  console.log('再次发布 v3:', v3)

  const versions = await FinalRepo.getSeriesVersions(idea.id)
  console.log('最终版本列表：', versions.map(v => v.versionNumber))
}

main().catch(console.error)
```

```markdown
# EchoCast Workshop

一个专为内容创作者设计的多语种处理工作台，帮助您从创意收集到多语种发布的全流程管理。

## 项目简介

EchoCast Workshop 是一个基于 Next.js 15 构建的现代化内容创作工具，旨在简化内容创作者的工作流程，从最初的创意收集到最终的多语种内容发布。

### 核心功能

- **💡 创意收集**：随时记录灵感，整理创意想法，为内容创作奠定基础
  - **文字输入**：快速文字记录，AI 智能优化为播客标题和摘要
  - **🎙️ 语音收集**：支持浏览器录音（≤60秒），自动语音转写 + AI 补全
  - **来源筛选**：按文本/语音来源筛选创意，便于分类管理
- **📝 文案打磨**：多轮迭代优化文案内容，打造高质量的创作素材  
- **🌍 多语种处理**：智能多语种转换与时间线管理，扩展内容影响力

## 技术栈

- **框架**：Next.js 15 (App Router)
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **存储**：IndexedDB (本地存储)
- **AI 服务**：星火 X1 大模型（文本优化）、讯飞 IAT（语音转写）

## 项目结构

```
echocast-workshop/
├── src/
│   ├── app/                 # Next.js App Router 页面
│   │   ├── page.tsx        # 首页
│   │   ├── ideas/          # 创意收集页
│   │   ├── drafts/         # 文案打磨页
│   │   ├── timeline/       # 时间线管理页
│   │   ├── layout.tsx      # 根布局
│   │   └── globals.css     # 全局样式
│   ├── components/         # 可复用组件
│   │   ├── TopNav.tsx      # 顶部导航
│   │   └── Container.tsx   # 布局容器
│   ├── lib/                # 工具库
│   │   └── indexeddb.ts    # IndexedDB 封装
│   └── types/              # 类型定义
│       └── domain.ts       # 领域模型类型
├── .env.example            # 环境变量示例
├── package.json            # 项目依赖
└── README.md              # 项目文档
```

## 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn 或 pnpm

### 安装依赖

```bash
npm install
# 或
yarn install
# 或  
pnpm install
```

### 环境配置

1. 复制环境变量文件：
```bash
cp .env.example .env.local
```

2. 编辑 `.env.local` 文件，填入相应的 API 密钥

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
npm start
```

## 创意收集功能使用说明

### 功能概述

创意收集模块提供了完整的创意管理功能，包括：

- **智能优化**：输入原始创意想法，AI 自动优化为适合播客的内容
- **本地存储**：使用 IndexedDB 进行本地数据管理，无需联网即可查看已保存的创意
- **交互友好**：现代化的模态弹窗设计，支持键盘快捷键和无障碍访问
- **实时反馈**：提供加载状态、错误处理和成功提示

### 使用流程

#### 文字创意收集
1. **访问页面**：导航到 `/ideas` 页面
2. **新建创意**：点击"新建创意"按钮打开弹窗
3. **输入想法**：在文本框中描述您的创意想法（最多2000字符）
4. **AI 优化**：点击"优化创意"，系统调用 X1 大模型进行内容优化
5. **查看结果**：AI 返回优化后的播客标题和摘要
6. **保存收藏**：点击"保存创意"将内容存储到本地数据库

#### 🎙️ 语音创意收集
1. **访问页面**：导航到 `/ideas` 页面
2. **语音收集**：点击"语音收集"按钮打开录音弹窗
3. **开始录音**：点击"开始录音"，最长可录制 60 秒，支持实时进度显示
4. **完成录音**：点击"停止录音"或达到时间上限自动停止
5. **提交处理**：点击"提交"，系统自动进行语音转写（IAT）
6. **AI 优化**：转写完成后，X1 模型自动优化为播客标题和摘要
7. **预览保存**：查看优化结果，点击"保存创意"存储到本地

#### 管理和筛选
- **来源筛选**：使用顶部筛选器按"全部"/"文本"/"语音"查看不同来源的创意
- **列表管理**：查看所有创意，支持星标收藏和删除操作
- **音频标识**：语音创意显示录音时长，便于识别

### 技术特点

- **服务端处理**：AI 调用仅在服务端进行，确保 API 密钥安全
- **语音处理**：集成讯飞 IAT 语音转写，支持中英文识别
- **音频存储**：使用 IndexedDB 分离存储音频 Blob 和创意数据，优化性能
- **状态机管理**：完整的录音-转写-优化-保存状态流转，提供清晰的用户反馈
- **离线可用**：已保存的创意支持离线浏览和管理
- **响应式设计**：适配各种屏幕尺寸，提供良好的移动端体验
- **无障碍支持**：完整的键盘导航和屏幕阅读器支持

## AI 接入（OpenAI 兼容）

本项目已集成星火 X1 大模型，采用 OpenAI 兼容接口，支持聊天对话功能。

### 环境配置

项目仅需配置一个环境变量：

```bash
# .env.local 文件中配置
OPENAI_API_KEY=your_api_password
```

其中 `your_api_password` 是您的星火 X1 API 密钥。

### 本地运行与测试

```bash
# 测试 AI 接口连通性
npm run try:x1

# 运行所有测试
npm run test

# 监听模式运行测试
npm run test:watch
```

### 使用示例

```typescript
import { simpleChat, chatComplete } from '@src/lib/ai/x1Chat';

// 简单对话
const result = await simpleChat('你好，请介绍一下自己');
console.log(result.text); // AI 的回复内容

// 带配置的对话
const result = await simpleChat(
  '请简短回复',
  '你是一个友善的助手',
  {
    temperature: 0.7,
    maxTokens: 100,
    user: 'user-123'
  }
);

// 流式响应（实时获取回复）
const streamResult = await simpleChat(
  '请详细解释什么是人工智能',
  undefined,
  {
    stream: true,
    user: 'stream-user'
  }
);
console.log(streamResult.text); // 完整回复
console.log(streamResult.reasoningContent); // 思考过程（X1 特有）

// 多轮对话
const messages = [
  { role: 'user', content: '你好' },
  { role: 'assistant', content: '您好！有什么可以帮助您的吗？' },
  { role: 'user', content: '请介绍一下星火大模型' }
];
const chatResult = await chatComplete(messages, {
  temperature: 0.8,
  maxTokens: 500
});
```

### 常见问题排查

#### 鉴权失败
- 检查 `.env.local` 文件是否存在
- 确认 `OPENAI_API_KEY` 配置正确
- 验证 API 密钥是否有效

#### 请求超时
- 检查网络连接
- 确认防火墙设置
- 可能需要重试请求

#### 限流错误
- 检查 API 调用频率
- 确认账户配额充足
- 适当增加请求间隔

#### 服务端错误 (5xx)
- 稍后重试
- 检查 API 服务状态
- 联系技术支持

### 技术说明

- **仅 Node.js 环境**：AI 相关代码只在服务端运行，确保 API 密钥安全
- **OpenAI 兼容**：使用标准 OpenAI SDK，便于后续切换模型
- **流式响应支持**：支持实时流式回复，提升用户体验
- **思考过程展示**：X1 模型独有的思考过程可视化
- **用户追踪**：支持 user 参数进行请求跟踪和统计
- **错误处理**：完善的错误包装和人性化提示
- **测试覆盖**：包含单元测试和集成测试，确保代码质量

## 语音识别（IAT）

本项目已集成讯飞星火中英语音识别服务，支持实时语音转写功能。

### 环境变量配置

在 `.env.local` 文件中配置以下变量：

```bash
# 语音识别 IAT 配置
IAT_API_KEY=your_iat_api_key_here      # 语音识别 APIKey
IAT_API_SECRET=your_iat_api_secret_here # 语音识别 APISecret
IAT_APP_ID=your_iat_app_id_here        # 可选，部分接口需要 APPID
IAT_TIMEOUT_MS=20000                   # 可选，请求超时时间（毫秒），默认 20000
IAT_LOG_LEVEL=info                     # 可选，日志级别：info|error|silent
```

**安全提示**：所有 API 密钥仅在 Node.js 服务端使用，不会暴露给浏览器端或记录在日志中。

### 本地演示与测试

```bash
# 语音识别演示（需要配置完整的环境变量）
npm run try:iat

# 运行 IAT 相关测试
npm run test:iat

# 运行所有测试
npm run test

# 监听模式运行测试
npm run test:watch
```

### 使用示例

#### 直接调用 IAT 客户端

```typescript
import { transcribe, IATClient } from '@/lib/asr/iatClient';

// 使用便捷函数
const result = await transcribe(audioBuffer, {
  audioParams: {
    sampleRate: 16000,
    encoding: 'raw'
  },
  languageParams: {
    language: 'zh_cn', // 中文识别
    domain: 'iat'
  },
  punc: 1 // 添加标点符号
});

console.log('识别结果:', result.text);

// 使用客户端类
const client = new IATClient();
const result = await client.transcribe({
  audio: audioBuffer, // Buffer | base64字符串 | 文件路径
  audioParams: {
    sampleRate: 16000,
    encoding: 'raw'
  },
  languageParams: {
    language: 'en_us', // 英文识别
    domain: 'iat'
  }
});
```

#### 通过 API 路由调用

```typescript
// POST /api/asr/recognize
const response = await fetch('/api/asr/recognize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    audio: audioBase64, // Base64 编码的音频数据
    audioParams: {
      sampleRate: 16000,
      encoding: 'raw'
    },
    languageParams: {
      language: 'zh_cn',
      accent: 'mandarin'
    },
    addPunctuation: true
  })
});

const result = await response.json();
if (result.success) {
  console.log('识别文本:', result.text);
  console.log('处理时间:', result.processingTime, 'ms');
} else {
  console.error('识别失败:', result.error);
}
```

### 支持的音频格式

- **编码格式**：raw, speex, speex-wb
- **采样率**：8000Hz, 16000Hz
- **声道数**：单声道 (1)
- **位深度**：16bit
- **推荐格式**：16kHz, 16bit, 单声道 PCM

### 支持的语言

- **中文**：`zh_cn` (普通话、粤语)
- **英文**：`en_us`
- **方言支持**：`mandarin`, `cantonese` (仅中文时有效)

### 常见错误与排查

#### 鉴权失败 (401)
- 检查 `IAT_API_KEY` 和 `IAT_API_SECRET` 是否正确
- 确认账户状态是否正常
- 验证 API 服务是否可用

#### 配额不足 (429)
- 检查账户余额或点数
- 查看 API 调用频率限制
- 考虑升级服务套餐

#### 网络错误 (502)
- 检查网络连接状况
- 确认防火墙设置
- 重试操作或稍后再试

#### 请求超时 (408)
- 增加 `IAT_TIMEOUT_MS` 配置值
- 检查网络延迟情况
- 缩短音频长度

#### 音频格式错误 (400)
- 确认音频采样率为 8000Hz 或 16000Hz
- 检查音频编码格式是否支持
- 验证音频数据是否完整

### 音频数据处理

支持多种音频输入格式：

```typescript
// 1. 直接使用 Buffer
const audioBuffer = fs.readFileSync('audio.wav');
const result = await transcribe(audioBuffer);

// 2. Base64 字符串
const audioBase64 = audioBuffer.toString('base64');
const result = await transcribe(audioBase64);

// 3. 文件路径
const result = await transcribe('./audio/sample.wav');
```

### 性能优化建议

1. **音频预处理**：确保音频格式符合要求，避免在线转换
2. **分段处理**：长音频建议分段处理，每段不超过60秒
3. **并发控制**：避免同时发起过多识别请求
4. **缓存结果**：对于重复音频可以缓存识别结果
5. **错误重试**：网络错误时实现指数退避重试机制

### 技术实现细节

- **WebSocket 连接**：使用讯飞 IAT WebSocket API 实现实时识别
- **鉴权机制**：HMAC-SHA256 签名算法，符合讯飞 API 规范
- **数据分帧**：音频数据按 40ms (1280字节) 分帧传输
- **Node.js 专用**：所有识别逻辑仅在服务端运行，保护 API 密钥安全
- **完整测试**：包含单元测试、集成测试和条件跳过机制

## 文案打磨工作台（Drafts / Finals）

### 运行

- 安装依赖：
```bash
npm i
```
- 开发启动：
```bash
npm run dev
```

### 环境变量（可选）
- 在项目根目录创建 `.env.local`：
```
NEXT_PUBLIC_SPARK_API_KEY=your_key
NEXT_PUBLIC_SPARK_ENDPOINT=https://example.com/v1
```
未配置时，LLM 调用走 Mock 分支，UI 会提示“Mock 响应”。

### 技术约束
- Next.js App Router + TypeScript
- Tailwind CSS；可用内置组件
- 状态管理以组件内部状态为主，必要时可引入 Zustand（本迭代未使用）
- 本地持久化使用 IndexedDB，经 `src/lib/idb.ts` 封装

### 数据契约
- `Idea`：只读，镜像/种子
- `ScriptDraft`：仅最新一份，无版本历史
- `FinalScript`：版本只追加；保证 `(finalScriptId, versionNumber)` 唯一；`finalScriptId` 采用 `ideaId`
- `LocaleVariant`：绑定 `finalScriptId + sourceVersion`

### 核心路径
- 页面：
  - `/drafts` 列表 + 新建草稿（选择点子）
  - `/drafts/[id]` 编辑 + 生成 + 发布
  - `/finals` 列表
  - `/finals/[finalScriptId]` 详情 + 时间线 + 回滚
- 组件：`src/components/*`
- 仓库：`src/lib/repos/*`
- 服务：`src/lib/services/*`
- LLM 适配：`src/lib/llm/spark-x1.ts`

### 演示脚本（可选）
浏览器环境可执行 `scripts/demo.ts`（在任意页面加载后于 DevTools Console）：
```js
import('/_next/static/chunks/pages/scripts/demo.js').then(m => m?.default?.())
```
或将脚本逻辑复制到页面环境执行，按日志观察：创建→生成→发布 v1→再次生成→发布 v2→回滚 v1→发布 v3。

### 提示
- 键盘：
  - 草稿编辑页：Cmd/Ctrl+S 发布
  - 建议输入框：Enter 提交，Shift+Enter 换行，Cmd/Ctrl+Enter 提交
- 错误/成功反馈通过右下角 Toast 展示
- 种子数据在客户端启动时注入，可在 `src/mock/seed.ts` 调整

## 开发指南

### 代码规范

项目遵循以下开发原则（按优先级排序）：

1. **First Principles**：梳理最核心需求与边界
2. **YAGNI**：只实现当前真正需要的功能
3. **KISS**：保持设计和实现的简单性
4. **SOLID**：面向对象/模块化设计原则
5. **DRY**：消除重复，提炼公用逻辑

### 类型安全

项目全面使用 TypeScript，所有 API 接口和数据模型都有完整的类型定义。

### 样式规范

使用 Tailwind CSS 作为唯一样式方案，遵循原子化 CSS 理念。

## 功能路线图

### Phase 1 - 基础功能 (当前版本)
- [x] 项目初始化与基础架构
- [x] 四个核心页面布局
- [x] 导航和布局组件
- [x] 类型系统定义

### Phase 2 - 创意管理 (已完成)
- [x] 创意录入与编辑
- [x] AI 优化创意为播客内容
- [x] 本地存储管理 (IndexedDB)
- [x] 星标收藏功能
- [x] 按时间排序展示
- [ ] 标签分类系统
- [ ] 创意评估筛选
- [ ] 搜索和过滤功能

### Phase 3 - 文案处理
- [ ] 文案编辑器
- [ ] 版本历史管理
- [ ] AI 辅助优化
- [ ] 协作评审功能

### Phase 4 - 多语种支持
- [ ] 多语种翻译
- [ ] 本地化适配
- [ ] 发布时间规划
- [ ] 效果追踪分析

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进项目。

## 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件。

```

- 我已完成服务层、LLM 适配、IndexedDB 封装、仓库、UI 组件与四个页面路由，并接入种子与 Toast。你可以 npm run dev 后在 /drafts→/drafts/[id]→发布→/finals→回滚 全流程演示。
- 新增或更新的关键文件：`src/lib/idb.ts`、`src/lib/repos/*`、`src/lib/services/*`、`src/lib/llm/spark-x1.ts`、`src/components/*`、`src/app/(nav)/*`、`src/mock/seed.ts`、`README.md`。
- LLM 未配置时会走 Mock，界面会提示；支持 Cmd/Ctrl+S 发布、Enter/Shift+Enter 提交建议。

我接下来可以根据你反馈微调 UI/交互或补充校验。

---

**User**

提示词目标

将现有的草稿打磨和定稿功能，从 mock 输出升级为真实调用大模型。要求大模型基于 Idea、Draft、用户建议生成优化后的草稿，并返回符合 ScriptDraft / FinalScript 结构的 JSON，以便前端和存储层直接使用。

需求说明

输入数据

Idea：title, summary, content（只读）

ScriptDraft（草稿）：title, intro, bulletPoints, cta（可能为空或已有内容）

用户建议：一段自由文本，可为空

处理逻辑

生成或更新草稿四要素（title, intro, bulletPoints[], cta）

bulletPoints 最多 3 条

自动拼接 content（四要素合并的完整文案）

多轮交互时始终基于最新草稿

定稿逻辑

用户点击发布时，将当前草稿转化为 FinalScript

追加 versionNumber（递增），不覆盖历史

publishedAt 字段由系统写入，不由模型生成

输出要求

输出必须是严格 JSON，不要返回任何解释说明

JSON 字段：

{
  "title": "string",
  "intro": "string",
  "bulletPoints": ["string"],
  "cta": "string",
  "content": "string"
}


约束：

title ≤ 40 字

intro = 1–2 句

bulletPoints ≤ 3 条，每条一句话

cta = 单句，动词开头

content = 拼接的完整文案

特别说明

Idea 数据只读，不允许模型改写

ScriptDraft 不包含 versionNumber（只保留最新草稿）

FinalScript 的 versionNumber 和 publishedAt 由前端/存储层生成，不由模型决定

如果用户建议为空，则只需进行轻微润色或保持内容一致

输出失败时，允许重试一次，但始终保持严格 JSON

用户提示（调用模板）
请根据以下输入生成优化后的文案草稿：

【点子（Idea）】
标题: {{ idea.title }}
摘要: {{ idea.summary }}
内容: {{ idea.content }}

【当前草稿（Draft）】
标题: {{ draft.title }}
开场白: {{ draft.intro }}
要点: {{ draft.bulletPoints }}
结尾: {{ draft.cta }}

【用户建议】
{{ suggestion }}

输出要求：
1. 严格返回 JSON，不要多余解释
2. JSON 字段：title, intro, bulletPoints, cta, content
3. bulletPoints 数组最多 3 条
4. content = title + intro + bulletPoints + cta 拼接


这样，mock 的数据就能直接替换成真实对接：

前端把 Idea / Draft / 用户建议打包传给大模型

大模型返回 JSON → 存储到 ScriptDraft

点击发布 → 写入 FinalScript（由系统加 versionNumber + 时间戳）

---

**Cursor**

我要先创建服务端 API 路由用于调用大模型并返回严格 JSON，然后更新前端适配器与 SuggestBox 以使用该路由，确保包含 content 字段与严格校验。接着我会运行一次静态检查。

```typescript
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
```

```typescript
// file: src/lib/llm/spark-x1.ts
import type { FourFields, Idea, ScriptDraft } from '@/types/domain'
import { AppError, createParseError } from '@/lib/services/errors'

export type GenerateMode = 'normalize' | 'enhance'

export interface GenerateParams {
  idea: Pick<Idea, 'title' | 'summary' | 'content'>
  draft: Pick<ScriptDraft, 'title' | 'intro' | 'bulletPoints' | 'cta' | 'content'>
  suggestion?: string
  mode: GenerateMode
}

export async function generateStructuredDraft(params: GenerateParams): Promise<FourFields & { content: string }> {
  const canCallApi = typeof window !== 'undefined'
  if (canCallApi) {
    try {
      const res = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        throw new AppError('NETWORK_ERROR', `API 错误: ${res.status}`)
      }
      const data = await res.json()
      return data as FourFields & { content: string }
    } catch (e) {
      // 回退到 Mock
      return mockGenerate(params)
    }
  }
  return mockGenerate(params)
}

function mockGenerate(params: GenerateParams): FourFields & { content: string } {
  const base = params.draft
  const suffix = params.mode === 'enhance' ? '（增强版）' : '（整理版）'
  const title = (base.title || params.idea.title || '未命名草稿').slice(0, 40).replace(/[。.]$/g, '') + suffix
  const intro = base.intro || (params.idea.summary || '基于点子的梳理版本。')
  const bulletPoints = base.bulletPoints && base.bulletPoints.length > 0 ? base.bulletPoints.slice(0, 3) : [
    '要点一：围绕创意的核心价值展开。',
    '要点二：强调听众能获得的收获。',
  ]
  const cta = base.cta || '现在就开始行动吧'
  const content = `# ${title}\n${intro}\n${bulletPoints.map(b=>`- ${b}`).join('\n')}\nCTA: ${cta}`
  return { title, intro, bulletPoints, cta, content }
}

```

```typescriptreact
// file: src/components/SuggestBox.tsx
'use client'
import { useState } from 'react'
import type { Idea, ScriptDraft } from '@/types/domain'
import { generateStructuredDraft, type GenerateMode } from '@/lib/llm/spark-x1'
import { handleTextareaEnter } from '@/utils/hotkeys'
import { useToast } from './Toast'

export default function SuggestBox({ idea, draft, onApply }: { idea: Idea; draft: ScriptDraft; onApply: (four: { title: string; intro: string; bulletPoints: string[]; cta: string; content: string }) => void }) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<GenerateMode>('normalize')
  const [loading, setLoading] = useState(false)
  const { show } = useToast()

  async function submit() {
    setLoading(true)
    try {
      const four = await generateStructuredDraft({ idea: {
        title: idea.title,
        summary: idea.summary,
        content: idea.content,
      }, draft: {
        title: draft.title,
        intro: draft.intro,
        bulletPoints: draft.bulletPoints,
        cta: draft.cta,
        content: draft.content,
      }, suggestion: text, mode })
      onApply(four)
      show(process.env.NEXT_PUBLIC_SPARK_API_KEY ? '已应用模型建议' : '已应用 Mock 响应', 'success')
    } catch (e) {
      show('生成失败，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm">
            <input type="radio" name="mode" value="normalize" checked={mode==='normalize'} onChange={() => setMode('normalize')} /> 结构化/轻润色
          </label>
          <label className="text-sm">
            <input type="radio" name="mode" value="enhance" checked={mode==='enhance'} onChange={() => setMode('enhance')} /> 增强（不虚构）
          </label>
        </div>
        <button className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50" onClick={submit} disabled={loading} aria-label="提交建议">
          {loading ? '生成中…' : '提交建议'}
        </button>
      </div>
      <textarea
        className="mt-3 w-full border rounded p-2"
        rows={3}
        placeholder={process.env.NEXT_PUBLIC_SPARK_API_KEY ? '输入你的建议，Enter 提交，Shift+Enter 换行' : '本地未配置 API Key，使用 Mock 响应'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => handleTextareaEnter(e, submit)}
      />
    </div>
  )
}

```

```typescriptreact
// file: src/app/(nav)/drafts/[id]/page.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as DraftRepo from '@/lib/repos/draft-repo'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import IdeaSummary from '@/components/IdeaSummary'
import DraftEditor from '@/components/DraftEditor'
import SuggestBox from '@/components/SuggestBox'
import { useSaveHotkey } from '@/utils/hotkeys'
import { useToast } from '@/components/Toast'
import { publishDraft } from '@/lib/services/publishDraft'

export default function DraftDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { show } = useToast()

  const [draft, setDraft] = useState<any | null>(null)
  const [idea, setIdea] = useState<any | null>(null)
  const [latestVersion, setLatestVersion] = useState<number>(0)

  useEffect(() => {
    if (!id) return
    (async () => {
      const d = await DraftRepo.getById(id)
      if (!d) { show('草稿不存在', 'error'); router.push('/drafts'); return }
      setDraft(d)
      const i = await IdeaRepo.getById(d.ideaId)
      setIdea(i)
      const max = await FinalRepo.getMaxVersion(d.ideaId)
      setLatestVersion(max)
    })()
  }, [id])

  useSaveHotkey(async () => {
    if (!draft) return
    try {
      const res = await publishDraft(draft.ideaId)
      setLatestVersion(res.versionNumber)
      show(`已发布为 v${res.versionNumber}`, 'success')
    } catch (e) {
      show('发布失败，请重试', 'error')
    }
  })

  const onChange = (next: any) => setDraft(next)

  async function applyFourFields(four: { title: string; intro: string; bulletPoints: string[]; cta: string; content: string }) {
    if (!draft) return
    const merged = { ...draft, ...four }
    const saved = await DraftRepo.save(merged)
    setDraft(saved)
  }

  if (!draft || !idea) return <div className="max-w-4xl mx-auto px-4 py-8">加载中…</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">草稿编辑</h1>
        <div className="flex items-center gap-3">
          {latestVersion > 0 && (
            <a className="text-sm text-blue-600 hover:underline" href={`/finals/${draft.ideaId}`}>最新定稿 v{latestVersion}</a>
          )}
          <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={async () => {
            try {
              const res = await publishDraft(draft.ideaId)
              setLatestVersion(res.versionNumber)
              show(`已发布为 v${res.versionNumber}`, 'success')
            } catch (e) {
              show('发布失败，请重试', 'error')
            }
          }} aria-label="发布">发布</button>
        </div>
      </div>

      <IdeaSummary idea={idea} />

      <div className="bg-white rounded-lg shadow p-4">
        <DraftEditor draft={draft} onChange={onChange} />
      </div>

      <SuggestBox idea={idea} draft={draft} onApply={applyFourFields} />
    </div>
  )
}

```

- 我已新增服务端接口 `POST /api/drafts/generate`：基于 Idea/Draft/建议调用星火 X1（通过 `simpleChat`），严格返回 JSON，并在失败时自纠重试一次；输出含 `title,intro,bulletPoints,cta,content`，若缺 content 会本地拼接补全。
- 前端适配器 `lib/llm/spark-x1.ts` 优先请求该接口，失败回退 Mock；`SuggestBox` 与草稿编辑页已接入返回的 `content` 并保存到草稿。
- 约束落实：不改写 Idea；Draft 仅最新版本；发布生成 `FinalScript` 版本号与 `publishedAt` 由前端/存储层写入。

现在可用真实模型（配置 `NEXT_PUBLIC_SPARK_API_KEY`）或 Mock 跑通“生成→保存草稿→发布定稿”闭环。

---

**User**

请你把 drafts 和 /finals 中使用模拟数据调用的位置都换成真实数据的读写逻辑

---

**Cursor**

我将把仍会使用 Mock 的位置改为强制调用真实接口，并移除草稿/定稿的种子注入，确保 /drafts 与 /finals 完全使用真实数据。接下来我会直接进行代码编辑。

```typescript
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

```

```typescriptreact
// file: src/components/SuggestBox.tsx
'use client'
import { useState } from 'react'
import type { Idea, ScriptDraft } from '@/types/domain'
import { generateStructuredDraft, type GenerateMode } from '@/lib/llm/spark-x1'
import { handleTextareaEnter } from '@/utils/hotkeys'
import { useToast } from './Toast'

export default function SuggestBox({ idea, draft, onApply }: { idea: Idea; draft: ScriptDraft; onApply: (four: { title: string; intro: string; bulletPoints: string[]; cta: string; content: string }) => void }) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<GenerateMode>('normalize')
  const [loading, setLoading] = useState(false)
  const { show } = useToast()

  async function submit() {
    setLoading(true)
    try {
      const four = await generateStructuredDraft({ idea: {
        title: idea.title,
        summary: idea.summary,
        content: idea.content,
      }, draft: {
        title: draft.title,
        intro: draft.intro,
        bulletPoints: draft.bulletPoints,
        cta: draft.cta,
        content: draft.content,
      }, suggestion: text, mode })
      onApply(four)
      show('已应用模型建议', 'success')
    } catch (e) {
      show('生成失败，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm">
            <input type="radio" name="mode" value="normalize" checked={mode==='normalize'} onChange={() => setMode('normalize')} /> 结构化/轻润色
          </label>
          <label className="text-sm">
            <input type="radio" name="mode" value="enhance" checked={mode==='enhance'} onChange={() => setMode('enhance')} /> 增强（不虚构）
          </label>
        </div>
        <button className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50" onClick={submit} disabled={loading} aria-label="提交建议">
          {loading ? '生成中…' : '提交建议'}
        </button>
      </div>
      <textarea
        className="mt-3 w-full border rounded p-2"
        rows={3}
        placeholder="输入你的建议，Enter 提交，Shift+Enter 换行"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => handleTextareaEnter(e, submit)}
      />
    </div>
  )
}

```

```typescriptreact
// file: src/app/ClientBootstrap.tsx
'use client'
import { useEffect } from 'react'
import { openDatabase } from '@/lib/idb'
import { seed as seedIdeas } from '@/lib/repos/idea-repo'
import { defaultSeed } from '@/mock/seed'

export default function ClientBootstrap() {
  useEffect(() => {
    openDatabase().then(async () => {
      await seedIdeas(defaultSeed.ideas)
    })
  }, [])
  return null
}

```

- 我已将前端生成逻辑改为强制调用真实接口，不再使用 Mock：
  - `lib/llm/spark-x1.ts`：仅调用 `POST /api/drafts/generate`，失败直接抛错。
  - `components/SuggestBox.tsx`：移除 Mock 提示，成功/失败均通过 Toast 提示。
- 我移除了草稿与定稿的本地种子注入：
  - `app/ClientBootstrap.tsx`：仅注入 `ideas` 种子；`drafts` 和 `final_scripts` 完全依赖真实读写。
- /drafts 与 /finals 页面本身已使用仓库层读写 IndexedDB，无需改动；发布与回滚均走真实服务逻辑。

---

**User**

请你整合 这两个 IndexedDB 封装工具类 ，只保留 src/lib/indexeddb.ts 删除 src/lib/idb.ts 并替换所有的引用

---

**Cursor**

我要并行搜索所有引用 `@/lib/idb` 的文件，并编辑 `src/lib/indexeddb.ts` 增加兼容导出（openDatabase/withRead/withWrite/idb* 辅助和 IDB_CONFIG 映射，以及在升级时添加 seriesVersionKey 索引）。随后批量替换这些引用为 `@/lib/indexeddb`.

```typescript
/**
 * IndexedDB 封装工具类
 * 
 * 用于本地存储以下数据：
 * 1. Ideas - 创意点子数据
 * 2. Scripts - 文案草稿数据  
 * 3. Locales - 多语种版本数据
 */

import type { Idea, ScriptDraft, LocaleVariant, IdeaAsset, FinalScript } from '@/types/domain'

// 数据库配置
export const DB_CONFIG = {
  name: 'EchoCastWorkshop',
  version: 3,
  stores: {
    ideas: 'ideas',
    scripts: 'scripts', 
    locales: 'locales',
    ideaAssets: 'ideaAssets',
    finalScripts: 'finalScripts'
  }
} as const

// 数据库连接实例
let dbInstance: IDBDatabase | null = null

/**
 * 初始化 IndexedDB 数据库
 */
export async function initDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version)

    request.onerror = () => {
      reject(new Error('无法打开数据库'))
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const transaction = (event.target as IDBOpenDBRequest).transaction!
      const oldVersion = event.oldVersion

      // 版本 1: 创建基础的 ideas, scripts, locales 存储
      if (oldVersion < 1) {
        // 创建 ideas 对象存储
        if (!db.objectStoreNames.contains(DB_CONFIG.stores.ideas)) {
          const ideasStore = db.createObjectStore(DB_CONFIG.stores.ideas, { keyPath: 'id' })
          ideasStore.createIndex('createdAt', 'createdAt', { unique: false })
          ideasStore.createIndex('source', 'source', { unique: false })
          ideasStore.createIndex('starred', 'starred', { unique: false })
        }

        // 创建 scripts 对象存储
        if (!db.objectStoreNames.contains(DB_CONFIG.stores.scripts)) {
          const scriptsStore = db.createObjectStore(DB_CONFIG.stores.scripts, { keyPath: 'id' })
          scriptsStore.createIndex('ideaId', 'ideaId', { unique: false })
          scriptsStore.createIndex('status', 'status', { unique: false })
          scriptsStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // 创建 locales 对象存储
        if (!db.objectStoreNames.contains(DB_CONFIG.stores.locales)) {
          const localesStore = db.createObjectStore(DB_CONFIG.stores.locales, { keyPath: 'id' })
          localesStore.createIndex('scriptId', 'scriptId', { unique: false })
          localesStore.createIndex('locale', 'locale', { unique: false })
          localesStore.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }

      // 版本 2: 添加 ideaAssets 存储用于音频文件
      if (oldVersion < 2) {
        // 创建 ideaAssets 对象存储
        if (!db.objectStoreNames.contains(DB_CONFIG.stores.ideaAssets)) {
          const ideaAssetsStore = db.createObjectStore(DB_CONFIG.stores.ideaAssets, { keyPath: 'id' })
          ideaAssetsStore.createIndex('createdAt', 'createdAt', { unique: false })
          ideaAssetsStore.createIndex('mimeType', 'mimeType', { unique: false })
          ideaAssetsStore.createIndex('sizeBytes', 'sizeBytes', { unique: false })
        }
      }

      // 版本 3: 添加 finalScripts 仓库；修正 scripts 的 ideaId 唯一索引；locales 绑定 finalScript
      if (oldVersion < 3) {
        // finalScripts
        if (!db.objectStoreNames.contains(DB_CONFIG.stores.finalScripts)) {
          const finals = db.createObjectStore(DB_CONFIG.stores.finalScripts, { keyPath: 'id' })
          finals.createIndex('ideaId', 'ideaId', { unique: false })
          finals.createIndex('versionNumber', 'versionNumber', { unique: false })
          // 组合唯一键，确保版本不重复（并发安全）
          finals.createIndex('versionKey', 'versionKey', { unique: true })
          finals.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // scripts: 为 ideaId 建立唯一索引，确保一个 idea 只有一份草稿
        if (db.objectStoreNames.contains(DB_CONFIG.stores.scripts)) {
          const scriptsStore = transaction.objectStore(DB_CONFIG.stores.scripts)
          try {
            // 删除旧的非唯一索引（如果存在）
            scriptsStore.deleteIndex('ideaId')
          } catch {}
          scriptsStore.createIndex('ideaId', 'ideaId', { unique: true })
          try {
            // 删除可能不再需要的旧索引
            scriptsStore.deleteIndex('status')
          } catch {}
          scriptsStore.createIndex('status', 'status', { unique: false })
          try {
            scriptsStore.deleteIndex('createdAt')
          } catch {}
          scriptsStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // locales: 迁移绑定字段与索引
        if (db.objectStoreNames.contains(DB_CONFIG.stores.locales)) {
          const localesStore = transaction.objectStore(DB_CONFIG.stores.locales)
          try { localesStore.deleteIndex('scriptId') } catch {}
          try { localesStore.deleteIndex('locale') } catch {}
          try { localesStore.deleteIndex('createdAt') } catch {}
          localesStore.createIndex('finalScriptId', 'finalScriptId', { unique: false })
          localesStore.createIndex('sourceVersion', 'sourceVersion', { unique: false })
          localesStore.createIndex('locale', 'locale', { unique: false })
          // 每个定稿版本每种语言唯一
          localesStore.createIndex('finalLocaleKey', 'finalLocaleKey', { unique: true })
          localesStore.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    }
  })
}

/**
 * 获取数据库实例
 */
async function getDatabase(): Promise<IDBDatabase> {
  if (!dbInstance) {
    await initDatabase()
  }
  return dbInstance!
}

// ========== Ideas 操作方法 ==========

/**
 * 添加新的创意
 */
export async function addIdea(idea: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>): Promise<Idea> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideas], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.ideas)

  const newIdea: Idea = {
    ...idea,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return new Promise((resolve, reject) => {
    const request = store.add(newIdea)
    
    request.onsuccess = () => resolve(newIdea)
    request.onerror = () => reject(new Error('添加创意失败'))
  })
}

/**
 * 获取所有创意列表
 */
export async function listIdeas(): Promise<Idea[]> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideas], 'readonly')
  const store = transaction.objectStore(DB_CONFIG.stores.ideas)
  const index = store.index('createdAt')

  return new Promise((resolve, reject) => {
    const request = index.getAll()
    
    request.onsuccess = () => {
      // 按创建时间倒序排列
      const ideas = request.result.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      resolve(ideas)
    }
    request.onerror = () => reject(new Error('获取创意列表失败'))
  })
}

/**
 * 根据 ID 获取创意
 */
export async function getIdea(id: string): Promise<Idea | null> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideas], 'readonly')
  const store = transaction.objectStore(DB_CONFIG.stores.ideas)

  return new Promise((resolve, reject) => {
    const request = store.get(id)
    
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(new Error('获取创意失败'))
  })
}

/**
 * 更新创意
 */
export async function updateIdea(id: string, updates: Partial<Omit<Idea, 'id' | 'createdAt'>>): Promise<Idea> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideas], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.ideas)

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id)
    
    getRequest.onsuccess = () => {
      const existingIdea = getRequest.result
      if (!existingIdea) {
        reject(new Error('创意不存在'))
        return
      }

      const updatedIdea: Idea = {
        ...existingIdea,
        ...updates,
        updatedAt: new Date()
      }

      const putRequest = store.put(updatedIdea)
      putRequest.onsuccess = () => resolve(updatedIdea)
      putRequest.onerror = () => reject(new Error('更新创意失败'))
    }
    
    getRequest.onerror = () => reject(new Error('获取创意失败'))
  })
}

/**
 * 删除创意
 */
export async function deleteIdea(id: string): Promise<void> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideas], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.ideas)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('删除创意失败'))
  })
}

// ========== Scripts 操作方法 ==========

/**
 * 添加文案草稿
 */
export async function addScript(script: Omit<ScriptDraft, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScriptDraft> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.scripts], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.scripts)

  const newScript: ScriptDraft = {
    ...script,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  return new Promise((resolve, reject) => {
    const request = store.add(newScript)
    
    request.onsuccess = () => resolve(newScript)
    request.onerror = () => reject(new Error('添加文案失败'))
  })
}

/**
 * 获取文案列表
 */
export async function listScripts(): Promise<ScriptDraft[]> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.scripts], 'readonly')
  const store = transaction.objectStore(DB_CONFIG.stores.scripts)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('获取文案列表失败'))
  })
}

// ========== Locales 操作方法 ==========

/**
 * 添加本地化版本
 */
export async function addLocale(locale: Omit<LocaleVariant, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocaleVariant> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.locales], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.locales)

  const finalLocaleKey = `${locale.finalScriptId}#${locale.locale}`
  const newLocale: LocaleVariant = {
    ...locale,
    id: crypto.randomUUID(),
    // 用于唯一性约束
    // @ts-expect-error attach synthetic key for index only
    finalLocaleKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  return new Promise((resolve, reject) => {
    const request = store.add(newLocale)
    
    request.onsuccess = () => resolve(newLocale)
    request.onerror = () => reject(new Error('添加本地化版本失败'))
  })
}

// ========== FinalScripts 操作方法 ==========

export async function addFinalScript(final: Omit<FinalScript, 'id' | 'createdAt' | 'updatedAt' | 'versionNumber'> & { versionNumber?: number }): Promise<FinalScript> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.finalScripts], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.finalScripts)

  // 计算 versionNumber；如果调用方提供则优先使用（仅用于迁移），否则自动分配
  const assignedVersion = await new Promise<number>((resolve, reject) => {
    if (typeof final.versionNumber === 'number' && final.versionNumber > 0) {
      resolve(final.versionNumber)
      return
    }
    // 读取该 ideaId 下的所有版本，取最大 + 1
    const index = store.index('ideaId')
    const req = index.getAll(final.ideaId)
    req.onsuccess = () => {
      const rows = req.result as any[]
      const max = rows.reduce((m, r) => Math.max(m, Number(r.versionNumber || 0)), 0)
      resolve(max + 1)
    }
    req.onerror = () => reject(new Error('读取版本失败'))
  })

  const versionKey = `${final.ideaId}#${assignedVersion}`
  const newFinal: FinalScript = {
    ...(final as any),
    id: crypto.randomUUID(),
    versionNumber: assignedVersion,
    // @ts-expect-error synthetic index key
    versionKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const request = store.add(newFinal as any)
    request.onsuccess = () => resolve(newFinal)
    request.onerror = () => reject(new Error('添加定稿失败'))
  })
}

export async function listFinalScriptsByIdea(ideaId: string): Promise<FinalScript[]> {
  const db = await getDatabase()
  const store = db.transaction([DB_CONFIG.stores.finalScripts], 'readonly').objectStore(DB_CONFIG.stores.finalScripts)
  const index = store.index('ideaId')
  return new Promise((resolve, reject) => {
    const req = index.getAll(ideaId)
    req.onsuccess = () => {
      const items = (req.result as FinalScript[]).sort((a, b) => a.versionNumber - b.versionNumber)
      resolve(items)
    }
    req.onerror = () => reject(new Error('获取定稿列表失败'))
  })
}

export async function getFinalScriptByVersion(ideaId: string, versionNumber: number): Promise<FinalScript | null> {
  const finals = await listFinalScriptsByIdea(ideaId)
  return finals.find(f => f.versionNumber === versionNumber) || null
}

/**
 * 获取本地化版本列表
 */
export async function listLocales(): Promise<LocaleVariant[]> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.locales], 'readonly')
  const store = transaction.objectStore(DB_CONFIG.stores.locales)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('获取本地化版本列表失败'))
  })
}

// ========== IdeaAssets 操作方法 ==========

/**
 * 添加音频资产
 */
export async function addIdeaAsset(asset: Omit<IdeaAsset, 'id' | 'createdAt'>): Promise<IdeaAsset> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideaAssets], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.ideaAssets)

  const newAsset: IdeaAsset = {
    ...asset,
    id: crypto.randomUUID(),
    createdAt: new Date()
  }

  return new Promise((resolve, reject) => {
    const request = store.add(newAsset)
    
    request.onsuccess = () => resolve(newAsset)
    request.onerror = () => reject(new Error('添加音频资产失败'))
  })
}

/**
 * 根据 ID 获取音频资产
 */
export async function getIdeaAsset(id: string): Promise<IdeaAsset | null> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideaAssets], 'readonly')
  const store = transaction.objectStore(DB_CONFIG.stores.ideaAssets)

  return new Promise((resolve, reject) => {
    const request = store.get(id)
    
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(new Error('获取音频资产失败'))
  })
}

/**
 * 删除音频资产
 */
export async function deleteIdeaAsset(id: string): Promise<void> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideaAssets], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.ideaAssets)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('删除音频资产失败'))
  })
}

// ========== 数据导入导出 ==========

/**
 * 数据导出功能
 */
export async function exportData(): Promise<string> {
  const [ideas, scripts, locales] = await Promise.all([
    listIdeas(),
    listScripts(),
    listLocales()
  ])

  const exportData = {
    version: DB_CONFIG.version,
    timestamp: new Date().toISOString(),
    data: {
      ideas,
      scripts,
      locales
    }
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * 数据导入功能
 */
export async function importData(data: string): Promise<void> {
  const parsedData = JSON.parse(data)
  const db = await getDatabase()
  
  const transaction = db.transaction([
    DB_CONFIG.stores.ideas,
    DB_CONFIG.stores.scripts,
    DB_CONFIG.stores.locales
  ], 'readwrite')

  const ideasStore = transaction.objectStore(DB_CONFIG.stores.ideas)
  const scriptsStore = transaction.objectStore(DB_CONFIG.stores.scripts)
  const localesStore = transaction.objectStore(DB_CONFIG.stores.locales)

  // 导入数据
  if (parsedData.data?.ideas) {
    for (const idea of parsedData.data.ideas) {
      await ideasStore.put(idea)
    }
  }

  if (parsedData.data?.scripts) {
    for (const script of parsedData.data.scripts) {
      await scriptsStore.put(script)
    }
  }

  if (parsedData.data?.locales) {
    for (const locale of parsedData.data.locales) {
      await localesStore.put(locale)
    }
  }
}

// ==================== 兼容层导出（替代 src/lib/idb.ts） ====================

export const IDB_CONFIG = {
  name: DB_CONFIG.name,
  version: DB_CONFIG.version,
  stores: {
    ideas: DB_CONFIG.stores.ideas,
    drafts: DB_CONFIG.stores.scripts,          // map drafts -> scripts
    finalScripts: DB_CONFIG.stores.finalScripts, // map final_scripts -> finalScripts
    localeVariants: DB_CONFIG.stores.locales,  // map locale_variants -> locales
  }
} as const

export async function openDatabase(): Promise<IDBDatabase> {
  return initDatabase()
}

export async function withRead<T>(storeName: string, fn: (store: IDBObjectStore) => T | Promise<T>): Promise<T> {
  const db = await getDatabase()
  const tx = db.transaction([storeName], 'readonly')
  const store = tx.objectStore(storeName)
  const res = await fn(store)
  await txDone(tx)
  return res
}

export async function withWrite<T>(storeName: string, fn: (store: IDBObjectStore) => T | Promise<T>): Promise<T> {
  const db = await getDatabase()
  const tx = db.transaction([storeName], 'readwrite')
  const store = tx.objectStore(storeName)
  const res = await fn(store)
  await txDone(tx)
  return res
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('事务失败'))
    tx.onabort = () => reject(tx.error || new Error('事务中止'))
  })
}

export function idbAdd<T>(store: IDBObjectStore, value: T): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const req = store.add(value as any)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('add 失败'))
  })
}

export function idbPut<T>(store: IDBObjectStore, value: T): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const req = store.put(value as any)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('put 失败'))
  })
}

export function idbGet<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error || new Error('get 失败'))
  })
}

export function idbIndexGetAll<T>(store: IDBObjectStore, indexName: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const idx = store.index(indexName)
    const req = query === undefined ? idx.getAll() : idx.getAll(query)
    req.onsuccess = () => resolve((req.result || []) as T[])
    req.onerror = () => reject(req.error || new Error('index.getAll 失败'))
  })
}

export function idbGetAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve((req.result || []) as T[])
    req.onerror = () => reject(req.error || new Error('getAll 失败'))
  })
}

export function buildSeriesVersionKey(finalScriptId: string, versionNumber: number): string {
  return `${finalScriptId}#${versionNumber}`
}

export function buildFinalLocaleKey(finalScriptId: string, sourceVersion: number, locale: string): string {
  return `${finalScriptId}#${sourceVersion}#${locale}`
}

```

```typescript
/**
 * IndexedDB 封装工具类
 * 
 * 用于本地存储以下数据：
 * 1. Ideas - 创意点子数据
 * 2. Scripts - 文案草稿数据  
 * 3. Locales - 多语种版本数据
 */

import type { Idea, ScriptDraft, LocaleVariant, IdeaAsset, FinalScript } from '@/types/domain'

// 数据库配置
export const DB_CONFIG = {
  name: 'EchoCastWorkshop',
  version: 3,
  stores: {
    ideas: 'ideas',
    scripts: 'scripts', 
    locales: 'locales',
    ideaAssets: 'ideaAssets',
    finalScripts: 'finalScripts'
  }
} as const

// 数据库连接实例
let dbInstance: IDBDatabase | null = null

/**
 * 初始化 IndexedDB 数据库
 */
export async function initDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version)

    request.onerror = () => {
      reject(new Error('无法打开数据库'))
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const transaction = (event.target as IDBOpenDBRequest).transaction!
      const oldVersion = event.oldVersion

      // 版本 1: 创建基础的 ideas, scripts, locales 存储
      if (oldVersion < 1) {
        // 创建 ideas 对象存储
        if (!db.objectStoreNames.contains(DB_CONFIG.stores.ideas)) {
          const ideasStore = db.createObjectStore(DB_CONFIG.stores.ideas, { keyPath: 'id' })
          ideasStore.createIndex('createdAt', 'createdAt', { unique: false })
          ideasStore.createIndex('source', 'source', { unique: false })
          ideasStore.createIndex('starred', 'starred', { unique: false })
        }

        // 创建 scripts 对象存储
        if (!db.objectStoreNames.contains(DB_CONFIG.stores.scripts)) {
          const scriptsStore = db.createObjectStore(DB_CONFIG.stores.scripts, { keyPath: 'id' })
          scriptsStore.createIndex('ideaId', 'ideaId', { unique: false })
          scriptsStore.createIndex('status', 'status', { unique: false })
          scriptsStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // 创建 locales 对象存储
        if (!db.objectStoreNames.contains(DB_CONFIG.stores.locales)) {
          const localesStore = db.createObjectStore(DB_CONFIG.stores.locales, { keyPath: 'id' })
          localesStore.createIndex('scriptId', 'scriptId', { unique: false })
          localesStore.createIndex('locale', 'locale', { unique: false })
          localesStore.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }

      // 版本 2: 添加 ideaAssets 存储用于音频文件
      if (oldVersion < 2) {
        // 创建 ideaAssets 对象存储
        if (!db.objectStoreNames.contains(DB_CONFIG.stores.ideaAssets)) {
          const ideaAssetsStore = db.createObjectStore(DB_CONFIG.stores.ideaAssets, { keyPath: 'id' })
          ideaAssetsStore.createIndex('createdAt', 'createdAt', { unique: false })
          ideaAssetsStore.createIndex('mimeType', 'mimeType', { unique: false })
          ideaAssetsStore.createIndex('sizeBytes', 'sizeBytes', { unique: false })
        }
      }

      // 版本 3: 添加 finalScripts 仓库；修正 scripts 的 ideaId 唯一索引；locales 绑定 finalScript
      if (oldVersion < 3) {
        // finalScripts
        if (!db.objectStoreNames.contains(DB_CONFIG.stores.finalScripts)) {
          const finals = db.createObjectStore(DB_CONFIG.stores.finalScripts, { keyPath: 'id' })
          finals.createIndex('ideaId', 'ideaId', { unique: false })
          finals.createIndex('versionNumber', 'versionNumber', { unique: false })
          // 组合唯一键，确保版本不重复（并发安全）
          finals.createIndex('versionKey', 'versionKey', { unique: true })
          finals.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // scripts: 为 ideaId 建立唯一索引，确保一个 idea 只有一份草稿
        if (db.objectStoreNames.contains(DB_CONFIG.stores.scripts)) {
          const scriptsStore = transaction.objectStore(DB_CONFIG.stores.scripts)
          try {
            // 删除旧的非唯一索引（如果存在）
            scriptsStore.deleteIndex('ideaId')
          } catch {}
          scriptsStore.createIndex('ideaId', 'ideaId', { unique: true })
          try {
            // 删除可能不再需要的旧索引
            scriptsStore.deleteIndex('status')
          } catch {}
          scriptsStore.createIndex('status', 'status', { unique: false })
          try {
            scriptsStore.deleteIndex('createdAt')
          } catch {}
          scriptsStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // locales: 迁移绑定字段与索引
        if (db.objectStoreNames.contains(DB_CONFIG.stores.locales)) {
          const localesStore = transaction.objectStore(DB_CONFIG.stores.locales)
          try { localesStore.deleteIndex('scriptId') } catch {}
          try { localesStore.deleteIndex('locale') } catch {}
          try { localesStore.deleteIndex('createdAt') } catch {}
          localesStore.createIndex('finalScriptId', 'finalScriptId', { unique: false })
          localesStore.createIndex('sourceVersion', 'sourceVersion', { unique: false })
          localesStore.createIndex('locale', 'locale', { unique: false })
          // 每个定稿版本每种语言唯一
          localesStore.createIndex('finalLocaleKey', 'finalLocaleKey', { unique: true })
          localesStore.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    }
  })
}

/**
 * 获取数据库实例
 */
async function getDatabase(): Promise<IDBDatabase> {
  if (!dbInstance) {
    await initDatabase()
  }
  return dbInstance!
}

// ========== Ideas 操作方法 ==========

/**
 * 添加新的创意
 */
export async function addIdea(idea: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>): Promise<Idea> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideas], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.ideas)

  const newIdea: Idea = {
    ...idea,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return new Promise((resolve, reject) => {
    const request = store.add(newIdea)
    
    request.onsuccess = () => resolve(newIdea)
    request.onerror = () => reject(new Error('添加创意失败'))
  })
}

/**
 * 获取所有创意列表
 */
export async function listIdeas(): Promise<Idea[]> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideas], 'readonly')
  const store = transaction.objectStore(DB_CONFIG.stores.ideas)
  const index = store.index('createdAt')

  return new Promise((resolve, reject) => {
    const request = index.getAll()
    
    request.onsuccess = () => {
      // 按创建时间倒序排列
      const ideas = request.result.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      resolve(ideas)
    }
    request.onerror = () => reject(new Error('获取创意列表失败'))
  })
}

/**
 * 根据 ID 获取创意
 */
export async function getIdea(id: string): Promise<Idea | null> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideas], 'readonly')
  const store = transaction.objectStore(DB_CONFIG.stores.ideas)

  return new Promise((resolve, reject) => {
    const request = store.get(id)
    
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(new Error('获取创意失败'))
  })
}

/**
 * 更新创意
 */
export async function updateIdea(id: string, updates: Partial<Omit<Idea, 'id' | 'createdAt'>>): Promise<Idea> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideas], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.ideas)

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id)
    
    getRequest.onsuccess = () => {
      const existingIdea = getRequest.result
      if (!existingIdea) {
        reject(new Error('创意不存在'))
        return
      }

      const updatedIdea: Idea = {
        ...existingIdea,
        ...updates,
        updatedAt: new Date()
      }

      const putRequest = store.put(updatedIdea)
      putRequest.onsuccess = () => resolve(updatedIdea)
      putRequest.onerror = () => reject(new Error('更新创意失败'))
    }
    
    getRequest.onerror = () => reject(new Error('获取创意失败'))
  })
}

/**
 * 删除创意
 */
export async function deleteIdea(id: string): Promise<void> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideas], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.ideas)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('删除创意失败'))
  })
}

// ========== Scripts 操作方法 ==========

/**
 * 添加文案草稿
 */
export async function addScript(script: Omit<ScriptDraft, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScriptDraft> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.scripts], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.scripts)

  const newScript: ScriptDraft = {
    ...script,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  return new Promise((resolve, reject) => {
    const request = store.add(newScript)
    
    request.onsuccess = () => resolve(newScript)
    request.onerror = () => reject(new Error('添加文案失败'))
  })
}

/**
 * 获取文案列表
 */
export async function listScripts(): Promise<ScriptDraft[]> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.scripts], 'readonly')
  const store = transaction.objectStore(DB_CONFIG.stores.scripts)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('获取文案列表失败'))
  })
}

// ========== Locales 操作方法 ==========

/**
 * 添加本地化版本
 */
export async function addLocale(locale: Omit<LocaleVariant, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocaleVariant> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.locales], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.locales)

  const finalLocaleKey = `${locale.finalScriptId}#${locale.locale}`
  const newLocale: LocaleVariant = {
    ...locale,
    id: crypto.randomUUID(),
    // 用于唯一性约束
    // @ts-expect-error attach synthetic key for index only
    finalLocaleKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  return new Promise((resolve, reject) => {
    const request = store.add(newLocale)
    
    request.onsuccess = () => resolve(newLocale)
    request.onerror = () => reject(new Error('添加本地化版本失败'))
  })
}

// ========== FinalScripts 操作方法 ==========

export async function addFinalScript(final: Omit<FinalScript, 'id' | 'createdAt' | 'updatedAt' | 'versionNumber'> & { versionNumber?: number }): Promise<FinalScript> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.finalScripts], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.finalScripts)

  // 计算 versionNumber；如果调用方提供则优先使用（仅用于迁移），否则自动分配
  const assignedVersion = await new Promise<number>((resolve, reject) => {
    if (typeof final.versionNumber === 'number' && final.versionNumber > 0) {
      resolve(final.versionNumber)
      return
    }
    // 读取该 ideaId 下的所有版本，取最大 + 1
    const index = store.index('ideaId')
    const req = index.getAll(final.ideaId)
    req.onsuccess = () => {
      const rows = req.result as any[]
      const max = rows.reduce((m, r) => Math.max(m, Number(r.versionNumber || 0)), 0)
      resolve(max + 1)
    }
    req.onerror = () => reject(new Error('读取版本失败'))
  })

  const versionKey = `${final.ideaId}#${assignedVersion}`
  const newFinal = {
    ...(final as any),
    id: crypto.randomUUID(),
    versionNumber: assignedVersion,
    versionKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as FinalScript & { versionKey: string }

  return new Promise((resolve, reject) => {
    const request = store.add(newFinal as any)
    request.onsuccess = () => resolve(newFinal)
    request.onerror = () => reject(new Error('添加定稿失败'))
  })
}

export async function listFinalScriptsByIdea(ideaId: string): Promise<FinalScript[]> {
  const db = await getDatabase()
  const store = db.transaction([DB_CONFIG.stores.finalScripts], 'readonly').objectStore(DB_CONFIG.stores.finalScripts)
  const index = store.index('ideaId')
  return new Promise((resolve, reject) => {
    const req = index.getAll(ideaId)
    req.onsuccess = () => {
      const items = (req.result as FinalScript[]).sort((a, b) => a.versionNumber - b.versionNumber)
      resolve(items)
    }
    req.onerror = () => reject(new Error('获取定稿列表失败'))
  })
}

export async function getFinalScriptByVersion(ideaId: string, versionNumber: number): Promise<FinalScript | null> {
  const finals = await listFinalScriptsByIdea(ideaId)
  return finals.find(f => f.versionNumber === versionNumber) || null
}

/**
 * 获取本地化版本列表
 */
export async function listLocales(): Promise<LocaleVariant[]> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.locales], 'readonly')
  const store = transaction.objectStore(DB_CONFIG.stores.locales)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('获取本地化版本列表失败'))
  })
}

// ========== IdeaAssets 操作方法 ==========

/**
 * 添加音频资产
 */
export async function addIdeaAsset(asset: Omit<IdeaAsset, 'id' | 'createdAt'>): Promise<IdeaAsset> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideaAssets], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.ideaAssets)

  const newAsset: IdeaAsset = {
    ...asset,
    id: crypto.randomUUID(),
    createdAt: new Date()
  }

  return new Promise((resolve, reject) => {
    const request = store.add(newAsset)
    
    request.onsuccess = () => resolve(newAsset)
    request.onerror = () => reject(new Error('添加音频资产失败'))
  })
}

/**
 * 根据 ID 获取音频资产
 */
export async function getIdeaAsset(id: string): Promise<IdeaAsset | null> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideaAssets], 'readonly')
  const store = transaction.objectStore(DB_CONFIG.stores.ideaAssets)

  return new Promise((resolve, reject) => {
    const request = store.get(id)
    
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(new Error('获取音频资产失败'))
  })
}

/**
 * 删除音频资产
 */
export async function deleteIdeaAsset(id: string): Promise<void> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.ideaAssets], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.ideaAssets)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('删除音频资产失败'))
  })
}

// ========== 数据导入导出 ==========

/**
 * 数据导出功能
 */
export async function exportData(): Promise<string> {
  const [ideas, scripts, locales] = await Promise.all([
    listIdeas(),
    listScripts(),
    listLocales()
  ])

  const exportData = {
    version: DB_CONFIG.version,
    timestamp: new Date().toISOString(),
    data: {
      ideas,
      scripts,
      locales
    }
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * 数据导入功能
 */
export async function importData(data: string): Promise<void> {
  const parsedData = JSON.parse(data)
  const db = await getDatabase()
  
  const transaction = db.transaction([
    DB_CONFIG.stores.ideas,
    DB_CONFIG.stores.scripts,
    DB_CONFIG.stores.locales
  ], 'readwrite')

  const ideasStore = transaction.objectStore(DB_CONFIG.stores.ideas)
  const scriptsStore = transaction.objectStore(DB_CONFIG.stores.scripts)
  const localesStore = transaction.objectStore(DB_CONFIG.stores.locales)

  // 导入数据
  if (parsedData.data?.ideas) {
    for (const idea of parsedData.data.ideas) {
      await ideasStore.put(idea)
    }
  }

  if (parsedData.data?.scripts) {
    for (const script of parsedData.data.scripts) {
      await scriptsStore.put(script)
    }
  }

  if (parsedData.data?.locales) {
    for (const locale of parsedData.data.locales) {
      await localesStore.put(locale)
    }
  }
}

// ==================== 兼容层导出（替代 src/lib/idb.ts） ====================

export const IDB_CONFIG = {
  name: DB_CONFIG.name,
  version: DB_CONFIG.version,
  stores: {
    ideas: DB_CONFIG.stores.ideas,
    drafts: DB_CONFIG.stores.scripts,          // map drafts -> scripts
    finalScripts: DB_CONFIG.stores.finalScripts, // map final_scripts -> finalScripts
    localeVariants: DB_CONFIG.stores.locales,  // map locale_variants -> locales
  }
} as const

export async function openDatabase(): Promise<IDBDatabase> {
  return initDatabase()
}

export async function withRead<T>(storeName: string, fn: (store: IDBObjectStore) => T | Promise<T>): Promise<T> {
  const db = await getDatabase()
  const tx = db.transaction([storeName], 'readonly')
  const store = tx.objectStore(storeName)
  const res = await fn(store)
  await txDone(tx)
  return res
}

export async function withWrite<T>(storeName: string, fn: (store: IDBObjectStore) => T | Promise<T>): Promise<T> {
  const db = await getDatabase()
  const tx = db.transaction([storeName], 'readwrite')
  const store = tx.objectStore(storeName)
  const res = await fn(store)
  await txDone(tx)
  return res
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('事务失败'))
    tx.onabort = () => reject(tx.error || new Error('事务中止'))
  })
}

export function idbAdd<T>(store: IDBObjectStore, value: T): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const req = store.add(value as any)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('add 失败'))
  })
}

export function idbPut<T>(store: IDBObjectStore, value: T): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const req = store.put(value as any)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('put 失败'))
  })
}

export function idbGet<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error || new Error('get 失败'))
  })
}

export function idbIndexGetAll<T>(store: IDBObjectStore, indexName: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const idx = store.index(indexName)
    const req = query === undefined ? idx.getAll() : idx.getAll(query)
    req.onsuccess = () => resolve((req.result || []) as T[])
    req.onerror = () => reject(req.error || new Error('index.getAll 失败'))
  })
}

export function idbGetAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve((req.result || []) as T[])
    req.onerror = () => reject(req.error || new Error('getAll 失败'))
  })
}

export function buildSeriesVersionKey(finalScriptId: string, versionNumber: number): string {
  return `${finalScriptId}#${versionNumber}`
}

export function buildFinalLocaleKey(finalScriptId: string, sourceVersion: number, locale: string): string {
  return `${finalScriptId}#${sourceVersion}#${locale}`
}

```

```typescriptreact
// file: src/app/ClientBootstrap.tsx
'use client'
import { useEffect } from 'react'
import { openDatabase } from '@/lib/indexeddb'
import { seed as seedIdeas } from '@/lib/repos/idea-repo'
import { defaultSeed } from '@/mock/seed'

export default function ClientBootstrap() {
  useEffect(() => {
    openDatabase().then(async () => {
      await seedIdeas(defaultSeed.ideas)
    })
  }, [])
  return null
}

```

```typescript
// file: scripts/demo.ts
/**
 * 运行方式：在浏览器控制台或引入到页面执行（本项目前端环境）
 * 用于演示核心流程：创建→生成→发布 v1→再次生成→发布 v2→回滚 v1→发布 v3
 */
import { openDatabase } from '@/lib/indexeddb'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import * as DraftRepo from '@/lib/repos/draft-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import { generateStructuredDraft } from '@/lib/llm/spark-x1'
import { publishDraft } from '@/lib/services/publishDraft'
import { rollbackToVersion } from '@/lib/services/rollbackToVersion'

async function main() {
  await openDatabase()
  const ideas = await IdeaRepo.search('远程')
  const idea = ideas[0]
  console.log('使用点子：', idea?.title)

  let draft = await DraftRepo.findByIdeaId(idea.id)
  if (!draft) {
    draft = await DraftRepo.create({ ideaId: idea.id, title: '', intro: '', bulletPoints: [], cta: '', content: '', status: 'draft' })
  }
  console.log('草稿：', draft)

  const g1 = await generateStructuredDraft({ idea: { id: idea.id, title: idea.title, summary: idea.summary, rawInputText: idea.rawInputText, source: idea.source, createdAt: idea.createdAt }, draft, mode: 'normalize' })
  await DraftRepo.save({ ...draft, ...g1 })
  const v1 = await publishDraft(idea.id)
  console.log('发布 v1:', v1)

  const g2 = await generateStructuredDraft({ idea: { id: idea.id, title: idea.title, summary: idea.summary, rawInputText: idea.rawInputText, source: idea.source, createdAt: idea.createdAt }, draft: { ...draft, ...g1, content: '' }, mode: 'enhance', suggestion: '强调最小投入' })
  draft = await DraftRepo.save({ ...draft, ...g2 })
  const v2 = await publishDraft(idea.id)
  console.log('发布 v2:', v2)

  const rolled = await rollbackToVersion(idea.id, 1)
  console.log('回滚到 v1 草稿:', rolled)
  const v3 = await publishDraft(idea.id)
  console.log('再次发布 v3:', v3)

  const versions = await FinalRepo.getSeriesVersions(idea.id)
  console.log('最终版本列表：', versions.map(v => v.versionNumber))
}

main().catch(console.error)

```

```typescript
// file: src/lib/repos/locale-repo.ts
import { withRead, withWrite, IDB_CONFIG, idbAdd, idbGetAll, buildFinalLocaleKey } from '@/lib/indexeddb'
import type { LocaleVariant } from '@/types/domain'

export async function listByFinal(finalScriptId: string, sourceVersion?: number): Promise<LocaleVariant[]> {
  const items = await withRead<LocaleVariant[]>(IDB_CONFIG.stores.localeVariants, (store) => idbGetAll<LocaleVariant>(store))
  return items.filter((l) => l.finalScriptId === finalScriptId && (sourceVersion ? l.sourceVersion === sourceVersion : true))
}

export async function addLocaleVariant(input: Omit<LocaleVariant, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocaleVariant> {
  const now = new Date().toISOString()
  const record: LocaleVariant = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    // @ts-expect-error synthetic
    finalLocaleKey: buildFinalLocaleKey(input.finalScriptId, input.sourceVersion, input.locale),
  }
  await withWrite(IDB_CONFIG.stores.localeVariants, (store) => idbAdd(store, record as any))
  return record
}

```

```typescript
// file: src/lib/repos/draft-repo.ts
import { withRead, withWrite, IDB_CONFIG, idbGet, idbPut, idbAdd, idbGetAll } from '@/lib/indexeddb'
import type { ScriptDraft } from '@/types/domain'

export async function getById(id: string): Promise<ScriptDraft | null> {
  return withRead<ScriptDraft | null>(IDB_CONFIG.stores.drafts, async (store) => {
    const item = await idbGet<ScriptDraft>(store, id)
    return item ?? null
  })
}

export async function findByIdeaId(ideaId: string): Promise<ScriptDraft | null> {
  const items = await withRead<ScriptDraft[]>(IDB_CONFIG.stores.drafts, (store) => idbGetAll<ScriptDraft>(store))
  return items.find((d) => d.ideaId === ideaId) ?? null
}

export async function listByUpdatedDesc(): Promise<ScriptDraft[]> {
  const rows = await withRead<ScriptDraft[]>(IDB_CONFIG.stores.drafts, (store) => idbGetAll<ScriptDraft>(store))
  return rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function create(draft: Omit<ScriptDraft, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScriptDraft> {
  const now = new Date().toISOString()
  const record: ScriptDraft = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...draft }
  await withWrite(IDB_CONFIG.stores.drafts, (store) => idbAdd(store, record))
  return record
}

export async function save(draft: ScriptDraft): Promise<ScriptDraft> {
  const next: ScriptDraft = { ...draft, updatedAt: new Date().toISOString() }
  await withWrite(IDB_CONFIG.stores.drafts, (store) => idbPut(store, next))
  return next
}

export async function upsertByIdeaId(partial: Omit<ScriptDraft, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScriptDraft> {
  const existing = await findByIdeaId(partial.ideaId)
  if (!existing) {
    return create(partial)
  }
  const merged: ScriptDraft = {
    ...existing,
    ...partial,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }
  await withWrite(IDB_CONFIG.stores.drafts, (store) => idbPut(store, merged))
  return merged
}

export async function remove(id: string): Promise<void> {
  await withWrite(IDB_CONFIG.stores.drafts, (store) => new Promise<void>((resolve, reject) => {
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error || new Error('delete 失败'))
  }))
}

```

```typescript
// file: src/lib/repos/final-repo.ts
import { withRead, withWrite, IDB_CONFIG, idbAdd, idbGetAll, idbGet, idbPut, buildSeriesVersionKey } from '@/lib/indexeddb'
import type { FinalScript } from '@/types/domain'

export interface SeriesMeta {
  finalScriptId: string
  ideaId: string
  maxVersion: number
  updatedAt: string
}

export async function listByUpdatedAtDesc(): Promise<SeriesMeta[]> {
  const items = await withRead<FinalScript[]>(IDB_CONFIG.stores.finalScripts, (store) => idbGetAll<FinalScript>(store))
  const grouped = new Map<string, FinalScript[]>()
  for (const it of items) {
    const arr = grouped.get(it.finalScriptId) || []
    arr.push(it)
    grouped.set(it.finalScriptId, arr)
  }
  const metas: SeriesMeta[] = []
  for (const [seriesId, arr] of grouped) {
    const sorted = arr.slice().sort((a, b) => a.versionNumber - b.versionNumber)
    const maxVersion = sorted[sorted.length - 1]?.versionNumber ?? 0
    const updatedAt = sorted[sorted.length - 1]?.updatedAt ?? new Date().toISOString()
    metas.push({ finalScriptId: seriesId, ideaId: sorted[0].ideaId, maxVersion, updatedAt })
  }
  return metas.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function getSeriesVersions(finalScriptId: string): Promise<FinalScript[]> {
  const items = await withRead<FinalScript[]>(IDB_CONFIG.stores.finalScripts, (store) => idbGetAll<FinalScript>(store))
  return items.filter((i) => i.finalScriptId === finalScriptId).sort((a, b) => a.versionNumber - b.versionNumber)
}

export async function getVersion(finalScriptId: string, versionNumber: number): Promise<FinalScript | null> {
  const list = await getSeriesVersions(finalScriptId)
  return list.find((v) => v.versionNumber === versionNumber) ?? null
}

export async function getMaxVersion(finalScriptId: string): Promise<number> {
  const list = await getSeriesVersions(finalScriptId)
  return list.reduce((m, v) => Math.max(m, v.versionNumber), 0)
}

export async function appendVersion(input: Omit<FinalScript, 'id' | 'createdAt' | 'updatedAt' | 'versionNumber'>, versionNumber?: number): Promise<FinalScript> {
  const now = new Date().toISOString()
  let assigned = versionNumber
  if (typeof assigned !== 'number' || assigned <= 0) {
    const currentMax = await getMaxVersion(input.finalScriptId)
    assigned = currentMax + 1
  }
  const record: FinalScript = {
    ...input,
    id: crypto.randomUUID(),
    versionNumber: assigned!,
    createdAt: now,
    updatedAt: now,
    // @ts-expect-error synthetic index key for unique constraint
    seriesVersionKey: buildSeriesVersionKey(input.finalScriptId, assigned!),
  }
  await withWrite(IDB_CONFIG.stores.finalScripts, (store) => idbAdd(store, record as any))
  return record
}

```

```typescript
// file: src/lib/repos/idea-repo.ts
import { withRead, withWrite, IDB_CONFIG, idbGet, idbGetAll, idbAdd } from '@/lib/indexeddb'
import type { Idea } from '@/types/domain'

export async function getById(id: string): Promise<Idea | null> {
  return withRead<Idea | null>(IDB_CONFIG.stores.ideas, async (store) => {
    const item = await idbGet<Idea>(store, id)
    return item ?? null
  })
}

export async function search(keyword: string): Promise<Idea[]> {
  const q = keyword.trim().toLowerCase()
  if (!q) {
    return withRead<Idea[]>(IDB_CONFIG.stores.ideas, (store) => idbGetAll<Idea>(store))
  }
  const items = await withRead<Idea[]>(IDB_CONFIG.stores.ideas, (store) => idbGetAll<Idea>(store))
  return items.filter((i) =>
    i.title.toLowerCase().includes(q) ||
    (i.summary?.toLowerCase().includes(q) ?? false) ||
    i.tags.some((t) => t.toLowerCase().includes(q))
  )
}

export async function seed(ideas: Idea[]): Promise<void> {
  // 仅在空库时注入
  const existing = await withRead<Idea[]>(IDB_CONFIG.stores.ideas, (store) => idbGetAll<Idea>(store))
  if (existing.length > 0) return
  await withWrite<void>(IDB_CONFIG.stores.ideas, async (store) => {
    for (const idea of ideas) {
      await idbAdd(store, idea)
    }
  })
}

```

- 我已整合 IndexedDB 封装：保留并扩展 `src/lib/indexeddb.ts`，新增兼容导出 `IDB_CONFIG`、`openDatabase`、`withRead/withWrite`、`idbAdd/idbPut/idbGet/idbGetAll/idbIndexGetAll`、`buildSeriesVersionKey/buildFinalLocaleKey`，替代原先 `src/lib/idb.ts` 的能力。
- 批量替换所有 `@/lib/idb` 引用为 `@/lib/indexeddb`，并删除了 `src/lib/idb.ts`。
- 修复类型与索引键写入，确保 `finalScripts` 的 `versionKey` 写入无 linter 报错。
- 全项目通过静态检查，无新增报错。

---

**User**

请你修复问题，当我们在草稿表单中，手动修改各项文本之后，再次点击发布，发布的内容并没有包含我们修改的内容，请你检查发布为定稿操作时，获取数据的逻辑，并解决问题

---

**Cursor**

```typescriptreact
// file: src/app/(nav)/drafts/[id]/page.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as DraftRepo from '@/lib/repos/draft-repo'
import * as IdeaRepo from '@/lib/repos/idea-repo'
import * as FinalRepo from '@/lib/repos/final-repo'
import IdeaSummary from '@/components/IdeaSummary'
import DraftEditor from '@/components/DraftEditor'
import SuggestBox from '@/components/SuggestBox'
import { useSaveHotkey } from '@/utils/hotkeys'
import { useToast } from '@/components/Toast'
import { publishDraft } from '@/lib/services/publishDraft'

export default function DraftDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { show } = useToast()

  const [draft, setDraft] = useState<any | null>(null)
  const [idea, setIdea] = useState<any | null>(null)
  const [latestVersion, setLatestVersion] = useState<number>(0)

  useEffect(() => {
    if (!id) return
    (async () => {
      const d = await DraftRepo.getById(id)
      if (!d) { show('草稿不存在', 'error'); router.push('/drafts'); return }
      setDraft(d)
      const i = await IdeaRepo.getById(d.ideaId)
      setIdea(i)
      const max = await FinalRepo.getMaxVersion(d.ideaId)
      setLatestVersion(max)
    })()
  }, [id])

  useSaveHotkey(async () => {
    if (!draft) return
    try {
      // 先保存当前编辑中的草稿，确保发布读取到的是最新内容
      await DraftRepo.save(draft)
      const res = await publishDraft(draft.ideaId)
      setLatestVersion(res.versionNumber)
      show(`已发布为 v${res.versionNumber}`, 'success')
    } catch (e) {
      show('发布失败，请重试', 'error')
    }
  })

  const onChange = (next: any) => setDraft(next)

  async function applyFourFields(four: { title: string; intro: string; bulletPoints: string[]; cta: string; content: string }) {
    if (!draft) return
    const merged = { ...draft, ...four }
    const saved = await DraftRepo.save(merged)
    setDraft(saved)
  }

  if (!draft || !idea) return <div className="max-w-4xl mx-auto px-4 py-8">加载中…</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">草稿编辑</h1>
        <div className="flex items-center gap-3">
          {latestVersion > 0 && (
            <a className="text-sm text-blue-600 hover:underline" href={`/finals/${draft.ideaId}`}>最新定稿 v{latestVersion}</a>
          )}
          <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={async () => {
            try {
              // 发布前保存当前草稿的最新更改
              await DraftRepo.save(draft)
              const res = await publishDraft(draft.ideaId)
              setLatestVersion(res.versionNumber)
              show(`已发布为 v${res.versionNumber}`, 'success')
            } catch (e) {
              show('发布失败，请重试', 'error')
            }
          }} aria-label="发布">发布</button>
        </div>
      </div>

      <IdeaSummary idea={idea} />

      <div className="bg-white rounded-lg shadow p-4">
        <DraftEditor draft={draft} onChange={onChange} />
      </div>

      <SuggestBox idea={idea} draft={draft} onApply={applyFourFields} />
    </div>
  )
}

```

已修复。原因是发布时服务端从 IndexedDB 读取草稿，但页面内未先把编辑态落库，导致发布读取到旧值。

变更：
- 在 `app/(nav)/drafts/[id]/page.tsx` 中，发布按钮与 Cmd/Ctrl+S 热键触发发布前，先执行 `await DraftRepo.save(draft)`，确保最新编辑内容已持久化，再调用 `publishDraft(draft.ideaId)`。

请在草稿页手动修改后再次点击发布，内容应与最新编辑一致。

---

**User**

请你优化定稿的详情布局，更加符合现代化，美化详情的展示样式 

---

**Cursor**

```typescriptreact
// file: src/app/(nav)/finals/[finalScriptId]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as FinalRepo from '@/lib/repos/final-repo'
import FinalTimeline from '@/components/FinalTimeline'
import { rollbackToVersion } from '@/lib/services/rollbackToVersion'
import { useToast } from '@/components/Toast'
import { formatRelativeTime } from '@/utils/format'

export default function FinalDetailPage() {
  const params = useParams<{ finalScriptId: string }>()
  const finalScriptId = params.finalScriptId
  const router = useRouter()
  const { show } = useToast()

  const [versions, setVersions] = useState<any[]>([])
  const [current, setCurrent] = useState<number | undefined>(undefined)

  useEffect(() => {
    (async () => {
      const list = await FinalRepo.getSeriesVersions(finalScriptId)
      setVersions(list)
      setCurrent(list[list.length - 1]?.versionNumber)
    })()
  }, [finalScriptId])

  const selected = versions.find((v) => v.versionNumber === current)

  async function rollback() {
    if (!current) return
    try {
      const draft = await rollbackToVersion(finalScriptId, current)
      show('已回滚到草稿', 'success')
      router.push(`/drafts/${draft.id}`)
    } catch (e) {
      show('回滚失败', 'error')
    }
  }

  if (versions.length === 0) return <div className="max-w-6xl mx-auto px-4 py-10 text-center text-gray-500">暂无定稿版本</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* Sidebar */}
      <aside className="md:col-span-4 lg:col-span-3 md:sticky top-24 self-start">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-gray-700 tracking-wider">版本时间线</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <FinalTimeline versions={versions} current={current} onSelect={setCurrent} />
        </div>
      </aside>

      {/* Content */}
      <section className="md:col-span-8 lg:col-span-9">
        {selected && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-indigo-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-600 text-white">v{selected.versionNumber}</span>
                    <span className="text-xs text-blue-700/80 bg-white/70 px-2 py-0.5 rounded-full border border-blue-100">{selected.status === 'published' ? '已发布' : '已归档'}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{selected.title}</h1>
                </div>
                <div className="text-right min-w-[160px]">
                  <div className="text-xs text-gray-500">更新时间</div>
                  <div className="text-sm font-medium text-gray-700">{formatRelativeTime(selected.updatedAt)}</div>
                  {selected.publishedAt && (
                    <div className="mt-1 text-xs text-gray-500">发布于 {new Date(selected.publishedAt).toLocaleString()}</div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {/* 预留元数据标签位 */}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  共 {selected.bulletPoints?.length || 0} 个要点
                </div>
                <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors" onClick={rollback} aria-label="回滚到此版本">回滚到此版本</button>
              </div>
            </div>

            {/* Intro */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">引子</h3>
              <p className="text-gray-800 leading-7">{selected.intro}</p>
            </div>

            {/* Bullets */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">要点</h3>
              <ul className="space-y-2">
                {selected.bulletPoints?.map((b: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-500"></span>
                    <span className="text-gray-800 leading-7">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="text-sm font-semibold text-emerald-900 mb-2">行动号召</div>
              <p className="text-emerald-900/90">{selected.cta}</p>
            </div>

            {/* Full content */}
            {selected.content && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-sm font-semibold text-gray-700">完整文案</h3>
                </div>
                <div className="p-6">
                  <pre className="text-sm whitespace-pre-wrap leading-6 text-gray-800">{selected.content}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

```

- 已优化定稿详情布局：新增渐变头部卡片、时间线侧栏卡片化、分区展示“引子/要点/CTA/完整文案”，更现代、层次更清晰，细节使用阴影、圆角与语义化配色。
- 变更文件：`src/app/(nav)/finals/[finalScriptId]/page.tsx`（仅样式与结构优化，无业务逻辑变动）。

---

**User**

请你继续优化定稿详情布局，时间线的浮动需要去掉，然后要考虑文本最大程度的基础上进一步优化现有布局

---

**Cursor**

```typescriptreact
// file: src/app/(nav)/finals/[finalScriptId]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as FinalRepo from '@/lib/repos/final-repo'
import FinalTimeline from '@/components/FinalTimeline'
import { rollbackToVersion } from '@/lib/services/rollbackToVersion'
import { useToast } from '@/components/Toast'
import { formatRelativeTime } from '@/utils/format'

export default function FinalDetailPage() {
  const params = useParams<{ finalScriptId: string }>()
  const finalScriptId = params.finalScriptId
  const router = useRouter()
  const { show } = useToast()

  const [versions, setVersions] = useState<any[]>([])
  const [current, setCurrent] = useState<number | undefined>(undefined)

  useEffect(() => {
    (async () => {
      const list = await FinalRepo.getSeriesVersions(finalScriptId)
      setVersions(list)
      setCurrent(list[list.length - 1]?.versionNumber)
    })()
  }, [finalScriptId])

  const selected = versions.find((v) => v.versionNumber === current)

  async function rollback() {
    if (!current) return
    try {
      const draft = await rollbackToVersion(finalScriptId, current)
      show('已回滚到草稿', 'success')
      router.push(`/drafts/${draft.id}`)
    } catch (e) {
      show('回滚失败', 'error')
    }
  }

  if (versions.length === 0) return <div className="max-w-6xl mx-auto px-4 py-10 text-center text-gray-500">暂无定稿版本</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* Sidebar */}
      <aside className="md:col-span-4 lg:col-span-3">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-gray-700 tracking-wider">版本时间线</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <FinalTimeline versions={versions} current={current} onSelect={setCurrent} />
        </div>
      </aside>

      {/* Content */}
      <section className="md:col-span-8 lg:col-span-9">
        {selected && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-indigo-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-600 text-white">v{selected.versionNumber}</span>
                    <span className="text-xs text-blue-700/80 bg-white/70 px-2 py-0.5 rounded-full border border-blue-100">{selected.status === 'published' ? '已发布' : '已归档'}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{selected.title}</h1>
                </div>
                <div className="text-right min-w-[160px]">
                  <div className="text-xs text-gray-500">更新时间</div>
                  <div className="text-sm font-medium text-gray-700">{formatRelativeTime(selected.updatedAt)}</div>
                  {selected.publishedAt && (
                    <div className="mt-1 text-xs text-gray-500">发布于 {new Date(selected.publishedAt).toLocaleString()}</div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {/* 预留元数据标签位 */}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  共 {selected.bulletPoints?.length || 0} 个要点
                </div>
                <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors" onClick={rollback} aria-label="回滚到此版本">回滚到此版本</button>
              </div>
            </div>

            {/* Intro */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">引子</h3>
              <div className="text-gray-800 leading-7 max-w-[72ch] break-words">{selected.intro}</div>
            </div>

            {/* Bullets */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">要点</h3>
              <ul className="space-y-2 max-w-[72ch]">
                {selected.bulletPoints?.map((b: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 break-words">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-500"></span>
                    <span className="text-gray-800 leading-7">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="text-sm font-semibold text-emerald-900 mb-2">行动号召</div>
              <p className="text-emerald-900/90 max-w-[72ch] break-words leading-7">{selected.cta}</p>
            </div>

            {/* Full content */}
            {selected.content && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-sm font-semibold text-gray-700">完整文案</h3>
                </div>
                <div className="p-6">
                  <div className="text-sm leading-7 text-gray-800 max-w-[80ch] break-words whitespace-pre-wrap">{selected.content}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

```

- 去掉了时间线侧栏的粘性浮动，使整体随页面自然滚动。
- 提升长文本可读性：为引子、要点、CTA、完整文案增加最大行宽、自动换行与更舒适的行高，避免超长内容铺满屏幕。
- 头部卡片保留版本/状态/时间信息，主体采用卡片化分区展示，风格统一现代。

