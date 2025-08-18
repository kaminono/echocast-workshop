import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { transcribe } from '@/lib/asr/iatClient'
import { IATError, IATErrorCode } from '@/lib/asr/types'

// Mock IAT client
vi.mock('@/lib/asr/iatClient', () => ({
  transcribe: vi.fn()
}))

const mockTranscribe = vi.mocked(transcribe)

describe('/api/asr/recognize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('JSON 格式请求', () => {
    it('应该成功处理有效的 JSON 请求', async () => {
      mockTranscribe.mockResolvedValue({ text: '这是测试文本' })

      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: Buffer.from('test audio data').toString('base64'),
          addPunctuation: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.text).toBe('这是测试文本')
      expect(data.processingTime).toBeTypeOf('number')
    })

    it('应该拒绝无效的 JSON', async () => {
      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe('INVALID_JSON')
    })

    it('应该验证必需的 audio 字段', async () => {
      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe('VALIDATION_ERROR')
      expect(data.error).toContain('audio 字段是必需的')
    })

    it('应该验证 Base64 格式', async () => {
      // 提供无效的 Base64（包含非法字符）
      mockTranscribe.mockRejectedValue(new Error('Invalid base64'))
      
      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: '!' // 完全无效的 Base64
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe('VALIDATION_ERROR')
      expect(data.error).toContain('audio 数据不能为空')
    })

    it('应该验证音频参数', async () => {
      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: Buffer.from('test').toString('base64'),
          audioParams: {
            sampleRate: 44100 // 无效的采样率
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe('VALIDATION_ERROR')
      expect(data.error).toContain('sampleRate 必须是 8000 或 16000')
    })
  })

  describe('FormData 格式请求', () => {
    it('应该成功处理有效的 FormData 请求', async () => {
      mockTranscribe.mockResolvedValue({ text: '这是表单测试文本' })

      const formData = new FormData()
      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' })
      formData.append('file', audioBlob, 'test.webm')
      formData.append('language', 'zh_cn')

      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.text).toBe('这是表单测试文本')
    })

    it('应该拒绝缺少文件的 FormData', async () => {
      const formData = new FormData()
      formData.append('language', 'zh_cn')

      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe('MISSING_FILE')
    })

    it('应该拒绝过大的文件', async () => {
      const formData = new FormData()
      // 创建一个模拟的大文件
      const largeData = new Array(11 * 1024 * 1024).fill('a').join('') // 11MB
      const audioBlob = new Blob([largeData], { type: 'audio/webm' })
      formData.append('file', audioBlob, 'large.webm')

      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe('FILE_TOO_LARGE')
    })

    it('应该拒绝非音频文件', async () => {
      const formData = new FormData()
      const textBlob = new Blob(['not audio'], { type: 'text/plain' })
      formData.append('file', textBlob, 'test.txt')

      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe('INVALID_FILE_TYPE')
    })
  })

  describe('IAT 错误处理', () => {
    it('应该处理参数错误', async () => {
      mockTranscribe.mockRejectedValue(new IATError(IATErrorCode.PARAM_ERROR, '参数错误'))

      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: Buffer.from('test').toString('base64')
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe(IATErrorCode.PARAM_ERROR)
      expect(data.error).toBe('参数错误')
    })

    it('应该处理认证失败', async () => {
      mockTranscribe.mockRejectedValue(new IATError(IATErrorCode.AUTH_FAILED, '认证失败'))

      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: Buffer.from('test').toString('base64')
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe(IATErrorCode.AUTH_FAILED)
    })

    it('应该处理配额超限', async () => {
      mockTranscribe.mockRejectedValue(new IATError(IATErrorCode.QUOTA_EXCEEDED, '配额超限'))

      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: Buffer.from('test').toString('base64')
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe(IATErrorCode.QUOTA_EXCEEDED)
    })

    it('应该处理超时错误', async () => {
      mockTranscribe.mockRejectedValue(new IATError(IATErrorCode.TIMEOUT_ERROR, '请求超时'))

      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: Buffer.from('test').toString('base64')
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(408)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe(IATErrorCode.TIMEOUT_ERROR)
    })

    it('应该处理未知错误', async () => {
      mockTranscribe.mockRejectedValue(new Error('未知错误'))

      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: Buffer.from('test').toString('base64')
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe('INTERNAL_ERROR')
    })
  })

  describe('参数传递', () => {
    it('应该正确传递音频参数到 transcribe', async () => {
      mockTranscribe.mockResolvedValue({ text: '测试' })

      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: Buffer.from('test').toString('base64'),
          audioParams: {
            sampleRate: 8000,
            encoding: 'speex'
          },
          languageParams: {
            language: 'en_us',
            accent: 'mandarin'
          },
          addPunctuation: false
        })
      })

      await POST(request)

      expect(mockTranscribe).toHaveBeenCalledWith(
        expect.any(String),
        {
          audioParams: {
            sampleRate: 8000,
            encoding: 'speex'
          },
          languageParams: {
            language: 'en_us',
            domain: 'iat',
            accent: 'mandarin'
          },
          punc: 0
        }
      )
    })

    it('应该使用默认参数', async () => {
      mockTranscribe.mockResolvedValue({ text: '测试' })

      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: Buffer.from('test').toString('base64')
        })
      })

      await POST(request)

      expect(mockTranscribe).toHaveBeenCalledWith(
        expect.any(String),
        {
          audioParams: {
            sampleRate: 16000,
            encoding: 'raw'
          },
          languageParams: {
            language: 'zh_cn',
            domain: 'iat'
          },
          punc: 1
        }
      )
    })
  })

  describe('HTTP 方法', () => {
    it('应该拒绝 GET 请求', async () => {
      const request = new NextRequest('http://localhost/api/asr/recognize', {
        method: 'GET'
      })

      // 由于我们只测试 POST，这里需要直接导入 GET 函数
      const { GET } = await import('./route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe('METHOD_NOT_ALLOWED')
    })
  })
})
