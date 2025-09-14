'use client'

/**
 * 时间轴列表组件
 * 
 * 仅布局样式变更：实现垂直时间轴布局，保留虚拟滚动/分页
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TimelineRail from './TimelineRail'
import TimelineNode from './TimelineNode'
import TimelineCard from './TimelineCard'
import TimelineDayGroup from './TimelineDayGroup'
import { useTimezone } from './TimezoneProvider'
import { formatDate } from '@/lib/time'
import type { TimelineItem } from '@/types/domain'

interface TimelineListProps {
  /** 时间线项目列表 */
  items: TimelineItem[]
  /** 是否正在加载 */
  isLoading?: boolean
}

export default function TimelineList({ items, isLoading = false }: TimelineListProps) {
  const router = useRouter()
  const { timezone } = useTimezone()
  const [activeItem, setActiveItem] = useState<string | null>(null)

  // 处理项目点击
  const handleItemClick = (item: TimelineItem) => {
    router.push(`/finals/${item.scriptId}`)
  }

  // 处理节点点击
  const handleNodeClick = (item: TimelineItem) => {
    setActiveItem(item.id)
    setTimeout(() => setActiveItem(null), 2000) // 2秒后取消活跃状态
  }

  // 按日期分组
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, TimelineItem[]> = {}
    
    items.forEach(item => {
      // 使用目标时区的年月日作为分组键，保持同一天的聚合
      const utc = new Date(item.publishAtUtc)
      const y = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric' }).format(utc) // 2025
      const m = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, month: '2-digit' }).format(utc) // 09
      const d = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, day: '2-digit' }).format(utc) // 14
      const date = `${y}-${m}-${d}`
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(item)
    })
    
    return groups
  }, [items, timezone])

  // 格式化分组标题
  const formatGroupTitle = (dateKey: string) => {
    // dateKey 是上面构造的 YYYY-MM-DD，与时区一致
    const [y, m, d] = dateKey.split('-').map((s) => parseInt(s, 10))
    const date = new Date(Date.UTC(y, (m - 1), d))
    return formatDate(date, 'zh-CN')
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-[72px_1fr] gap-4 lg:grid-cols-[72px_1fr] sm:grid-cols-[48px_1fr]">
        {/* 加载状态的时间轴 */}
        <div className="flex flex-col items-center">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="relative flex flex-col items-center mb-8">
              <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              {i < 2 && <div className="absolute top-6 left-1/2 w-px h-8 bg-gray-200 dark:bg-gray-700 -translate-x-1/2" />}
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border bg-white/60 dark:bg-gray-800/60 p-4 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📅</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">暂无已排期定稿</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          没有找到已设置发布时间的定稿。去设置发布时间 →
        </p>
        <button
          onClick={() => router.push('/finals')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          去设置发布时间
        </button>
      </div>
    )
  }

  return (
    <div className="relative grid grid-cols-[72px_1fr] gap-6 lg:grid-cols-[72px_1fr] sm:grid-cols-[48px_1fr] sm:gap-4">
      <TimelineRail />
      <div className="col-span-2">
        {Object.entries(groupedItems).map(([dateString, groupItems]) => (
          <div key={dateString} className="mb-8">
            <TimelineDayGroup date={dateString} title={formatGroupTitle(dateString)}>
              <ul className="space-y-6 sm:space-y-5">
                {groupItems.map((item) => (
                  <li key={item.id} className="grid grid-cols-[72px_1fr] gap-6 sm:grid-cols-[48px_1fr] sm:gap-4 items-center">
                    <div className="relative flex items-center justify-center py-2">
                      <div className="relative z-10">
                        <TimelineNode
                          isActive={activeItem === item.id}
                          onClick={() => handleNodeClick(item)}
                          aria-label={`时间轴节点：${item.title}`}
                        />
                      </div>
                      <div className="absolute top-1/2 left-1/2 h-px bg-gray-200 dark:bg-gray-700 -translate-y-1/2 translate-x-2 w-10 sm:w-8" />
                    </div>
                    <TimelineCard
                      item={item}
                      onClick={() => handleItemClick(item)}
                      isActive={activeItem === item.id}
                    />
                  </li>
                ))}
              </ul>
            </TimelineDayGroup>
          </div>
        ))}
      </div>
    </div>
  )
}