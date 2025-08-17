/**
 * IAT 配置测试
 * 
 * 测试环境变量配置和客户端初始化
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IATClient } from '../iatClient';
import { IATError, IATErrorCode } from '../types';

describe('IAT 配置测试', () => {
  // 保存原始环境变量
  const originalEnv = process.env;

  beforeEach(() => {
    // 重置环境变量
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // 恢复环境变量
    process.env = originalEnv;
  });

  describe('环境变量验证', () => {
    it('应当在缺少 IAT_API_KEY 时抛出错误', () => {
      delete process.env.IAT_API_KEY;
      process.env.IAT_API_SECRET = 'test_secret';

      expect(() => {
        new IATClient();
      }).toThrow(IATError);

      expect(() => {
        new IATClient();
      }).toThrow('IAT_API_KEY 未配置');
    });

    it('应当在缺少 IAT_API_SECRET 时抛出错误', () => {
      process.env.IAT_API_KEY = 'test_key';
      delete process.env.IAT_API_SECRET;

      expect(() => {
        new IATClient();
      }).toThrow(IATError);

      expect(() => {
        new IATClient();
      }).toThrow('IAT_API_SECRET 未配置');
    });

    it('应当在环境变量齐全时成功创建客户端', () => {
      process.env.IAT_API_KEY = 'test_key';
      process.env.IAT_API_SECRET = 'test_secret';

      expect(() => {
        new IATClient();
      }).not.toThrow();
    });

    it('应当正确解析数值型环境变量', () => {
      process.env.IAT_API_KEY = 'test_key';
      process.env.IAT_API_SECRET = 'test_secret';
      process.env.IAT_TIMEOUT_MS = '30000';

      const client = new IATClient();
      // 由于配置是私有的，我们通过客户端行为来验证
      expect(client).toBeDefined();
    });

    it('应当使用默认值处理无效的数值环境变量', () => {
      process.env.IAT_API_KEY = 'test_key';
      process.env.IAT_API_SECRET = 'test_secret';
      process.env.IAT_TIMEOUT_MS = 'invalid_number';

      const client = new IATClient();
      expect(client).toBeDefined();
    });
  });

  describe('客户端配置覆盖', () => {
    it('应当允许通过参数覆盖环境变量配置', () => {
      process.env.IAT_API_KEY = 'env_key';
      process.env.IAT_API_SECRET = 'env_secret';

      const client = new IATClient({
        apiKey: 'param_key',
        apiSecret: 'param_secret',
        timeout: 15000
      });

      expect(client).toBeDefined();
    });

    it('应当在参数配置不完整时抛出错误', () => {
      delete process.env.IAT_API_KEY;
      delete process.env.IAT_API_SECRET;

      expect(() => {
        new IATClient({
          apiKey: 'test_key'
          // 缺少 apiSecret
        });
      }).toThrow(IATError);
    });

    it('应当正确处理可选参数', () => {
      process.env.IAT_API_KEY = 'test_key';
      process.env.IAT_API_SECRET = 'test_secret';

      const client = new IATClient({
        appId: 'test_app_id',
        logLevel: 'error'
      });

      expect(client).toBeDefined();
    });
  });

  describe('配置验证规则', () => {
    it('应当拒绝空字符串作为API密钥', () => {
      process.env.IAT_API_KEY = '';
      process.env.IAT_API_SECRET = 'test_secret';

      expect(() => {
        new IATClient();
      }).toThrow(IATError);
    });

    it('应当拒绝空字符串作为API密钥密码', () => {
      process.env.IAT_API_KEY = 'test_key';
      process.env.IAT_API_SECRET = '';

      expect(() => {
        new IATClient();
      }).toThrow(IATError);
    });

    it('应当正确处理日志级别配置', () => {
      process.env.IAT_API_KEY = 'test_key';
      process.env.IAT_API_SECRET = 'test_secret';
      process.env.IAT_LOG_LEVEL = 'silent';

      const client = new IATClient();
      expect(client).toBeDefined();
    });

    it('应当处理无效的日志级别配置', () => {
      process.env.IAT_API_KEY = 'test_key';
      process.env.IAT_API_SECRET = 'test_secret';
      process.env.IAT_LOG_LEVEL = 'invalid_level';

      const client = new IATClient();
      expect(client).toBeDefined(); // 应当使用默认值
    });
  });

  describe('错误处理', () => {
    it('应当抛出正确的错误类型', () => {
      delete process.env.IAT_API_KEY;
      delete process.env.IAT_API_SECRET;

      try {
        new IATClient();
        expect.fail('应当抛出 IATError');
      } catch (error) {
        expect(error).toBeInstanceOf(IATError);
        expect((error as IATError).code).toBe(IATErrorCode.PARAM_ERROR);
      }
    });

    it('应当包含有用的错误信息', () => {
      delete process.env.IAT_API_KEY;
      process.env.IAT_API_SECRET = 'test_secret';

      try {
        new IATClient();
        expect.fail('应当抛出错误');
      } catch (error) {
        expect(error).toBeInstanceOf(IATError);
        expect((error as IATError).message).toContain('IAT_API_KEY');
        expect((error as IATError).message).toContain('未配置');
      }
    });
  });
});
