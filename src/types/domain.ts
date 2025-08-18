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
  /** 文案标题 */
  title: string
  /** 文案内容 */
  content: string
  /** 版本号 */
  version: number
  /** 文案状态 */
  status: 'draft' | 'reviewing' | 'approved' | 'published'
  /** 目标平台 */
  platforms: string[]
  /** 字数统计 */
  wordCount: number
  /** 版本历史 */
  versionHistory: {
    version: number
    content: string
    changes: string
    createdAt: Date
    createdBy?: string
  }[]
  /** 评论和反馈 */
  feedback?: {
    id: string
    content: string
    type: 'suggestion' | 'approval' | 'concern'
    createdAt: Date
    createdBy?: string
  }[]
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
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
 * 多语种版本实体
 * 
 * 用于存储文案的多语种翻译版本和本地化信息
 */
export interface LocaleVariant {
  /** 唯一标识符 */
  id: string
  /** 关联的文案草稿 ID */
  scriptId: string
  /** 语言代码（如：en, ja, ko, es 等） */
  locale: string
  /** 语言显示名称 */
  languageName: string
  /** 翻译后的标题 */
  title: string
  /** 翻译后的内容 */
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
  /** 发布计划 */
  publishSchedule?: {
    /** 计划发布时间 */
    scheduledAt: Date
    /** 目标时区 */
    timezone: string
    /** 发布平台 */
    platforms: string[]
  }
  /** 质量评分（1-10） */
  qualityScore?: number
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
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
