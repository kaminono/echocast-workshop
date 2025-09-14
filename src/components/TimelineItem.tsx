'use client'

/**
 * 时间线项目组件
 * 
 * 显示单个时间线项目的卡片
 */

import React from 'react'
import { useRouter } from 'next/navigation'
import { useTimezone } from './TimezoneProvider'
import { formatDateTime } from '@/lib/time'
import type { TimelineItem as TimelineItemType } from '@/types/domain'

interface TimelineItemProps {
  /** 时间线项目数据 */
  item: TimelineItemType
  /** 是否显示版本号 */
  showVersion?: boolean
}

export default function TimelineItem({ item, showVersion = true }: TimelineItemProps) {
  const router = useRouter()
  const { timezone } = useTimezone()

  // 处理点击跳转
  const handleClick = () => {
    // 跳转到定稿详情页面，使用 scriptId
    router.push(`/finals/${item.scriptId}`)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  // 获取发布时间显示
  const getPublishTimeDisplay = () => {
    if (!item.publishAtUtc) {
      return '未设置'
    }
    
    try {
      return formatDateTime(item.publishAtUtc, timezone)
    } catch {
      return '时间格式错误'
    }
  }



  return (
    <div 
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`查看定稿详情：${item.title}`}
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {/* 发布时间 - 大号字，加粗 */}
      <div className="mb-3">
        <div className="text-xl font-bold text-gray-900">
          {getPublishTimeDisplay()}
        </div>
      </div>

      {/* 标题 - 单行溢出省略 */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 truncate" title={item.title}>
          {item.title}
        </h3>
      </div>

      {/* 徽标行 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          版本 v{item.version}
        </span>
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {item.locale.toUpperCase()}
        </span>
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          {item.platform}
        </span>
      </div>

      {/* 更新时间 */}
      {item.updatedAt && (
        <div className="text-sm text-gray-500">
          更新时间：{formatDateTime(item.updatedAt, timezone)}
        </div>
      )}
    </div>
  )
}