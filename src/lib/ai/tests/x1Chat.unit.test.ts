/**
 * x1Chat 单元测试 - 请求构造与错误包装逻辑
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import type { ChatCompletionCreateParams } from 'openai/resources/chat/completions';

// Mock OpenAI 客户端
const mockCreate = vi.fn();
const mockClient = {
  chat: {
    completions: {
      create: mockCreate
    }
  }
};

// Mock openaiCompatClient 模块
vi.mock('../openaiCompatClient', () => ({
  getOpenAICompatClient: () => mockClient,
  formatAPIError: vi.fn((error) => {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  })
}));

import { chatComplete, simpleChat } from '../x1Chat';

describe('x1Chat 单元测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('chatComplete', () => {
    it('应该使用正确的参数调用 OpenAI API', async () => {
      // 模拟成功响应
      const mockResponse = {
        choices: [{
          message: {
            content: '测试回复'
          }
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        }
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const messages = [
        { role: 'user' as const, content: '你好' }
      ];
      const options = {
        temperature: 0.8,
        maxTokens: 512,
        topP: 0.9
      };

      await chatComplete(messages, options);

      // 验证 API 调用参数
      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0] as ChatCompletionCreateParams;
      
      expect(callArgs.model).toBe('x1');
      expect(callArgs.messages).toEqual(messages);
      expect(callArgs.temperature).toBe(0.8);
      expect(callArgs.max_tokens).toBe(512);
      expect(callArgs.top_p).toBe(0.9);
      expect(callArgs.stream).toBe(false);
      expect(callArgs.user).toBe('123456');
    });

    it('应该使用默认参数', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '测试回复'
          }
        }]
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const messages = [
        { role: 'user' as const, content: '你好' }
      ];

      await chatComplete(messages);

      const callArgs = mockCreate.mock.calls[0][0] as ChatCompletionCreateParams;
      expect(callArgs.temperature).toBe(1);
      expect(callArgs.max_tokens).toBe(1024);
      expect(callArgs.top_p).toBe(1);
      expect(callArgs.stream).toBe(false);
      expect(callArgs.user).toBe('123456');
    });

    it('应该正确返回聊天结果', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '这是AI的回复'
          }
        }],
        usage: {
          prompt_tokens: 8,
          completion_tokens: 12,
          total_tokens: 20
        }
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const messages = [
        { role: 'user' as const, content: '你好' }
      ];

      const result = await chatComplete(messages);

      expect(result.text).toBe('这是AI的回复');
      expect(result.raw).toBe(mockResponse);
      expect(result.usage).toEqual({
        promptTokens: 8,
        completionTokens: 12,
        totalTokens: 20
      });
    });

    it('应该处理没有 usage 信息的响应', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '测试回复'
          }
        }]
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const messages = [
        { role: 'user' as const, content: '你好' }
      ];

      const result = await chatComplete(messages);

      expect(result.text).toBe('测试回复');
      expect(result.usage).toBeUndefined();
    });

    it('应该在API返回空内容时抛出错误', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: ''
          }
        }]
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const messages = [
        { role: 'user' as const, content: '你好' }
      ];

      await expect(chatComplete(messages)).rejects.toThrow('API 返回空响应或无效格式');
    });

    it('应该在API调用失败时抛出格式化错误', async () => {
      const apiError = new Error('API 调用失败');
      mockCreate.mockRejectedValueOnce(apiError);

      const messages = [
        { role: 'user' as const, content: '你好' }
      ];

      await expect(chatComplete(messages)).rejects.toThrow('聊天完成请求失败: API 调用失败');
    });

    it('应该正确处理流式响应', async () => {
      // 模拟流式响应
      const mockStream = [
        {
          choices: [{
            delta: {
              reasoning_content: '正在思考...'
            }
          }]
        },
        {
          choices: [{
            delta: {
              content: '你好'
            }
          }]
        },
        {
          choices: [{
            delta: {
              content: '！'
            }
          }]
        }
      ];

      // 创建异步迭代器
      const asyncIterator = {
        [Symbol.asyncIterator]() {
          let index = 0;
          return {
            async next() {
              if (index < mockStream.length) {
                return { value: mockStream[index++], done: false };
              }
              return { done: true };
            }
          };
        }
      };

      mockCreate.mockResolvedValueOnce(asyncIterator);

      const messages = [
        { role: 'user' as const, content: '你好' }
      ];

      const result = await chatComplete(messages, { stream: true });

      expect(result.text).toBe('你好！');
      expect(result.reasoningContent).toBe('正在思考...');
      expect(result.raw).toEqual({
        stream: true,
        fullResponse: '你好！',
        reasoningContent: '正在思考...'
      });
    });
  });

  describe('simpleChat', () => {
    it('应该构造正确的消息格式', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '简单回复'
          }
        }]
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      await simpleChat('用户消息', '系统提示');

      const callArgs = mockCreate.mock.calls[0][0] as ChatCompletionCreateParams;
      expect(callArgs.messages).toEqual([
        { role: 'system', content: '系统提示' },
        { role: 'user', content: '用户消息' }
      ]);
    });

    it('应该在没有系统消息时只包含用户消息', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '简单回复'
          }
        }]
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      await simpleChat('用户消息');

      const callArgs = mockCreate.mock.calls[0][0] as ChatCompletionCreateParams;
      expect(callArgs.messages).toEqual([
        { role: 'user', content: '用户消息' }
      ]);
    });

    it('应该传递选项参数', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '简单回复'
          }
        }]
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const options = { temperature: 0.5, maxTokens: 100, user: 'custom-user' };
      await simpleChat('用户消息', undefined, options);

      const callArgs = mockCreate.mock.calls[0][0] as ChatCompletionCreateParams;
      expect(callArgs.temperature).toBe(0.5);
      expect(callArgs.max_tokens).toBe(100);
      expect(callArgs.user).toBe('custom-user');
    });
  });
});
