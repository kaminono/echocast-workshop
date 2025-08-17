import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

// Mock AI 工具层
const mockSimpleChat = vi.fn()
vi.mock('@/lib/ai/x1Chat', () => ({
  simpleChat: mockSimpleChat
}))

describe('/api/ideas/optimize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('应该成功处理有效的请求', async () => {
      // 模拟 AI 返回
      mockSimpleChat.mockResolvedValue({
        text: JSON.stringify({
          title: '如何提高工作效率的播客分享',
          summary: '分享实用的时间管理技巧和工作方法，帮助听众提升日常工作效率。'
        })
      })

      const request = new NextRequest('http://localhost:3000/api/ideas/optimize', {
        method: 'POST',
        body: JSON.stringify({
          input: '我想做一个关于提高工作效率的内容'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('title')
      expect(data).toHaveProperty('summary')
      expect(typeof data.title).toBe('string')
      expect(typeof data.summary).toBe('string')
    })

    it('应该处理 AI 返回文本格式的响应', async () => {
      // 模拟 AI 返回文本格式
      mockSimpleChat.mockResolvedValue({
        text: `标题：科技创新对未来的影响
摘要：探讨人工智能、区块链等新兴技术如何改变我们的生活和工作方式。`
      })

      const request = new NextRequest('http://localhost:3000/api/ideas/optimize', {
        method: 'POST',
        body: JSON.stringify({
          input: '科技创新的影响'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('科技创新对未来的影响')
      expect(data.summary).toBe('探讨人工智能、区块链等新兴技术如何改变我们的生活和工作方式。')
    })

    it('应该拒绝空的输入', async () => {
      const request = new NextRequest('http://localhost:3000/api/ideas/optimize', {
        method: 'POST',
        body: JSON.stringify({
          input: ''
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe('VALIDATION_ERROR')
      expect(data.message).toContain('输入内容不能为空')
    })

    it('应该拒绝过长的输入', async () => {
      const longInput = 'a'.repeat(2001)
      
      const request = new NextRequest('http://localhost:3000/api/ideas/optimize', {
        method: 'POST',
        body: JSON.stringify({
          input: longInput
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe('VALIDATION_ERROR')
      expect(data.message).toContain('输入内容过长')
    })

    it('应该处理无效的 JSON 格式', async () => {
      const request = new NextRequest('http://localhost:3000/api/ideas/optimize', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe('INVALID_JSON')
    })

    it('应该处理 AI 超时错误', async () => {
      mockSimpleChat.mockRejectedValue(new Error('请求超时'))

      const request = new NextRequest('http://localhost:3000/api/ideas/optimize', {
        method: 'POST',
        body: JSON.stringify({
          input: '测试输入'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(408)
      expect(data.code).toBe('TIMEOUT')
    })

    it('应该处理 AI 认证错误', async () => {
      mockSimpleChat.mockRejectedValue(new Error('API key 无效'))

      const request = new NextRequest('http://localhost:3000/api/ideas/optimize', {
        method: 'POST',
        body: JSON.stringify({
          input: '测试输入'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.code).toBe('AUTH_ERROR')
    })

    it('应该处理 AI 返回空内容', async () => {
      mockSimpleChat.mockResolvedValue({
        text: ''
      })

      const request = new NextRequest('http://localhost:3000/api/ideas/optimize', {
        method: 'POST',
        body: JSON.stringify({
          input: '测试输入'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe('EMPTY_RESULT')
    })

    it('应该处理缺少必需字段的请求', async () => {
      const request = new NextRequest('http://localhost:3000/api/ideas/optimize', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe('VALIDATION_ERROR')
    })
  })
})
