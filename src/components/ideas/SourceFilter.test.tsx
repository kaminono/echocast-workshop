import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SourceFilter, { type SourceFilterValue } from './SourceFilter'

describe('SourceFilter', () => {
  const mockOnChange = vi.fn()
  
  const defaultProps = {
    value: 'all' as SourceFilterValue,
    onChange: mockOnChange,
    counts: {
      all: 10,
      text: 6,
      voice: 4
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该渲染所有筛选选项', () => {
      render(<SourceFilter {...defaultProps} />)
      
      expect(screen.getByText('全部')).toBeInTheDocument()
      expect(screen.getByText('文本')).toBeInTheDocument()
      expect(screen.getByText('语音')).toBeInTheDocument()
    })

    it('应该显示数量统计', () => {
      render(<SourceFilter {...defaultProps} />)
      
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('6')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
    })

    it('应该在没有计数时不显示数量', () => {
      render(
        <SourceFilter
          value="all"
          onChange={mockOnChange}
        />
      )
      
      expect(screen.getByText('全部')).toBeInTheDocument()
      expect(screen.getByText('文本')).toBeInTheDocument()
      expect(screen.getByText('语音')).toBeInTheDocument()
      
      // 不应该有数量显示
      expect(screen.queryByText('10')).not.toBeInTheDocument()
    })
  })

  describe('选中状态', () => {
    it('应该正确显示当前选中项', () => {
      render(<SourceFilter {...defaultProps} value="text" />)
      
      const textButton = screen.getByRole('button', { name: /筛选文本创意/ })
      expect(textButton).toHaveClass('bg-blue-100', 'text-blue-700')
      expect(textButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('应该正确显示未选中项', () => {
      render(<SourceFilter {...defaultProps} value="text" />)
      
      const allButton = screen.getByRole('button', { name: /筛选全部创意/ })
      expect(allButton).not.toHaveClass('bg-blue-100', 'text-blue-700')
      expect(allButton).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('交互', () => {
    it('应该在点击时调用 onChange', () => {
      render(<SourceFilter {...defaultProps} />)
      
      const textButton = screen.getByRole('button', { name: /筛选文本创意/ })
      fireEvent.click(textButton)
      
      expect(mockOnChange).toHaveBeenCalledWith('text')
    })

    it('应该能切换不同的筛选选项', () => {
      render(<SourceFilter {...defaultProps} />)
      
      // 点击语音
      const voiceButton = screen.getByRole('button', { name: /筛选语音创意/ })
      fireEvent.click(voiceButton)
      
      expect(mockOnChange).toHaveBeenCalledWith('voice')
      
      // 点击全部
      const allButton = screen.getByRole('button', { name: /筛选全部创意/ })
      fireEvent.click(allButton)
      
      expect(mockOnChange).toHaveBeenCalledWith('all')
    })
  })

  describe('可访问性', () => {
    it('应该有正确的 ARIA 标签', () => {
      render(<SourceFilter {...defaultProps} />)
      
      const allButton = screen.getByRole('button', { name: '筛选全部创意（10条）' })
      const textButton = screen.getByRole('button', { name: '筛选文本创意（6条）' })
      const voiceButton = screen.getByRole('button', { name: '筛选语音创意（4条）' })
      
      expect(allButton).toBeInTheDocument()
      expect(textButton).toBeInTheDocument()
      expect(voiceButton).toBeInTheDocument()
    })

    it('应该有 focus-visible 样式', () => {
      render(<SourceFilter {...defaultProps} />)
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-black/30')
      })
    })
  })

  describe('边界情况', () => {
    it('应该处理零计数', () => {
      render(
        <SourceFilter
          value="all"
          onChange={mockOnChange}
          counts={{ all: 0, text: 0, voice: 0 }}
        />
      )
      
      // 应该有多个 0，因为每个筛选选项都显示 0
      const zeroElements = screen.getAllByText('0')
      expect(zeroElements).toHaveLength(3) // all, text, voice 都是 0
    })

    it('应该处理大数字计数', () => {
      render(
        <SourceFilter
          value="all"
          onChange={mockOnChange}
          counts={{ all: 999, text: 500, voice: 499 }}
        />
      )
      
      expect(screen.getByText('999')).toBeInTheDocument()
      expect(screen.getByText('500')).toBeInTheDocument()
      expect(screen.getByText('499')).toBeInTheDocument()
    })
  })

  describe('图标显示', () => {
    it('应该为每个选项显示正确的图标', () => {
      render(<SourceFilter {...defaultProps} />)
      
      // 检查 SVG 图标是否存在
      const buttons = screen.getAllByRole('button')
      
      buttons.forEach(button => {
        const svg = button.querySelector('svg')
        expect(svg).toBeInTheDocument()
        expect(svg).toHaveClass('w-4', 'h-4')
      })
    })

    it('应该在选中时改变图标颜色', () => {
      render(<SourceFilter {...defaultProps} value="text" />)
      
      const textButton = screen.getByRole('button', { name: /筛选文本创意/ })
      const iconSpan = textButton.querySelector('span')
      
      expect(iconSpan).toHaveClass('text-blue-600')
    })
  })
})
