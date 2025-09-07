'use client'

/**
 * 时间轴轨道组件（全高度竖线）
 * 父容器需要 relative；本组件作为绝对定位的纵向细线贯穿整个分组列表区。
 */

import React from 'react'

interface TimelineRailProps {
  className?: string
  children?: React.ReactNode
}

export default function TimelineRail({ className = '', children }: TimelineRailProps) {
  return (
    <>
      <div
        aria-hidden
        className={`pointer-events-none absolute top-0 bottom-0 left-[36px] sm:left-[24px] w-px bg-gray-200 dark:bg-gray-700 ${className}`}
      />
      {children}
    </>
  )
}