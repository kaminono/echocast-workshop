'use client'

/**
 * 时间线页面
 * 
 * 显示所有定稿的发布时间线，支持筛选、排序和跳转
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/components/Container'
import TimelineFilters from '@/components/TimelineFilters'
import TimelineList from '@/components/TimelineList'
import TimelineRail from '@/components/TimelineRail'
import { useTimezone } from '@/components/TimezoneProvider'
import { getTimelineState, setTimelineQueryParams, addTimelineStateListener } from '@/lib/stores/timeline'
import type { TimelineQueryParams, TimelineResponse } from '@/types/domain'

export default function TimelinePage() {
  const router = useRouter()
  const { timezoneDisplayName } = useTimezone()
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TimelineQueryParams>({
    page: 1,
    pageSize: 50,
    sort: 'desc' // 默认倒序排列
  })

  // 监听时间线状态变更
  useEffect(() => {
    const unsubscribe = addTimelineStateListener((state) => {
      setTimelineData(state.data)
      setIsLoading(state.isLoading)
      setError(state.error)
    })

    return unsubscribe
  }, [])

  // 加载时间线数据
  const loadTimelineData = async (queryParams: TimelineQueryParams) => {
    try {
      setIsLoading(true)
      setError(null)

      // 直接使用 IndexedDB 获取数据
      const { getAllFinalScripts } = await import('@/lib/indexeddb')
      const allScripts = await getAllFinalScripts()

      // 筛选数据 - 仅显示已排期定稿
      let filteredItems = allScripts.filter(script => {
        // 仅显示已排期定稿（有 publishAtUtc）
        if (!script.publishAtUtc) return false
        
        // 按发布时间筛选
        if (queryParams.from || queryParams.to) {
          const publishDate = new Date(script.publishAtUtc)
          
          if (queryParams.from) {
            const fromDate = new Date(queryParams.from)
            if (publishDate < fromDate) return false
          }
          
          if (queryParams.to) {
            const toDate = new Date(queryParams.to)
            toDate.setHours(23, 59, 59, 999)
            if (publishDate > toDate) return false
          }
        }

        // 按语言筛选
        if (queryParams.locales && queryParams.locales.length > 0) {
          // 这里需要根据实际数据结构调整，暂时使用默认值
          const scriptLocale = 'zh' // 默认语言
          if (!queryParams.locales.includes(scriptLocale)) return false
        }

        // 按平台筛选
        if (queryParams.platforms && queryParams.platforms.length > 0) {
          // 这里需要根据实际数据结构调整，暂时使用默认值
          const scriptPlatform = 'default' // 默认平台
          if (!queryParams.platforms.includes(scriptPlatform)) return false
        }

        // 按关键词搜索
        if (queryParams.q && !script.title.toLowerCase().includes(queryParams.q.toLowerCase())) {
          return false
        }

        return true
      })

      // 排序数据
      filteredItems.sort((a, b) => {
        const aTime = a.publishAtUtc ? new Date(a.publishAtUtc).getTime() : 0
        const bTime = b.publishAtUtc ? new Date(b.publishAtUtc).getTime() : 0
        
        if (queryParams.sort === 'asc') {
          return aTime - bTime
        } else {
          return bTime - aTime
        }
      })

      // 分页处理
      const page = queryParams.page || 1
      const pageSize = queryParams.pageSize || 50
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedItems = filteredItems.slice(startIndex, endIndex)
      const totalPages = Math.ceil(filteredItems.length / pageSize)

      // 转换为时间线项目格式
      const timelineItems = paginatedItems.map(script => ({
        id: script.id,
        scriptId: script.finalScriptId,
        version: script.versionNumber,
        title: script.title,
        locale: 'zh', // 暂时使用默认语言，后续可从多语种数据中获取
        platform: 'default', // 暂时使用默认平台，后续可从发布配置中获取
        publishAtUtc: script.publishAtUtc || '',
        updatedAt: script.updatedAt
      }))

      // 构建响应数据
      const data: TimelineResponse = {
        range: {
          from: queryParams.from || '',
          to: queryParams.to || ''
        },
        items: timelineItems,
        page,
        totalPages,
        total: filteredItems.length
      }

      setTimelineData(data)
    } catch (error) {
      console.error('Failed to load timeline data:', error)
      setError(error instanceof Error ? error.message : '加载失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理筛选条件变更
  const handleFiltersChange = (newFilters: Partial<TimelineQueryParams>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    setTimelineQueryParams(updatedFilters)
    loadTimelineData(updatedFilters)
  }

  // 处理分页
  const handlePageChange = (page: number) => {
    const updatedFilters = { ...filters, page }
    setFilters(updatedFilters)
    setTimelineQueryParams(updatedFilters)
    loadTimelineData(updatedFilters)
  }

  // 初始加载
  useEffect(() => {
    loadTimelineData(filters)
  }, [])

  return (
    <Container>
      <div className="py-8">
        {/* 页面头部 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📅 发布时间线</h1>
          <p className="text-gray-600">管理所有定稿的发布时间，协调内容发布策略。</p>
        </div>

        {/* 页面两列网格：左 72/48px 轨道留白 + 右内容（所有主要块统一宽度与外层样式） */}
        <div className="grid grid-cols-[72px_1fr] gap-6 lg:grid-cols-[72px_1fr] sm:grid-cols-[48px_1fr] sm:gap-4">
          <div className="col-span-2 rounded-2xl border bg-white/60 dark:bg-gray-800/60 backdrop-blur p-5 shadow-sm">
            <TimelineFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              isLoading={isLoading}
            />
          </div>

          {timelineData && (
            <>
              <div className="col-span-2 rounded-2xl border bg-white/60 dark:bg-gray-800/60 backdrop-blur p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">时间线概览</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      共找到 {timelineData.total} 个已排期定稿
                      {timelineData.range.from && timelineData.range.to && (
                        <span>，时间范围：{timelineData.range.from} 至 {timelineData.range.to}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">当前时区：{timezoneDisplayName}</div>
                </div>
              </div>
            </>
          )}

          {error && (
            <>
              <div className="col-span-2 rounded-2xl border bg-white/60 dark:bg-gray-800/60 backdrop-blur p-8 shadow-sm">
                <div className="text-center">
                  <div className="text-red-500 text-6xl mb-4">⚠️</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">加载失败</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                  <button
                    onClick={() => loadTimelineData(filters)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    重试
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 时间轴列表区域（贯穿竖线放在相对容器内） */}
          {!error && (
            <div className="col-span-2 rounded-2xl border bg-white/60 dark:bg-gray-800/60 backdrop-blur p-5 shadow-sm">
              <div className="relative">
                <TimelineList items={timelineData?.items || []} isLoading={isLoading} />
              </div>
            </div>
          )}

          {/* 分页 */}
          {timelineData && timelineData.totalPages > 1 && (
            <>
              <div className="hidden sm:block" aria-hidden />
              <div className="mt-2 flex items-center justify-center">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(filters.page! - 1)}
                    disabled={filters.page! <= 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>

                  {[...Array(timelineData.totalPages)].map((_, i) => {
                    const page = i + 1
                    const isCurrentPage = page === filters.page
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          isCurrentPage
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}

                  <button
                    onClick={() => handlePageChange(filters.page! + 1)}
                    disabled={filters.page! >= timelineData.totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>
    </Container>
  )
}
