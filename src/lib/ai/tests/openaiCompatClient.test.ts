/**
 * OpenAI 兼容客户端配置与实例化测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOpenAICompatClient, getOpenAICompatClient, formatAPIError, resetClientInstance } from '../openaiCompatClient';

describe('OpenAI 兼容客户端', () => {
  beforeEach(() => {
    // 清除模块缓存，确保每个测试独立
    vi.resetModules();
    // 重置环境变量
    delete process.env.OPENAI_API_KEY;
    // 重置客户端实例
    resetClientInstance();
  });

  describe('createOpenAICompatClient', () => {
    it('应该在缺失 OPENAI_API_KEY 时抛出明确错误', () => {
      expect(() => createOpenAICompatClient()).toThrow(/缺少必需的环境变量 OPENAI_API_KEY/);
    });

    it('应该在存在 OPENAI_API_KEY 时成功创建客户端', () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      const client = createOpenAICompatClient();
      expect(client).toBeDefined();
      expect(client.chat).toBeDefined();
      expect(client.chat.completions).toBeDefined();
    });

    it('应该使用正确的配置创建客户端', () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      const client = createOpenAICompatClient();
      // 验证客户端配置（通过检查内部属性）
      expect((client as any).baseURL).toBe('https://spark-api-open.xf-yun.com/v2');
      expect((client as any).apiKey).toBe('test-api-key');
    });
  });

  describe('getOpenAICompatClient', () => {
    it('应该返回同一个客户端实例（单例模式）', () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      const client1 = getOpenAICompatClient();
      const client2 = getOpenAICompatClient();
      
      expect(client1).toBe(client2);
    });

    it('应该在缺失环境变量时抛出错误', () => {
      // 确保环境变量未设置
      delete process.env.OPENAI_API_KEY;
      // 重置客户端实例
      resetClientInstance();
      
      expect(() => getOpenAICompatClient()).toThrow(/缺少必需的环境变量 OPENAI_API_KEY/);
    });
  });

  describe('formatAPIError', () => {
    it('应该格式化 401 错误为鉴权失败信息', () => {
      const error = new Error('Unauthorized') as any;
      error.status = 401;
      
      const formatted = formatAPIError(error);
      expect(formatted).toBe('鉴权失败：请检查 OPENAI_API_KEY 是否正确配置');
    });

    it('应该格式化 429 错误为限流信息', () => {
      const error = new Error('Rate limit exceeded') as any;
      error.status = 429;
      
      const formatted = formatAPIError(error);
      expect(formatted).toBe('请求频率限制：请稍后重试或检查配额');
    });

    it('应该格式化 5xx 错误为服务端错误', () => {
      const error = new Error('Internal Server Error') as any;
      error.status = 500;
      
      const formatted = formatAPIError(error);
      expect(formatted).toBe('服务端错误：请稍后重试');
    });

    it('应该处理普通错误对象', () => {
      const error = new Error('Something went wrong');
      
      const formatted = formatAPIError(error);
      expect(formatted).toBe('Something went wrong');
    });

    it('应该处理非错误对象', () => {
      const error = 'String error';
      
      const formatted = formatAPIError(error);
      expect(formatted).toBe('String error');
    });
  });
});
