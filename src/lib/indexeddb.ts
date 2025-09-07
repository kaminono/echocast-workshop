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
 * 获取所有 FinalScript
 */
export async function getAllFinalScripts(): Promise<FinalScript[]> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.finalScripts], 'readonly')
  const store = transaction.objectStore(DB_CONFIG.stores.finalScripts)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    
    request.onsuccess = () => {
      const finals = request.result.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      resolve(finals)
    }
    request.onerror = () => reject(new Error('获取所有定稿失败'))
  })
}

/**
 * 更新 FinalScript
 */
export async function updateFinalScript(id: string, updates: Partial<Omit<FinalScript, 'id' | 'createdAt'>>): Promise<FinalScript> {
  const db = await getDatabase()
  const transaction = db.transaction([DB_CONFIG.stores.finalScripts], 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.stores.finalScripts)

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id)
    
    getRequest.onsuccess = () => {
      const existingFinal = getRequest.result
      if (!existingFinal) {
        reject(new Error('定稿不存在'))
        return
      }

      const updatedFinal: FinalScript = {
        ...existingFinal,
        ...updates,
        updatedAt: new Date().toISOString()
      }

      const putRequest = store.put(updatedFinal)
      putRequest.onsuccess = () => resolve(updatedFinal)
      putRequest.onerror = () => reject(new Error('更新定稿失败'))
    }
    
    getRequest.onerror = () => reject(new Error('获取定稿失败'))
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

export function idbDelete(store: IDBObjectStore, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = store.delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error || new Error('delete 失败'))
  })
}
