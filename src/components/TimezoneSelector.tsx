'use client'

/**
 * 时区选择器组件
 * 
 * 提供时区切换功能，可以集成到导航栏或设置页面
 */

import React, { useState } from 'react'
import { useTimezone } from './TimezoneProvider'
import { getCommonTimezones, searchTimezones } from '@/lib/time'

interface TimezoneSelectorProps {
  /** 是否显示为下拉菜单 */
  asDropdown?: boolean
  /** 是否显示为模态框 */
  asModal?: boolean
  /** 自定义样式类名 */
  className?: string
}

export default function TimezoneSelector({ asDropdown = false, asModal = false, className = '' }: TimezoneSelectorProps) {
  const { timezone, timezoneDisplayName, setTimezone } = useTimezone()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)

  // 获取时区选项
  const getTimezoneOptions = () => {
    if (searchQuery.trim()) {
      return searchTimezones(searchQuery)
    }
    return getCommonTimezones()
  }

  // 处理时区选择
  const handleTimezoneSelect = (selectedTimezone: string) => {
    setTimezone(selectedTimezone)
    setIsOpen(false)
    setShowModal(false)
    setSearchQuery('')
  }

  // 处理搜索
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
  }

  // 下拉菜单模式
  if (asDropdown) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="hidden sm:inline">{timezoneDisplayName}</span>
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            {/* 背景遮罩 */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* 下拉菜单 */}
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              <div className="p-4">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="搜索时区..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="max-h-60 overflow-y-auto">
                  {getTimezoneOptions().map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleTimezoneSelect(option.value)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        option.value === timezone ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.value}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // 模态框模式
  if (asModal) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md ${className}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>时区设置</span>
        </button>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">选择时区</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="搜索时区..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto mb-4">
                  {getTimezoneOptions().map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleTimezoneSelect(option.value)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        option.value === timezone ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.value}</div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // 默认模式：简单按钮
  return (
    <button
      onClick={() => setShowModal(true)}
      className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="hidden sm:inline">{timezoneDisplayName}</span>
    </button>
  )
}