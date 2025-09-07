'use client'

/**
 * 时间轴节点组件
 * 
 * 仅布局样式变更：渲染节点圆点
 */

import React from 'react'

interface TimelineNodeProps {
  /** 是否为活跃状态 */
  isActive?: boolean
  /** 点击事件 */
  onClick?: () => void
  /** 可访问性标签 */
  'aria-label'?: string
}

export default function TimelineNode({ isActive = false, onClick, 'aria-label': ariaLabel }: TimelineNodeProps) {
  return (
    <div
      className={`
        relative h-3.5 w-3.5 rounded-full transition-all duration-200 cursor-pointer z-10
        ring-2 ring-blue-600
        ${isActive 
          ? 'bg-white border border-blue-600 shadow-lg shadow-blue-600/25 scale-110' 
          : 'bg-white border border-gray-300 dark:bg-gray-900 dark:border-gray-600 hover:border-blue-400 hover:shadow-md'
        }
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {/* 内圆点 - 采用背景填充表现 */}
      <div className={`
        absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2
        ${isActive ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-500'}
      `} />
    </div>
  )
}