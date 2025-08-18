'use client'

/**
 * 来源筛选选项
 */
export type SourceFilterValue = 'all' | 'text' | 'voice'

interface SourceFilterProps {
  /** 当前选中的筛选值 */
  value: SourceFilterValue
  /** 筛选值变化回调 */
  onChange: (value: SourceFilterValue) => void
  /** 各来源的数量统计 */
  counts?: {
    all: number
    text: number
    voice: number
  }
}

export default function SourceFilter({ value, onChange, counts }: SourceFilterProps) {
  const filterOptions = [
    {
      value: 'all' as const,
      label: '全部',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      count: counts?.all
    },
    {
      value: 'text' as const,
      label: '文本',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      count: counts?.text
    },
    {
      value: 'voice' as const,
      label: '语音',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      count: counts?.voice
    }
  ]

  return (
    <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-lg p-1">
      {filterOptions.map((option) => {
        const isSelected = value === option.value
        
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30
              ${isSelected 
                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
            aria-pressed={isSelected}
            aria-label={`筛选${option.label}创意${option.count !== undefined ? `（${option.count}条）` : ''}`}
          >
            <span className={isSelected ? 'text-blue-600' : 'text-gray-400'}>
              {option.icon}
            </span>
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span className={`
                inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full
                ${isSelected 
                  ? 'bg-blue-200 text-blue-800' 
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
