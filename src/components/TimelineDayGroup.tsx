'use client'

/**
 * 时间轴日期分组组件
 * 
 * 仅布局样式变更：分组头，sticky
 */

import React from 'react'

interface TimelineDayGroupProps {
  /** 日期字符串 */
  date: string
  /** 分组标题 */
  title: string
  /** 子内容 */
  children: React.ReactNode
}

export default function TimelineDayGroup({ date, title, children }: TimelineDayGroupProps) {
  return (
    <div className="mb-8 grid grid-cols-[640px_1fr] gap-6 sm:grid-cols-[640px_1fr] sm:gap-4">
      {/* Sticky 分组头：仅左列小胶囊日期 */}
      <div className="sticky top-20 self-start z-10">
        <div className="inline-flex max-w-[640px] sm:max-w-[480px] items-center justify-center px-2 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-center leading-tight">
          {title}
        </div>
      </div>
      

      {/* 分组内容（跨两列，为了让 Rail 能贯穿） */}
      <div className="col-span-2">
        <div className="relative">
          <div className="space-y-6 sm:space-y-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}