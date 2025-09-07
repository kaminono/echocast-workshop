'use client'

/**
 * 发布时间卡片组件
 * 
 * 用于设置和管理 FinalScript 的发布时间
 */

import React, { useState, useEffect } from 'react'
import { useTimezone } from './TimezoneProvider'
import { toUtc, toLocal, isFutureTime, ALLOW_PAST_PUBLISH } from '@/lib/time'
import type { FinalScript } from '@/types/domain'

interface PublishCardProps {
  /** 定稿数据 */
  finalScript: FinalScript
  /** 保存回调 */
  onSave: (publishAtUtc: string | null) => Promise<void>
  /** 是否只读 */
  readOnly?: boolean
}

export default function PublishCard({ finalScript, onSave, readOnly = false }: PublishCardProps) {
  const { timezone, timezoneDisplayName } = useTimezone()
  const [localDateTime, setLocalDateTime] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // 初始化本地时间
  useEffect(() => {
    if (finalScript.publishAtUtc) {
      try {
        const local = toLocal(finalScript.publishAtUtc, timezone)
        // 构建 datetime-local 格式的字符串
        const dateTimeStr = `${local.date.replace(/\//g, '-')}T${local.time}`
        setLocalDateTime(dateTimeStr)
      } catch (error) {
        console.error('Failed to convert UTC to local time:', error)
        setLocalDateTime('')
      }
    } else {
      setLocalDateTime('')
    }
    setHasChanges(false)
  }, [finalScript.publishAtUtc, timezone])

  // 处理时间变更
  const handleDateTimeChange = (value: string) => {
    setLocalDateTime(value)
    setError(null)
    setHasChanges(true)
  }

  // 验证时间
  const validateTime = (dateTimeStr: string): string | null => {
    if (!dateTimeStr) {
      return null // 清除时间是允许的
    }

    try {
      const date = new Date(dateTimeStr)
      if (isNaN(date.getTime())) {
        return '请选择一个有效时间'
      }

      // 检查是否为过去时间
      if (!ALLOW_PAST_PUBLISH && !isFutureTime(dateTimeStr, timezone)) {
        return '不允许设置过去时间'
      }

      return null
    } catch {
      return '时间格式无效'
    }
  }

  // 保存发布时间
  const handleSave = async () => {
    const validationError = validateTime(localDateTime)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let publishAtUtc: string | null = null
      
      if (localDateTime) {
        publishAtUtc = toUtc(localDateTime, timezone)
      }

      await onSave(publishAtUtc)
      setHasChanges(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 清除发布时间
  const handleClear = async () => {
    if (!confirm('确定要清除发布时间吗？')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onSave(null)
      setLocalDateTime('')
      setHasChanges(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : '清除失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 获取发布状态显示
  const getPublishStatusDisplay = () => {
    if (!finalScript.publishAtUtc) {
      return { text: '未设置', color: 'text-gray-500' }
    }

    switch (finalScript.publishStatus) {
      case 'scheduled':
        return { text: '已排期', color: 'text-blue-600' }
      case 'published':
        return { text: '已发布', color: 'text-green-600' }
      case 'paused':
        return { text: '已暂停', color: 'text-yellow-600' }
      default:
        return { text: '未设置', color: 'text-gray-500' }
    }
  }

  const statusDisplay = getPublishStatusDisplay()
  const isPublished = finalScript.publishStatus === 'published'
  const canEdit = !readOnly && !isPublished

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">发布时间</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.color} bg-gray-100`}>
          {statusDisplay.text}
        </span>
      </div>

      {/* 时区信息 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          当前时区：<span className="font-medium">{timezoneDisplayName}</span>
        </p>
      </div>

      {/* 时间选择器 */}
      <div className="mb-4">
        <label htmlFor="publish-datetime" className="block text-sm font-medium text-gray-700 mb-2">
          发布时间
        </label>
        <input
          id="publish-datetime"
          type="datetime-local"
          value={localDateTime}
          onChange={(e) => handleDateTimeChange(e.target.value)}
          disabled={!canEdit || isLoading}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${!canEdit || isLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
          aria-describedby={error ? 'publish-error' : undefined}
        />
        {error && (
          <p id="publish-error" className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      {/* 操作按钮 */}
      {canEdit && (
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isLoading || !!error}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              hasChanges && !error && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
          
          {finalScript.publishAtUtc && (
            <button
              onClick={handleClear}
              disabled={isLoading}
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              清除
            </button>
          )}
        </div>
      )}

      {/* 只读提示 */}
      {isPublished && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            已发布的版本不允许修改发布时间。如需修改，请先取消发布。
          </p>
        </div>
      )}

      {/* 最后更新时间 */}
      {finalScript.updatedAt && (
        <div className="mt-4 text-xs text-gray-500">
          最后更新：{new Date(finalScript.updatedAt).toLocaleString('zh-CN')}
        </div>
      )}
    </div>
  )
}