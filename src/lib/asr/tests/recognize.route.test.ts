/**
 * API 路由测试
 * 
 * 测试 /api/asr/recognize 路由的输入验证和响应格式
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../../../app/api/asr/recognize/route';
import { IATError, IATErrorCode } from '../types';

// Mock IAT 客户端
vi.mock('../iatClient', () => ({
  transcribe: vi.fn()
}));

describe('ASR API 路由测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/asr/recognize', () => {
    it('应当成功处理有效的音频转写请求', async () => {
      const { transcribe } = await import('../iatClient');
      
      // Mock 成功的转写结果
      vi.mocked(transcribe).mockResolvedValue({
        text: '这是转写结果',
        raw: {},
        isFinal: true
      });

      const audioData = Buffer.from('test audio').toString('base64');
      const requestBody = {
        audio: audioData,
        addPunctuation: true
      };

      const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.text).toBe('这是转写结果');
      expect(result.processingTime).toBeTypeOf('number');
    });

    it('应当处理音频参数配置', async () => {
      const { transcribe } = await import('../iatClient');
      
      vi.mocked(transcribe).mockResolvedValue({
        text: '配置测试',
        raw: {},
        isFinal: true
      });

      const audioData = Buffer.from('test audio').toString('base64');
      const requestBody = {
        audio: audioData,
        audioParams: {
          sampleRate: 8000,
          encoding: 'speex'
        },
        languageParams: {
          language: 'en_us'
        },
        addPunctuation: false
      };

      const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // 验证传递给 transcribe 的参数
      expect(transcribe).toHaveBeenCalledWith(
        audioData,
        expect.objectContaining({
          audioParams: expect.objectContaining({
            sampleRate: 8000,
            encoding: 'speex'
          }),
          languageParams: expect.objectContaining({
            language: 'en_us'
          }),
          punc: 0
        })
      );
    });

    describe('输入验证', () => {
      it('应当拒绝空请求体', async () => {
        const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
          method: 'POST',
          body: '',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await POST(request);
        expect(response.status).toBe(400);

        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('INVALID_JSON');
      });

      it('应当拒绝无效的JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
          method: 'POST',
          body: 'invalid json',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await POST(request);
        expect(response.status).toBe(400);

        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('INVALID_JSON');
      });

      it('应当拒绝缺少 audio 字段的请求', async () => {
        const requestBody = {
          addPunctuation: true
        };

        const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await POST(request);
        expect(response.status).toBe(400);

        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('VALIDATION_ERROR');
        expect(result.error).toContain('audio');
      });

      it('应当拒绝无效的 Base64 音频数据', async () => {
        const requestBody = {
          audio: ''  // 空字符串会导致解码后长度为0
        };

        const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await POST(request);
        expect(response.status).toBe(400);

        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('VALIDATION_ERROR');
      });

      it('应当验证音频参数', async () => {
        const audioData = Buffer.from('test').toString('base64');
        const requestBody = {
          audio: audioData,
          audioParams: {
            sampleRate: 44100, // 无效的采样率
            encoding: 'mp3'    // 无效的编码
          }
        };

        const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await POST(request);
        expect(response.status).toBe(400);

        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('VALIDATION_ERROR');
      });

      it('应当验证语言参数', async () => {
        const audioData = Buffer.from('test').toString('base64');
        const requestBody = {
          audio: audioData,
          languageParams: {
            language: 'fr_fr', // 不支持的语言
            accent: 'beijing'  // 无效的方言
          }
        };

        const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      });
    });

    describe('错误处理', () => {
      it('应当正确映射鉴权错误', async () => {
        const { transcribe } = await import('../iatClient');
        
        vi.mocked(transcribe).mockRejectedValue(
          new IATError(IATErrorCode.AUTH_FAILED, '鉴权失败')
        );

        const audioData = Buffer.from('test').toString('base64');
        const requestBody = { audio: audioData };

        const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await POST(request);
        expect(response.status).toBe(401);

        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(IATErrorCode.AUTH_FAILED);
        expect(result.error).toBe('鉴权失败');
      });

      it('应当正确映射配额错误', async () => {
        const { transcribe } = await import('../iatClient');
        
        vi.mocked(transcribe).mockRejectedValue(
          new IATError(IATErrorCode.QUOTA_EXCEEDED, '配额不足')
        );

        const audioData = Buffer.from('test').toString('base64');
        const requestBody = { audio: audioData };

        const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await POST(request);
        expect(response.status).toBe(429);

        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(IATErrorCode.QUOTA_EXCEEDED);
      });

      it('应当正确映射超时错误', async () => {
        const { transcribe } = await import('../iatClient');
        
        vi.mocked(transcribe).mockRejectedValue(
          new IATError(IATErrorCode.TIMEOUT_ERROR, '请求超时')
        );

        const audioData = Buffer.from('test').toString('base64');
        const requestBody = { audio: audioData };

        const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await POST(request);
        expect(response.status).toBe(408);
      });

      it('应当处理未知错误', async () => {
        const { transcribe } = await import('../iatClient');
        
        vi.mocked(transcribe).mockRejectedValue(
          new Error('未知错误')
        );

        const audioData = Buffer.from('test').toString('base64');
        const requestBody = { audio: audioData };

        const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await POST(request);
        expect(response.status).toBe(500);

        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('INTERNAL_ERROR');
      });
    });
  });

  describe('GET /api/asr/recognize', () => {
    it('应当拒绝 GET 请求', async () => {
      const response = await GET();
      expect(response.status).toBe(405);

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('METHOD_NOT_ALLOWED');
    });
  });

  describe('响应格式', () => {
    it('应当包含必要的响应字段', async () => {
      const { transcribe } = await import('../iatClient');
      
      vi.mocked(transcribe).mockResolvedValue({
        text: '响应格式测试',
        raw: { debug: 'info' },
        isFinal: true
      });

      const audioData = Buffer.from('test').toString('base64');
      const requestBody = { audio: audioData };

      const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const result = await response.json();

      // 验证成功响应的必要字段
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('processingTime');
      expect(result.success).toBe(true);
      expect(typeof result.processingTime).toBe('number');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('应当在错误时包含错误字段', async () => {
      const { transcribe } = await import('../iatClient');
      
      vi.mocked(transcribe).mockRejectedValue(
        new IATError(IATErrorCode.PARAM_ERROR, '参数错误')
      );

      const audioData = Buffer.from('test').toString('base64');
      const requestBody = { audio: audioData };

      const request = new NextRequest('http://localhost:3000/api/asr/recognize', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const result = await response.json();

      // 验证错误响应的必要字段
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('errorCode');
      expect(result).toHaveProperty('processingTime');
      expect(result.success).toBe(false);
    });
  });
});
