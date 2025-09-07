/**
 * 全局时区管理
 * 
 * 提供时区设置、持久化和上下文管理功能
 */

import { getCurrentTimezone } from './time'

// 时区存储键
const TIMEZONE_STORAGE_KEY = 'echocast_preferred_timezone'

/**
 * 获取用户偏好的时区
 * @returns 时区标识符
 */
export function getPreferredTimezone(): string {
  if (typeof window === 'undefined') {
    return getCurrentTimezone()
  }
  
  try {
    const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY)
    if (stored) {
      return stored
    }
  } catch (error) {
    console.warn('Failed to read timezone from localStorage:', error)
  }
  
  return getCurrentTimezone()
}

/**
 * 设置用户偏好的时区
 * @param timezone 时区标识符
 */
export function setPreferredTimezone(timezone: string): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    localStorage.setItem(TIMEZONE_STORAGE_KEY, timezone)
  } catch (error) {
    console.warn('Failed to save timezone to localStorage:', error)
  }
}

/**
 * 清除用户偏好的时区设置
 */
export function clearPreferredTimezone(): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    localStorage.removeItem(TIMEZONE_STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear timezone from localStorage:', error)
  }
}

/**
 * 时区变更事件类型
 */
export type TimezoneChangeEvent = {
  type: 'timezone-changed'
  timezone: string
}

/**
 * 时区变更事件监听器
 */
type TimezoneChangeListener = (event: TimezoneChangeEvent) => void

// 事件监听器存储
const listeners = new Set<TimezoneChangeListener>()

/**
 * 添加时区变更监听器
 * @param listener 监听器函数
 */
export function addTimezoneChangeListener(listener: TimezoneChangeListener): () => void {
  listeners.add(listener)
  
  // 返回取消监听的函数
  return () => {
    listeners.delete(listener)
  }
}

/**
 * 触发时区变更事件
 * @param timezone 新的时区
 */
export function notifyTimezoneChange(timezone: string): void {
  const event: TimezoneChangeEvent = {
    type: 'timezone-changed',
    timezone
  }
  
  listeners.forEach(listener => {
    try {
      listener(event)
    } catch (error) {
      console.error('Error in timezone change listener:', error)
    }
  })
}

/**
 * 更新时区设置并通知所有监听器
 * @param timezone 新的时区
 */
export function updateTimezone(timezone: string): void {
  setPreferredTimezone(timezone)
  notifyTimezoneChange(timezone)
}