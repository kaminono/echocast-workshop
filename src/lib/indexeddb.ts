/**
 * IndexedDB 封装工具类
 * 
 * 用于本地存储以下数据：
 * 1. Ideas - 创意点子数据
 * 2. Scripts - 文案草稿数据  
 * 3. Locales - 多语种版本数据
 */

import type { Idea, ScriptDraft, LocaleVariant, IdeaAsset } from '@/types/domain'

// 数据库配置
export const DB_CONFIG = {
  name: 'EchoCastWorkshop',
  version: 2,
  stores: {
    ideas: 'ideas',
    scripts: 'scripts', 
    locales: 'locales',
    ideaAssets: 'ideaAssets'
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
    createdAt: new Date(),
    updatedAt: new Date()
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

  const newLocale: LocaleVariant = {
    ...locale,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return new Promise((resolve, reject) => {
    const request = store.add(newLocale)
    
    request.onsuccess = () => resolve(newLocale)
    request.onerror = () => reject(new Error('添加本地化版本失败'))
  })
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
