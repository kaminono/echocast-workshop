'use client'

/**
 * 时间线筛选组件
 * 
 * 提供日期范围、状态和关键词筛选功能
 */

import React, { useState } from 'react'
import { useTimezone } from './TimezoneProvider'
import type { TimelineQueryParams } from '@/types/domain'

interface TimelineFiltersProps {
  /** 当前筛选条件 */
  filters: TimelineQueryParams
  /** 筛选条件变更回调 */
  onFiltersChange: (filters: Partial<TimelineQueryParams>) => void
  /** 是否正在加载 */
  isLoading?: boolean
}

export default function TimelineFilters({ filters, onFiltersChange, isLoading = false }: TimelineFiltersProps) {
  const { timezoneDisplayName } = useTimezone()
  const [isExpanded, setIsExpanded] = useState(false)

  // 处理日期变更
  const handleDateChange = (field: 'from' | 'to', value: string) => {
    onFiltersChange({ [field]: value || undefined })
  }

  // 处理语言筛选变更
  const handleLocalesChange = (locales: string[]) => {
    onFiltersChange({ 
      locales: locales.length > 0 ? locales : undefined,
      page: 1 // 重置到第一页
    })
  }

  // 处理平台筛选变更
  const handlePlatformsChange = (platforms: string[]) => {
    onFiltersChange({ 
      platforms: platforms.length > 0 ? platforms : undefined,
      page: 1 // 重置到第一页
    })
  }

  // 处理关键词变更
  const handleKeywordChange = (keyword: string) => {
    onFiltersChange({ 
      q: keyword || undefined,
      page: 1 // 重置到第一页
    })
  }

  // 处理排序变更
  const handleSortChange = (sort: 'asc' | 'desc') => {
    onFiltersChange({ sort })
  }

  // 清除所有筛选条件
  const handleClearFilters = () => {
    onFiltersChange({
      from: undefined,
      to: undefined,
      locales: undefined,
      platforms: undefined,
      q: undefined,
      page: 1
    })
  }

  // 检查是否有筛选条件
  const hasActiveFilters = !!(filters.from || filters.to || filters.locales?.length || filters.platforms?.length || filters.q)

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">筛选条件</h2>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              disabled={isLoading}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md disabled:opacity-50"
            >
              清除筛选
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        </div>
      </div>

      {/* 时区信息 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          当前时区：<span className="font-medium">{timezoneDisplayName}</span>
        </p>
      </div>

      {/* 基础筛选条件 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 开始日期 */}
        <div>
          <label htmlFor="filter-from" className="block text-sm font-medium text-gray-700 mb-1">
            开始日期
          </label>
          <input
            id="filter-from"
            type="date"
            value={filters.from || ''}
            onChange={(e) => handleDateChange('from', e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* 结束日期 */}
        <div>
          <label htmlFor="filter-to" className="block text-sm font-medium text-gray-700 mb-1">
            结束日期
          </label>
          <input
            id="filter-to"
            type="date"
            value={filters.to || ''}
            onChange={(e) => handleDateChange('to', e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* 语言筛选 */}
        <div>
          <label htmlFor="filter-locales" className="block text-sm font-medium text-gray-700 mb-1">
            语言
          </label>
          <select
            id="filter-locales"
            multiple
            value={filters.locales || []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value)
              handleLocalesChange(selected)
            }}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
          </select>
        </div>

        {/* 排序方式 */}
        <div>
          <label htmlFor="filter-sort" className="block text-sm font-medium text-gray-700 mb-1">
            排序方式
          </label>
          <select
            id="filter-sort"
            value={filters.sort || 'desc'}
            onChange={(e) => handleSortChange(e.target.value as 'asc' | 'desc')}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="desc">按发布时间倒序</option>
            <option value="asc">按发布时间升序</option>
          </select>
        </div>
      </div>

      {/* 展开的筛选条件 */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid md:grid-cols-3 gap-4">
            {/* 平台筛选 */}
            <div>
              <label htmlFor="filter-platforms" className="block text-sm font-medium text-gray-700 mb-1">
                平台
              </label>
              <select
                id="filter-platforms"
                multiple
                value={filters.platforms || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  handlePlatformsChange(selected)
                }}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="spotify">Spotify</option>
                <option value="apple">Apple Podcasts</option>
                <option value="google">Google Podcasts</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>

            {/* 关键词搜索 */}
            <div>
              <label htmlFor="filter-keyword" className="block text-sm font-medium text-gray-700 mb-1">
                关键词搜索
              </label>
              <input
                id="filter-keyword"
                type="text"
                placeholder="搜索标题..."
                value={filters.q || ''}
                onChange={(e) => handleKeywordChange(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* 每页大小 */}
            <div>
              <label htmlFor="filter-page-size" className="block text-sm font-medium text-gray-700 mb-1">
                每页显示
              </label>
              <select
                id="filter-page-size"
                value={filters.pageSize || 50}
                onChange={(e) => onFiltersChange({ pageSize: parseInt(e.target.value, 10), page: 1 })}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value={20}>20 条</option>
                <option value={50}>50 条</option>
                <option value={100}>100 条</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 活跃筛选条件显示 */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {filters.from && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                从 {filters.from}
              </span>
            )}
            {filters.to && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                到 {filters.to}
              </span>
            )}
            {filters.locales && filters.locales.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                语言: {filters.locales.join(', ')}
              </span>
            )}
            {filters.platforms && filters.platforms.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                平台: {filters.platforms.join(', ')}
              </span>
            )}
            {filters.q && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                关键词: {filters.q}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}