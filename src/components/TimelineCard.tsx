'use client'

/**
 * 时间轴卡片组件
 * 
 * 仅布局样式变更：承载原 item 信息的卡片骨架
 */

import React from 'react'
import { useTimezone } from './TimezoneProvider'
import { formatDateTime } from '@/lib/time'
import type { TimelineItem } from '@/types/domain'

interface TimelineCardProps {
  /** 时间线项目数据 */
  item: TimelineItem
  /** 点击事件 */
  onClick: () => void
  /** 是否为活跃状态 */
  isActive?: boolean
}

export default function TimelineCard({ item, onClick, isActive = false }: TimelineCardProps) {
  const { timezone } = useTimezone()
  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  // 格式化发布时间显示
  const formatPublishTime = (utcString: string) => {
    if (!utcString) return '未设置'
    
    try {
      return formatDateTime(utcString, timezone)
    } catch {
      return '时间格式错误'
    }
  }

  return (
    <div
      className={`
        rounded-2xl border bg-white/60 dark:bg-gray-800/60 backdrop-blur p-5 shadow-sm transition-all duration-200 cursor-pointer
        hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2
        dark:border-gray-700
        ${isActive ? 'ring-2 ring-blue-600 ring-offset-2 shadow-md' : ''}
      `}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`打开定稿 v${item.version}：${item.title}`}
    >
      {/* 发布时间 - 大号字，加粗 */}
      <div className="mb-3">
        <div className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
          {formatPublishTime(item.publishAtUtc)}
        </div>
      </div>

      {/* 标题 - 单行溢出省略 */}
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate" title={item.title}>
          {item.title}
        </h3>
      </div>

      {/* 徽标行 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          版本 v{item.version}
        </span>
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          {item.locale.toUpperCase()}
        </span>
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
          {item.platform}
        </span>
      </div>

      {/* 更新时间 */}
      {item.updatedAt && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          更新时间：{formatDateTime(item.updatedAt, timezone)}
        </div>
      )}
    </div>
  )
}