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
  /** 变更说明 */
  changeLog?: string
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
