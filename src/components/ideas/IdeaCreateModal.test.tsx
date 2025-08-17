import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IdeaCreateModal from './IdeaCreateModal'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('IdeaCreateModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave
  }

  it('应该在关闭状态下不渲染', () => {
    render(
      <IdeaCreateModal
        {...defaultProps}
        isOpen={false}
      />
    )

    expect(screen.queryByText('💡 新建创意')).not.toBeInTheDocument()
  })

  it('应该在打开状态下渲染模态弹窗', () => {
    render(<IdeaCreateModal {...defaultProps} />)

    expect(screen.getByText('💡 新建创意')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/描述您的创意想法/)).toBeInTheDocument()
    expect(screen.getByText('优化创意')).toBeInTheDocument()
  })

  it('应该在文本输入时更新字符计数', async () => {
    const user = userEvent.setup()
    render(<IdeaCreateModal {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(/描述您的创意想法/)
    await user.type(textarea, '这是一个测试输入')

    expect(screen.getByText('7/2000 字符')).toBeInTheDocument()
  })

  it('应该在输入为空时禁用提交按钮', () => {
    render(<IdeaCreateModal {...defaultProps} />)

    const submitButton = screen.getByText('优化创意')
    expect(submitButton).toBeDisabled()
  })

  it('应该在有输入时启用提交按钮', async () => {
    const user = userEvent.setup()
    render(<IdeaCreateModal {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(/描述您的创意想法/)
    const submitButton = screen.getByText('优化创意')

    await user.type(textarea, '测试输入')
    expect(submitButton).not.toBeDisabled()
  })

  it('应该成功提交并显示优化结果', async () => {
    const user = userEvent.setup()
    
    // Mock API 成功响应
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: '优化后的标题',
        summary: '优化后的摘要'
      })
    })

    render(<IdeaCreateModal {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(/描述您的创意想法/)
    const submitButton = screen.getByText('优化创意')

    await user.type(textarea, '我的创意想法')
    await user.click(submitButton)

    // 应该显示加载状态
    expect(screen.getByText('正在为您优化创意...')).toBeInTheDocument()

    // 等待 API 调用完成
    await waitFor(() => {
      expect(screen.getByText('✨ 优化结果')).toBeInTheDocument()
    })

    expect(screen.getByText('优化后的标题')).toBeInTheDocument()
    expect(screen.getByText('优化后的摘要')).toBeInTheDocument()
    expect(screen.getByText('保存创意')).toBeInTheDocument()
  })

  it('应该处理 API 错误', async () => {
    const user = userEvent.setup()
    
    // Mock API 错误响应
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        message: '请求失败'
      })
    })

    render(<IdeaCreateModal {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(/描述您的创意想法/)
    const submitButton = screen.getByText('优化创意')

    await user.type(textarea, '测试输入')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('❌ 操作失败')).toBeInTheDocument()
    })

    expect(screen.getByText('请求失败')).toBeInTheDocument()
    expect(screen.getByText('重试')).toBeInTheDocument()
  })

  it('应该成功保存创意', async () => {
    const user = userEvent.setup()
    
    // 先设置优化结果状态
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: '测试标题',
        summary: '测试摘要'
      })
    })

    mockOnSave.mockResolvedValueOnce(undefined)

    render(<IdeaCreateModal {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(/描述您的创意想法/)
    const submitButton = screen.getByText('优化创意')

    await user.type(textarea, '测试输入')
    await user.click(submitButton)

    // 等待优化结果显示
    await waitFor(() => {
      expect(screen.getByText('保存创意')).toBeInTheDocument()
    })

    const saveButton = screen.getByText('保存创意')
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('测试标题', '测试摘要')
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('应该处理保存错误', async () => {
    const user = userEvent.setup()
    
    // 先设置优化结果状态
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: '测试标题',
        summary: '测试摘要'
      })
    })

    mockOnSave.mockRejectedValueOnce(new Error('保存失败'))

    render(<IdeaCreateModal {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(/描述您的创意想法/)
    const submitButton = screen.getByText('优化创意')

    await user.type(textarea, '测试输入')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('保存创意')).toBeInTheDocument()
    })

    const saveButton = screen.getByText('保存创意')
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('❌ 操作失败')).toBeInTheDocument()
      expect(screen.getByText('保存失败')).toBeInTheDocument()
    })
  })

  it('应该通过点击关闭按钮关闭弹窗', async () => {
    const user = userEvent.setup()
    render(<IdeaCreateModal {...defaultProps} />)

    const closeButton = screen.getByLabelText('关闭弹窗')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('应该通过点击背景关闭弹窗', async () => {
    const user = userEvent.setup()
    render(<IdeaCreateModal {...defaultProps} />)

    const backdrop = screen.getByRole('dialog').parentElement!
    await user.click(backdrop)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('应该通过 ESC 键关闭弹窗', async () => {
    render(<IdeaCreateModal {...defaultProps} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('应该在有未保存结果时提供确认关闭', async () => {
    const user = userEvent.setup()
    
    // Mock window.confirm
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    
    // 先设置优化结果状态
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: '测试标题',
        summary: '测试摘要'
      })
    })

    render(<IdeaCreateModal {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(/描述您的创意想法/)
    const submitButton = screen.getByText('优化创意')

    await user.type(textarea, '测试输入')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('保存创意')).toBeInTheDocument()
    })

    const closeButton = screen.getByLabelText('关闭弹窗')
    await user.click(closeButton)

    expect(mockConfirm).toHaveBeenCalled()
    expect(mockOnClose).toHaveBeenCalled()

    mockConfirm.mockRestore()
  })

  it('应该重新输入时返回初始状态', async () => {
    const user = userEvent.setup()
    
    // 先设置优化结果状态
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: '测试标题',
        summary: '测试摘要'
      })
    })

    render(<IdeaCreateModal {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(/描述您的创意想法/)
    const submitButton = screen.getByText('优化创意')

    await user.type(textarea, '测试输入')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('重新输入')).toBeInTheDocument()
    })

    const retryButton = screen.getByText('重新输入')
    await user.click(retryButton)

    expect(screen.getByPlaceholderText(/描述您的创意想法/)).toBeInTheDocument()
    expect(screen.getByText('优化创意')).toBeInTheDocument()
  })
})
