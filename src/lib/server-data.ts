/**
 * 服务器端数据访问层
 * 
 * 提供服务器端兼容的数据访问方法
 * 注意：这是一个简化版本，实际项目中应该使用真实的数据库
 */

import type { FinalScript, TimelineItem } from '@/types/domain'

// 模拟数据存储（实际项目中应该使用真实的数据库）
let mockFinalScripts: FinalScript[] = []

/**
 * 初始化模拟数据
 */
export function initMockData() {
  if (mockFinalScripts.length === 0) {
    // 创建一些测试数据
    mockFinalScripts = [
      {
        id: '1',
        finalScriptId: '101c5f23-5bcf-4501-be81-8281d83f08ea',
        ideaId: 'idea-1',
        versionNumber: 1,
        title: '测试定稿 1',
        intro: '这是一个测试定稿的引子',
        bulletPoints: ['要点 1', '要点 2', '要点 3'],
        cta: '立即行动',
        content: '完整的测试内容',
        status: 'published',
        publishAtUtc: '2025-01-15T10:00:00.000Z',
        publishStatus: 'scheduled',
        createdAt: '2025-01-15T08:00:00.000Z',
        updatedAt: '2025-01-15T08:00:00.000Z'
      },
      {
        id: '2',
        finalScriptId: '101c5f23-5bcf-4501-be81-8281d83f08ea',
        ideaId: 'idea-1',
        versionNumber: 2,
        title: '测试定稿 2',
        intro: '这是第二个版本的引子',
        bulletPoints: ['新要点 1', '新要点 2'],
        cta: '开始体验',
        content: '第二个版本的完整内容',
        status: 'published',
        publishAtUtc: undefined,
        publishStatus: 'unscheduled',
        createdAt: '2025-01-15T09:00:00.000Z',
        updatedAt: '2025-01-15T09:00:00.000Z'
      }
    ]
  }
}

/**
 * 获取所有 FinalScript
 */
export async function getAllFinalScripts(): Promise<FinalScript[]> {
  initMockData()
  return [...mockFinalScripts]
}

/**
 * 根据 finalScriptId 获取版本列表
 */
export async function getSeriesVersions(finalScriptId: string): Promise<FinalScript[]> {
  initMockData()
  return mockFinalScripts
    .filter(f => f.finalScriptId === finalScriptId)
    .sort((a, b) => a.versionNumber - b.versionNumber)
}

/**
 * 根据 finalScriptId 和版本号获取特定版本
 */
export async function getVersion(finalScriptId: string, versionNumber: number): Promise<FinalScript | null> {
  initMockData()
  return mockFinalScripts.find(f => 
    f.finalScriptId === finalScriptId && f.versionNumber === versionNumber
  ) || null
}

/**
 * 更新 FinalScript
 */
export async function updateFinalScript(id: string, updates: Partial<Omit<FinalScript, 'id' | 'createdAt'>>): Promise<FinalScript> {
  initMockData()
  
  const index = mockFinalScripts.findIndex(f => f.id === id)
  if (index === -1) {
    throw new Error('定稿不存在')
  }
  
  const updated = {
    ...mockFinalScripts[index],
    ...updates,
    updatedAt: new Date().toISOString()
  }
  
  mockFinalScripts[index] = updated
  return updated
}

/**
 * 转换为时间线项目
 */
export function toTimelineItem(finalScript: FinalScript): TimelineItem {
  return {
    id: finalScript.id,
    scriptId: finalScript.finalScriptId,
    version: finalScript.versionNumber,
    title: finalScript.title,
    locale: 'zh', // 默认语言，实际应从数据中获取
    platform: 'default', // 默认平台，实际应从数据中获取
    publishAtUtc: finalScript.publishAtUtc || '',
    updatedAt: finalScript.updatedAt
  }
}