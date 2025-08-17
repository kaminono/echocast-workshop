/**
 * x1Chat 集成测试 - 真实 API 调用测试
 * 
 * 注意：只有在环境变量 OPENAI_API_KEY 存在且非空时才会执行
 * 在 CI 环境或缺失密钥时会自动跳过
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { simpleChat, chatComplete } from '../x1Chat';

// 检查是否应该跳过集成测试
const shouldSkipIntegrationTests = !process.env.OPENAI_API_KEY || 
                                  process.env.CI === 'true' ||
                                  process.env.NODE_ENV === 'test';

describe('x1Chat 集成测试', () => {
  beforeAll(() => {
    if (shouldSkipIntegrationTests) {
      console.log('⏭️  跳过集成测试：缺少 OPENAI_API_KEY 或在 CI 环境中');
    }
  });

  describe('真实 API 调用', () => {
    it.skipIf(shouldSkipIntegrationTests)('应该成功完成简单对话', async () => {
      // 真实 API 调用可能较慢
      
      const result = await simpleChat(
        '请简单回复"测试成功"',
        undefined,
        { 
          temperature: 0.1, // 降低随机性，使回复更可预测
          maxTokens: 50     // 限制回复长度
        }
      );

      // 验证返回结果
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.raw).toBeDefined();

      console.log('✅ 集成测试结果:', {
        text: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''),
        usage: result.usage
      });
    }, 30000);

    it.skipIf(shouldSkipIntegrationTests)('应该正确处理多轮对话', async () => {
      
      const messages = [
        { role: 'user' as const, content: '你好' },
        { role: 'assistant' as const, content: '你好！有什么可以帮助你的吗？' },
        { role: 'user' as const, content: '请回复"多轮对话测试成功"' }
      ];

      const result = await chatComplete(messages, {
        temperature: 0.1,
        maxTokens: 50
      });

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);

      console.log('✅ 多轮对话测试结果:', {
        text: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''),
        usage: result.usage
      });
    }, 30000);

    it.skipIf(shouldSkipIntegrationTests)('应该返回 token 使用统计', async () => {
      
      const result = await simpleChat(
        '请简单回复',
        undefined,
        { maxTokens: 10 }
      );

      expect(result.usage).toBeDefined();
      if (result.usage) {
        expect(typeof result.usage.promptTokens).toBe('number');
        expect(typeof result.usage.completionTokens).toBe('number');
        expect(typeof result.usage.totalTokens).toBe('number');
        expect(result.usage.totalTokens).toBeGreaterThan(0);
      }

      console.log('✅ Token 统计测试结果:', result.usage);
    }, 30000);
  });

  describe('错误处理', () => {
    it.skipIf(shouldSkipIntegrationTests)('应该正确处理空消息', async () => {
      
      // 测试空消息的处理
      await expect(simpleChat('')).rejects.toThrow();
    }, 30000);

    it.skipIf(shouldSkipIntegrationTests)('应该正确处理参数边界', async () => {
      
      // 测试极端参数
      const result = await simpleChat(
        '测试',
        undefined,
        {
          temperature: 0,    // 最小值
          maxTokens: 1,      // 最小值
          topP: 0.1         // 较小值
        }
      );

      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(0);
    }, 30000);
  });
});
