'use client'

import { useState, useEffect } from 'react'
import Container from '@/components/Container'
import IdeaCreateModal from '@/components/ideas/IdeaCreateModal'
import { listIdeas, addIdea, updateIdea, deleteIdea, initDatabase } from '@/lib/indexeddb'
import type { Idea } from '@/types/domain'

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 初始化数据库并加载创意列表
  const loadIdeas = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 确保数据库已初始化
      await initDatabase()
      
      // 加载创意列表
      const ideasList = await listIdeas()
      setIdeas(ideasList)
    } catch (err) {
      console.error('加载创意列表失败:', err)
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时加载数据
  useEffect(() => {
    loadIdeas()
  }, [])

  // 处理保存新创意
  const handleSaveIdea = async (title: string, summary: string) => {
    try {
      const newIdea = await addIdea({
        title,
        summary,
        content: summary, // 使用摘要作为内容
        tags: [],
        source: 'text',
        starred: false,
        priority: 3,
        status: 'draft'
      })
      
      // 更新列表（新创意会自动排在最前面）
      setIdeas(prev => [newIdea, ...prev])
    } catch (err) {
      console.error('保存创意失败:', err)
      throw new Error(err instanceof Error ? err.message : '保存失败')
    }
  }

  // 切换星标状态
  const handleToggleStar = async (id: string, starred: boolean) => {
    try {
      const updatedIdea = await updateIdea(id, { starred: !starred })
      setIdeas(prev => prev.map(idea => 
        idea.id === id ? updatedIdea : idea
      ))
    } catch (err) {
      console.error('更新星标失败:', err)
    }
  }

  // 删除创意
  const handleDeleteIdea = async (id: string) => {
    if (!confirm('确定要删除这个创意吗？')) return
    
    try {
      await deleteIdea(id)
      setIdeas(prev => prev.filter(idea => idea.id !== id))
    } catch (err) {
      console.error('删除创意失败:', err)
    }
  }

  // 格式化时间显示
  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  return (
    <Container>
      <div className="py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">💡 创意收集</h1>
              <p className="text-gray-600">
                记录您的创意想法，整理思路，为后续的内容创作做准备。
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>新建创意</span>
            </button>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="space-y-6">
          {/* 加载状态 */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">正在加载创意列表...</p>
            </div>
          )}

          {/* 错误状态 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
              <button
                onClick={loadIdeas}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
              >
                重试
              </button>
            </div>
          )}

          {/* 创意列表 */}
          {!loading && !error && (
            <>
              {ideas.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">还没有创意记录</h3>
                  <p className="text-gray-600 mb-6">点击"新建创意"按钮，开始记录您的想法吧！</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                  >
                    创建第一个创意
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {ideas.map((idea) => (
                    <div key={idea.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{idea.title}</h3>
                            <div className="flex items-center space-x-2">
                              {idea.source && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {idea.source === 'text' ? '文本' : idea.source}
                                </span>
                              )}
                              <span className="text-sm text-gray-500">
                                {formatTime(new Date(idea.createdAt))}
                              </span>
                            </div>
                          </div>
                          
                          {idea.summary && (
                            <p className="text-gray-600 mb-3 leading-relaxed">{idea.summary}</p>
                          )}
                          
                          {idea.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {idea.tags.map((tag, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleToggleStar(idea.id, idea.starred || false)}
                            className={`p-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 ${
                              idea.starred 
                                ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100' 
                                : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-50'
                            }`}
                            aria-label={idea.starred ? '取消星标' : '添加星标'}
                          >
                            <svg className="w-5 h-5" fill={idea.starred ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => handleDeleteIdea(idea.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                            aria-label="删除创意"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 创意创建模态弹窗 */}
        <IdeaCreateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveIdea}
        />
      </div>
    </Container>
  )
}
