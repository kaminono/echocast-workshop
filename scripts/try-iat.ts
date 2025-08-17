/**
 * 讯飞IAT语音识别 演示脚本
 * 
 * 用于测试语音转写功能的本地演示
 */

import dotenv from 'dotenv';
import { transcribe } from '../src/lib/asr/iatClient';
import { IATError, IATErrorCode } from '../src/lib/asr/types';

// 加载环境变量
dotenv.config({ path: '.env.local' });

/**
 * 检查环境配置
 */
function checkEnvironment(): boolean {
  const requiredEnvs = ['IAT_API_KEY', 'IAT_API_SECRET'];
  const missing = requiredEnvs.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('❌ 缺少必要的环境变量:');
    missing.forEach(env => console.error(`   - ${env}`));
    console.error('\n请在 .env.local 文件中配置这些变量');
    return false;
  }
  
  console.log('✅ 环境变量配置完整');
  return true;
}

/**
 * 生成测试音频数据
 * 
 * 由于没有真实音频文件，生成一个模拟的PCM数据
 * 实际使用时应该传入真实的音频文件路径或音频数据
 */
function generateTestAudio(): Buffer {
  // 生成 1 秒的静音 PCM 数据 (16kHz, 16bit, mono)
  const sampleRate = 16000;
  const duration = 1; // 1秒
  const samples = sampleRate * duration;
  const buffer = Buffer.alloc(samples * 2); // 16bit = 2 bytes per sample
  
  // 填充静音数据 (这只是为了演示，实际应该使用真实音频)
  buffer.fill(0);
  
  return buffer;
}

/**
 * 主演示函数
 */
async function main() {
  console.log('🎤 讯飞IAT语音识别演示');
  console.log('====================\n');

  // 检查环境配置
  if (!checkEnvironment()) {
    process.exit(1);
  }

  try {
    console.log('📋 当前配置:');
    console.log(`   - API Key: ${process.env.IAT_API_KEY?.slice(0, 8)}...`);
    console.log(`   - API Secret: ${process.env.IAT_API_SECRET?.slice(0, 8)}...`);
    console.log(`   - App ID: ${process.env.IAT_APP_ID || '(未配置)'}`);
    console.log(`   - Timeout: ${process.env.IAT_TIMEOUT_MS || 20000}ms`);
    console.log(`   - Log Level: ${process.env.IAT_LOG_LEVEL || 'info'}\n`);

    // 检查是否有真实音频文件
    const sampleAudioPath = './fixtures/sample.wav';
    const fs = await import('fs');
    
    let audioData: Buffer | string;
    let audioSource: string;
    
    if (fs.existsSync(sampleAudioPath)) {
      audioData = sampleAudioPath;
      audioSource = `文件: ${sampleAudioPath}`;
      console.log('🎵 使用样例音频文件');
    } else {
      audioData = generateTestAudio();
      audioSource = '生成的测试数据 (静音)';
      console.log('⚠️  未找到样例音频文件，使用模拟数据');
      console.log('   提示: 可以将真实的 16kHz PCM/WAV 文件放在 ./fixtures/sample.wav');
    }
    
    console.log(`   - 音频源: ${audioSource}\n`);

    console.log('🚀 开始语音转写...');
    
    const startTime = Date.now();
    
    // 执行转写
    const result = await transcribe(audioData, {
      audioParams: {
        sampleRate: 16000,
        encoding: 'raw'
      },
      languageParams: {
        language: 'zh_cn',
        domain: 'iat'
      },
      punc: 1  // 添加标点符号
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ 转写完成!\n');
    console.log('📝 识别结果:');
    console.log('====================');
    
    if (result.text) {
      console.log(result.text);
    } else {
      console.log('(无识别结果 - 可能是静音或噪音)');
    }
    
    console.log('====================\n');
    console.log('📊 转写统计:');
    console.log(`   - 耗时: ${duration}ms`);
    console.log(`   - 文本长度: ${result.text.length} 字符`);
    console.log(`   - 是否最终结果: ${result.isFinal ? '是' : '否'}`);
    
    if (result.confidence) {
      console.log(`   - 置信度: ${result.confidence}`);
    }

    // 输出调试信息（仅在 info 级别时）
    if (process.env.IAT_LOG_LEVEL === 'info') {
      console.log('\n🔍 调试信息:');
      console.log('   原始响应数据已保存在 result.raw 中');
      console.log(`   响应对象数量: ${Array.isArray(result.raw) ? result.raw.length : 1}`);
    }

  } catch (error) {
    console.error('\n❌ 转写失败:');
    
    if (error instanceof IATError) {
      console.error(`   错误类型: ${error.code}`);
      console.error(`   错误信息: ${error.message}`);
      
      // 提供针对性的解决建议
      switch (error.code) {
        case IATErrorCode.AUTH_FAILED:
          console.error('\n💡 解决建议:');
          console.error('   - 检查 IAT_API_KEY 和 IAT_API_SECRET 是否正确');
          console.error('   - 确认账户状态是否正常');
          console.error('   - 检查 API 服务是否可用');
          break;
          
        case IATErrorCode.QUOTA_EXCEEDED:
          console.error('\n💡 解决建议:');
          console.error('   - 检查账户余额或点数');
          console.error('   - 查看 API 调用频率限制');
          break;
          
        case IATErrorCode.NETWORK_ERROR:
          console.error('\n💡 解决建议:');
          console.error('   - 检查网络连接');
          console.error('   - 确认防火墙设置');
          console.error('   - 重试操作');
          break;
          
        case IATErrorCode.TIMEOUT_ERROR:
          console.error('\n💡 解决建议:');
          console.error('   - 增加 IAT_TIMEOUT_MS 配置');
          console.error('   - 检查网络延迟');
          console.error('   - 缩短音频长度');
          break;
          
        default:
          console.error('\n💡 解决建议:');
          console.error('   - 查看完整错误信息');
          console.error('   - 检查音频格式是否符合要求');
          console.error('   - 联系技术支持');
      }
    } else {
      console.error(`   未知错误: ${error}`);
    }
    
    process.exit(1);
  }
}

/**
 * 脚本入口
 */
if (require.main === module) {
  main().catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

export { main };
