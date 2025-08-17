'use client'

import { useState, useRef, useEffect } from 'react'

/**
 * 模态弹窗状态类型
 */
type ModalState = 'input' | 'loading' | 'result' | 'error'

/**
 * 优化结果接口
 */
interface OptimizeResult {
  title: string
  summary: string
}

/**
 * 错误信息接口
 */
interface ErrorInfo {
  code: string
  message: string
}

/**
 * 组件属性接口
 */
interface IdeaCreateModalProps {
  /** 是否显示模态弹窗 */
  isOpen: boolean
  /** 关闭模态弹窗的回调 */
  onClose: () => void
  /** 保存创意的回调 */
  onSave: (title: string, summary: string) => Promise<void>
}

/**
 * 创意创建模态弹窗组件
 */
export default function IdeaCreateModal({ isOpen, onClose, onSave }: IdeaCreateModalProps) {
  const [state, setState] = useState<ModalState>('input')
  const [inputText, setInputText] = useState('')
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null)
  const [error, setError] = useState<ErrorInfo | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // 当弹窗打开时，聚焦到文本域
  useEffect(() => {
    if (isOpen && state === 'input' && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen, state])

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && state !== 'loading' && !isSaving) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, state, isSaving])

  // 重置状态
  const resetState = () => {
    setState('input')
    setInputText('')
    setOptimizeResult(null)
    setError(null)
    setIsSaving(false)
  }

  // 处理关闭
  const handleClose = () => {
    if (state === 'loading' || isSaving) {
      return // 加载中不允许关闭
    }

    // 如果有未保存的结果，确认是否关闭
    if (state === 'result' && optimizeResult) {
      if (confirm('优化结果尚未保存，确定要关闭吗？')) {
        resetState()
        onClose()
      }
    } else {
      resetState()
      onClose()
    }
  }

  // 提交优化请求
  const handleSubmit = async () => {
    if (!inputText.trim()) return

    setState('loading')
    setError(null)

    try {
      const response = await fetch('/api/ideas/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: inputText.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '请求失败')
      }

      const result = await response.json()
      setOptimizeResult(result)
      setState('result')
    } catch (err) {
      console.error('优化请求失败:', err)
      setError({
        code: 'OPTIMIZE_FAILED',
        message: err instanceof Error ? err.message : '优化失败，请重试'
      })
      setState('error')
    }
  }

  // 重试优化
  const handleRetry = () => {
    setError(null)
    setState('input')
  }

  // 保存创意
  const handleSave = async () => {
    if (!optimizeResult) return

    setIsSaving(true)
    try {
      await onSave(optimizeResult.title, optimizeResult.summary)
      resetState()
      onClose()
    } catch (err) {
      console.error('保存失败:', err)
      setError({
        code: 'SAVE_FAILED',
        message: err instanceof Error ? err.message : '保存失败，请重试'
      })
      setState('error')
    } finally {
      setIsSaving(false)
    }
  }

  // 如果不显示，返回 null
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
            💡 新建创意
          </h2>
          <button
            onClick={handleClose}
            disabled={state === 'loading' || isSaving}
            className="text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 rounded disabled:opacity-50"
            aria-label="关闭弹窗"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 主体内容 */}
        <div className="p-6">
          {/* 输入阶段 */}
          {state === 'input' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="idea-input" className="block text-sm font-medium text-gray-700 mb-2">
                  请输入您的创意想法
                </label>
                <textarea
                  id="idea-input"
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="描述您的创意想法，我们将帮您优化为更适合播客的内容..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900"
                  maxLength={2000}
                  required
                />
                <div className="text-sm text-gray-500 mt-1">
                  {inputText.length}/2000 字符
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!inputText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  优化创意
                </button>
              </div>
            </div>
          )}

          {/* 加载阶段 */}
          {state === 'loading' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">正在为您优化创意...</p>
            </div>
          )}

          {/* 结果展示阶段 */}
          {state === 'result' && optimizeResult && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-green-800 mb-3">✨ 优化结果</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      播客标题
                    </label>
                    <div className="p-3 bg-white border border-gray-200 rounded text-gray-900">
                      {optimizeResult.title}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      内容摘要
                    </label>
                    <div className="p-3 bg-white border border-gray-200 rounded text-gray-900 whitespace-pre-wrap">
                      {optimizeResult.summary}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setState('input')}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:opacity-50"
                >
                  重新输入
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:opacity-50 flex items-center"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      保存中...
                    </>
                  ) : (
                    '保存创意'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 错误阶段 */}
          {state === 'error' && error && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-red-800 mb-2">❌ 操作失败</h3>
                <p className="text-red-700">{error.message}</p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                >
                  关闭
                </button>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                >
                  重试
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
