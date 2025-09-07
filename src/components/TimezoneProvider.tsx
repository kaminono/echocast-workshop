'use client'

/**
 * 时区上下文提供者
 * 
 * 为整个应用提供时区管理功能
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getPreferredTimezone, updateTimezone, addTimezoneChangeListener } from '@/lib/timezone'
import { getTimezoneDisplayName } from '@/lib/time'

interface TimezoneContextType {
  /** 当前时区 */
  timezone: string
  /** 时区显示名称 */
  timezoneDisplayName: string
  /** 设置时区 */
  setTimezone: (timezone: string) => void
  /** 是否正在加载 */
  isLoading: boolean
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined)

interface TimezoneProviderProps {
  children: ReactNode
}

export function TimezoneProvider({ children }: TimezoneProviderProps) {
  const [timezone, setTimezoneState] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // 初始化时区
  useEffect(() => {
    const initTimezone = () => {
      try {
        const preferredTimezone = getPreferredTimezone()
        setTimezoneState(preferredTimezone)
      } catch (error) {
        console.error('Failed to initialize timezone:', error)
        setTimezoneState('Asia/Shanghai') // 默认时区
      } finally {
        setIsLoading(false)
      }
    }

    initTimezone()
  }, [])

  // 监听时区变更事件
  useEffect(() => {
    const unsubscribe = addTimezoneChangeListener((event) => {
      setTimezoneState(event.timezone)
    })

    return unsubscribe
  }, [])

  // 设置时区
  const setTimezone = (newTimezone: string) => {
    updateTimezone(newTimezone)
  }

  // 获取时区显示名称
  const timezoneDisplayName = getTimezoneDisplayName(timezone)

  const value: TimezoneContextType = {
    timezone,
    timezoneDisplayName,
    setTimezone,
    isLoading
  }

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  )
}

/**
 * 使用时区上下文的 Hook
 */
export function useTimezone(): TimezoneContextType {
  const context = useContext(TimezoneContext)
  
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider')
  }
  
  return context
}