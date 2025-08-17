/**
 * IAT 客户端单元测试
 * 
 * 通过 mock 传输层验证客户端逻辑
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IATClient, transcribe } from '../iatClient';
import { IATError, IATErrorCode, WSConnectionState } from '../types';

// Mock 传输层
vi.mock('../iatTransport', () => {
  const mockTransport = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendFrame: vi.fn(),
    onMessage: vi.fn(),
    onError: vi.fn(),
    off: vi.fn(),
    getState: vi.fn(() => WSConnectionState.CLOSED)
  };

  return {
    createTransport: vi.fn(() => mockTransport),
    IATTransport: vi.fn(() => mockTransport)
  };
});

// Mock fs 模块
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn()
}));

describe('IAT 客户端单元测试', () => {
  // 保存原始环境变量
  const originalEnv = process.env;

  beforeEach(() => {
    // 设置测试环境变量
    process.env = {
      ...originalEnv,
      IAT_API_KEY: 'test_key',
      IAT_API_SECRET: 'test_secret'
    };

    // 清除所有 mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 恢复环境变量
    process.env = originalEnv;
  });

  describe('客户端初始化', () => {
    it('应当成功创建客户端实例', () => {
      const client = new IATClient();
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(IATClient);
    });

    it('应当正确获取连接状态', () => {
      const client = new IATClient();
      const status = client.getStatus();
      expect(status).toBe(WSConnectionState.CLOSED);
    });
  });

  describe('音频数据处理', () => {
    it('应当正确处理 Buffer 类型的音频数据', async () => {
      const client = new IATClient();
      const audioBuffer = Buffer.from('test audio data');

      // Mock 传输层行为
      const { createTransport } = await import('../iatTransport');
      const mockTransport = createTransport({
        apiKey: 'test',
        apiSecret: 'test'
      });

      vi.mocked(mockTransport.connect).mockResolvedValue();
      vi.mocked(mockTransport.disconnect).mockResolvedValue();
      vi.mocked(mockTransport.sendFrame).mockResolvedValue();

      // Mock 消息处理
      vi.mocked(mockTransport.onMessage).mockImplementation((id, handler) => {
        // 模拟收到最终结果
        setTimeout(() => {
          handler({
            code: 0,
            message: 'success',
            sid: 'test_session',
            data: {
              status: 2,
              result: {
                ws: [{
                  cw: [{ w: '测试' }, { w: '音频' }]
                }]
              }
            }
          });
        }, 10);
      });

      const result = await client.transcribe({ audio: audioBuffer });
      
      expect(result).toBeDefined();
      expect(result.text).toBe('测试音频');
      expect(result.isFinal).toBe(true);
    });

    it('应当正确处理 Base64 字符串音频数据', async () => {
      const client = new IATClient();
      const audioBase64 = Buffer.from('test audio data').toString('base64');

      // Mock 传输层
      const { createTransport } = await import('../iatTransport');
      const mockTransport = createTransport({
        apiKey: 'test',
        apiSecret: 'test'
      });

      vi.mocked(mockTransport.connect).mockResolvedValue();
      vi.mocked(mockTransport.disconnect).mockResolvedValue();
      vi.mocked(mockTransport.sendFrame).mockResolvedValue();

      vi.mocked(mockTransport.onMessage).mockImplementation((id, handler) => {
        setTimeout(() => {
          handler({
            code: 0,
            message: 'success',
            sid: 'test_session',
            data: {
              status: 2,
              result: {
                ws: [{
                  cw: [{ w: 'hello' }, { w: ' world' }]
                }]
              }
            }
          });
        }, 10);
      });

      const result = await client.transcribe({ audio: audioBase64 });
      
      expect(result.text).toBe('hello world');
    });

    it('应当正确处理文件路径', async () => {
      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('file audio data'));

      const client = new IATClient();
      const filePath = '/path/to/audio.wav';

      // Mock 传输层
      const { createTransport } = await import('../iatTransport');
      const mockTransport = createTransport({
        apiKey: 'test',
        apiSecret: 'test'
      });

      vi.mocked(mockTransport.connect).mockResolvedValue();
      vi.mocked(mockTransport.disconnect).mockResolvedValue();
      vi.mocked(mockTransport.sendFrame).mockResolvedValue();

      vi.mocked(mockTransport.onMessage).mockImplementation((id, handler) => {
        setTimeout(() => {
          handler({
            code: 0,
            message: 'success',
            sid: 'test_session',
            data: {
              status: 2,
              result: {
                ws: [{
                  cw: [{ w: '文件' }, { w: '音频' }]
                }]
              }
            }
          });
        }, 10);
      });

      const result = await client.transcribe({ audio: filePath });
      
      expect(fs.readFileSync).toHaveBeenCalledWith(filePath);
      expect(result.text).toBe('文件音频');
    });

    it('应当在文件不存在时抛出错误', async () => {
      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const client = new IATClient();
      const filePath = '/nonexistent/file.wav';

      await expect(client.transcribe({ audio: filePath }))
        .rejects.toThrow(IATError);
    });

    it('应当拒绝无效的音频数据类型', async () => {
      const client = new IATClient();

      await expect(client.transcribe({ audio: 123 as any }))
        .rejects.toThrow(IATError);

      await expect(client.transcribe({ audio: null as any }))
        .rejects.toThrow(IATError);
    });
  });

  describe('参数处理', () => {
    it('应当使用默认音频参数', async () => {
      const client = new IATClient();
      const audioBuffer = Buffer.from('test');

      // Mock 传输层
      const { createTransport } = await import('../iatTransport');
      const mockTransport = createTransport({
        apiKey: 'test',
        apiSecret: 'test'
      });

      vi.mocked(mockTransport.connect).mockResolvedValue();
      vi.mocked(mockTransport.disconnect).mockResolvedValue();
      vi.mocked(mockTransport.sendFrame).mockResolvedValue();

      vi.mocked(mockTransport.onMessage).mockImplementation((id, handler) => {
        setTimeout(() => {
          handler({
            code: 0,
            message: 'success',
            sid: 'test_session',
            data: {
              status: 2,
              result: { ws: [{ cw: [{ w: 'test' }] }] }
            }
          });
        }, 10);
      });

      await client.transcribe({ audio: audioBuffer });

      // 验证发送的帧包含正确的参数
      expect(mockTransport.sendFrame).toHaveBeenCalled();
      const firstCall = vi.mocked(mockTransport.sendFrame).mock.calls[0];
      const frame = firstCall[0];
      
      expect(frame.business.language).toBe('zh_cn');
      expect(frame.business.domain).toBe('iat');
    });

    it('应当正确覆盖音频参数', async () => {
      const client = new IATClient();
      const audioBuffer = Buffer.from('test');

      // Mock 传输层
      const { createTransport } = await import('../iatTransport');
      const mockTransport = createTransport({
        apiKey: 'test',
        apiSecret: 'test'
      });

      vi.mocked(mockTransport.connect).mockResolvedValue();
      vi.mocked(mockTransport.disconnect).mockResolvedValue();
      vi.mocked(mockTransport.sendFrame).mockResolvedValue();

      vi.mocked(mockTransport.onMessage).mockImplementation((id, handler) => {
        setTimeout(() => {
          handler({
            code: 0,
            message: 'success',
            sid: 'test_session',
            data: {
              status: 2,
              result: { ws: [{ cw: [{ w: 'test' }] }] }
            }
          });
        }, 10);
      });

      await client.transcribe({
        audio: audioBuffer,
        audioParams: {
          sampleRate: 8000,
          encoding: 'speex'
        }
      });

      const firstCall = vi.mocked(mockTransport.sendFrame).mock.calls[0];
      const frame = firstCall[0];
      
      expect(frame.business.language).toBe('zh_cn');
      expect(frame.business.domain).toBe('iat');
    });
  });

  describe('错误处理', () => {
    it('应当正确处理传输错误', async () => {
      const client = new IATClient();
      const audioBuffer = Buffer.from('test');

      // Mock 传输层抛出错误
      const { createTransport } = await import('../iatTransport');
      const mockTransport = createTransport({
        apiKey: 'test',
        apiSecret: 'test'
      });

      vi.mocked(mockTransport.connect).mockRejectedValue(
        new IATError(IATErrorCode.NETWORK_ERROR, '连接失败')
      );

      await expect(client.transcribe({ audio: audioBuffer }))
        .rejects.toThrow(IATError);
    });

    it('应当正确处理服务器错误响应', async () => {
      const client = new IATClient();
      const audioBuffer = Buffer.from('test');

      // Mock 传输层
      const { createTransport } = await import('../iatTransport');
      const mockTransport = createTransport({
        apiKey: 'test',
        apiSecret: 'test'
      });

      vi.mocked(mockTransport.connect).mockResolvedValue();
      vi.mocked(mockTransport.disconnect).mockResolvedValue();
      vi.mocked(mockTransport.sendFrame).mockResolvedValue();

      vi.mocked(mockTransport.onMessage).mockImplementation(() => {
        // 不触发任何消息，让 onError 处理器执行
      });

      vi.mocked(mockTransport.onError).mockImplementation((id, handler) => {
        setTimeout(() => {
          handler(new IATError(IATErrorCode.AUTH_FAILED, '鉴权失败'));
        }, 10);
      });

      await expect(client.transcribe({ audio: audioBuffer }))
        .rejects.toThrow(IATError);
    });

    it('应当在超时时抛出错误', async () => {
      const client = new IATClient({ timeout: 100 }); // 100ms 超时
      const audioBuffer = Buffer.from('test');

      // Mock 传输层
      const { createTransport } = await import('../iatTransport');
      const mockTransport = createTransport({
        apiKey: 'test',
        apiSecret: 'test'
      });

      vi.mocked(mockTransport.connect).mockResolvedValue();
      vi.mocked(mockTransport.disconnect).mockResolvedValue();
      vi.mocked(mockTransport.sendFrame).mockResolvedValue();

      // 不触发任何消息处理器，模拟超时
      vi.mocked(mockTransport.onMessage).mockImplementation(() => {
        // 什么都不做，让请求超时
      });

      await expect(client.transcribe({ audio: audioBuffer }))
        .rejects.toThrow(IATError);
    }, 1000);
  });

  describe('便捷函数', () => {
    it('应当正确工作 transcribe 便捷函数', async () => {
      const audioBuffer = Buffer.from('test');

      // Mock 传输层
      const { createTransport } = await import('../iatTransport');
      const mockTransport = createTransport({
        apiKey: 'test',
        apiSecret: 'test'
      });

      vi.mocked(mockTransport.connect).mockResolvedValue();
      vi.mocked(mockTransport.disconnect).mockResolvedValue();
      vi.mocked(mockTransport.sendFrame).mockResolvedValue();

      vi.mocked(mockTransport.onMessage).mockImplementation((id, handler) => {
        setTimeout(() => {
          handler({
            code: 0,
            message: 'success',
            sid: 'test_session',
            data: {
              status: 2,
              result: {
                ws: [{
                  cw: [{ w: '便捷' }, { w: '函数' }]
                }]
              }
            }
          });
        }, 10);
      });

      const result = await transcribe(audioBuffer);
      
      expect(result.text).toBe('便捷函数');
    });
  });
});
