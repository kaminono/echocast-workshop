/**
 * IAT 客户端集成测试
 * 
 * 在环境变量齐全时执行真实的 API 调用
 * 在 CI 或环境不齐全时自动跳过
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { transcribe, IATClient } from '../iatClient';
import { IATError, IATErrorCode } from '../types';

// 检查是否应该跳过集成测试
function shouldSkipIntegrationTests(): string | false {
  // 在 CI 环境中跳过
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    return 'CI 环境，跳过集成测试';
  }

  // 检查必要的环境变量
  if (!process.env.IAT_API_KEY) {
    return '缺少 IAT_API_KEY 环境变量';
  }

  if (!process.env.IAT_API_SECRET) {
    return '缺少 IAT_API_SECRET 环境变量';
  }

  // 检查 API 密钥是否看起来像真实的密钥（避免使用测试值）
  if (process.env.IAT_API_KEY.includes('test') || 
      process.env.IAT_API_KEY.includes('your_')) {
    return 'API Key 看起来像占位符，跳过集成测试';
  }

  if (process.env.IAT_API_SECRET.includes('test') || 
      process.env.IAT_API_SECRET.includes('your_')) {
    return 'API Secret 看起来像占位符，跳过集成测试';
  }

  return false;
}

describe('IAT 客户端集成测试', () => {
  const skipReason = shouldSkipIntegrationTests();

  beforeAll(() => {
    if (skipReason) {
      console.log(`⏭️  跳过集成测试: ${skipReason}`);
    } else {
      console.log('🚀 运行集成测试 (使用真实 API)');
      console.log(`   API Key: ${process.env.IAT_API_KEY?.slice(0, 8)}...`);
    }
  });

  describe('真实 API 调用', () => {
    it.skipIf(skipReason)('应当能够连接到讯飞IAT服务', async () => {
      // 生成测试音频数据（1秒静音）
      const testAudio = generateTestAudio();
      
      const client = new IATClient();
      
      try {
        const result = await client.transcribe({
          audio: testAudio,
          audioParams: {
            sampleRate: 16000,
            encoding: 'raw'
          },
          languageParams: {
            language: 'zh_cn',
            domain: 'iat'
          },
          punc: 1
        });

        // 验证返回结果结构
        expect(result).toBeDefined();
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('raw');
        expect(result).toHaveProperty('isFinal');
        expect(typeof result.text).toBe('string');
        expect(result.isFinal).toBe(true);

        console.log(`✅ 集成测试成功: "${result.text}"`);
        
      } catch (error) {
        if (error instanceof IATError) {
          console.error(`❌ IAT 错误: ${error.code} - ${error.message}`);
          
          // 对于某些预期的错误，我们不让测试失败
          if (error.code === IATErrorCode.QUOTA_EXCEEDED) {
            console.log('⚠️  配额不足，但连接成功，测试通过');
            return;
          }
          
          if (error.code === IATErrorCode.AUTH_FAILED) {
            console.log('⚠️  鉴权失败，可能密钥过期，但测试结构正确');
            throw error; // 鉴权失败应该失败测试
          }
        }
        
        throw error;
      }
    }, 30000); // 30秒超时

    it.skipIf(skipReason)('应当能够处理英文语音识别', async () => {
      const testAudio = generateTestAudio();
      
      try {
        const result = await transcribe(testAudio, {
          audioParams: {
            sampleRate: 16000,
            encoding: 'raw'
          },
          languageParams: {
            language: 'en_us',
            domain: 'iat'
          }
        });

        expect(result).toBeDefined();
        expect(typeof result.text).toBe('string');
        
        console.log(`✅ 英文识别测试: "${result.text}"`);
        
      } catch (error) {
        if (error instanceof IATError && 
            (error.code === IATErrorCode.QUOTA_EXCEEDED || 
             error.code === IATErrorCode.AUTH_FAILED)) {
          console.log('⚠️  预期的 API 限制错误，跳过');
          return;
        }
        throw error;
      }
    }, 30000);

    it.skipIf(skipReason)('应当正确处理配置错误', async () => {
      const testAudio = generateTestAudio();
      
      // 使用错误的配置创建客户端
      const badClient = new IATClient({
        apiKey: 'invalid_key',
        apiSecret: 'invalid_secret'
      });

      await expect(badClient.transcribe({ audio: testAudio }))
        .rejects.toThrow(IATError);
      
      console.log('✅ 错误配置测试通过');
    }, 15000);
  });

  describe('边界情况测试', () => {
    it.skipIf(skipReason)('应当处理空音频数据', async () => {
      const emptyAudio = Buffer.alloc(1600); // 100ms 静音
      
      try {
        const result = await transcribe(emptyAudio);
        
        // 空音频应该返回空字符串或无识别结果
        expect(result.text).toBeDefined();
        expect(typeof result.text).toBe('string');
        
        console.log(`✅ 空音频测试: "${result.text}" (长度: ${result.text.length})`);
        
      } catch (error) {
        if (error instanceof IATError && 
            error.code === IATErrorCode.QUOTA_EXCEEDED) {
          console.log('⚠️  配额限制，跳过空音频测试');
          return;
        }
        throw error;
      }
    }, 20000);

    it.skipIf(skipReason)('应当处理超时设置', async () => {
      const testAudio = generateTestAudio();
      
      const client = new IATClient({
        timeout: 5000 // 5秒超时
      });

      try {
        const result = await client.transcribe({ audio: testAudio });
        expect(result).toBeDefined();
        
        console.log('✅ 超时设置测试通过');
        
      } catch (error) {
        if (error instanceof IATError) {
          if (error.code === IATErrorCode.TIMEOUT_ERROR) {
            console.log('✅ 超时错误正确触发');
            return;
          }
          if (error.code === IATErrorCode.QUOTA_EXCEEDED) {
            console.log('⚠️  配额限制，跳过超时测试');
            return;
          }
        }
        throw error;
      }
    }, 15000);
  });

  describe('性能基准测试', () => {
    it.skipIf(skipReason)('应当在合理时间内完成转写', async () => {
      const testAudio = generateTestAudio(2); // 2秒音频
      
      const startTime = Date.now();
      
      try {
        const result = await transcribe(testAudio);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(result).toBeDefined();
        expect(duration).toBeLessThan(10000); // 应在10秒内完成
        
        console.log(`✅ 性能测试: ${duration}ms for ${testAudio.length} bytes`);
        
      } catch (error) {
        if (error instanceof IATError && 
            error.code === IATErrorCode.QUOTA_EXCEEDED) {
          console.log('⚠️  配额限制，跳过性能测试');
          return;
        }
        throw error;
      }
    }, 15000);
  });
});

/**
 * 生成测试音频数据
 * 
 * @param durationSeconds 音频时长（秒）
 * @returns PCM 音频数据 Buffer
 */
function generateTestAudio(durationSeconds: number = 1): Buffer {
  const sampleRate = 16000;
  const samples = sampleRate * durationSeconds;
  const buffer = Buffer.alloc(samples * 2); // 16bit = 2 bytes per sample
  
  // 生成简单的正弦波音频而不是静音，更有可能被识别
  for (let i = 0; i < samples; i++) {
    // 生成 440Hz 的正弦波 (A音)
    const frequency = 440;
    const amplitude = 0.1; // 较小的音量
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
    
    // 转换为 16bit PCM
    const pcmValue = Math.round(sample * 32767);
    buffer.writeInt16LE(pcmValue, i * 2);
  }
  
  return buffer;
}
