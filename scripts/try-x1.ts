#!/usr/bin/env tsx

/**
 * 星火 X1 API 演示脚本
 * 
 * 用于验证 OpenAI 兼容接口的基本功能
 * 运行方式：npm run try:x1
 */

import { config } from 'dotenv';
import { simpleChat } from '../src/lib/ai/x1Chat';

// 手动加载 .env.local 文件
config({ path: '.env.local' });

async function main() {
  console.log('🚀 星火 X1 API 测试开始...\n');

  try {
    // 检查环境变量
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ 错误：缺少环境变量 OPENAI_API_KEY');
      console.error('请确保 .env.local 文件存在并包含正确的 API 密钥');
      process.exit(1);
    }

    console.log('✅ 环境变量检查通过');
    console.log('📡 正在发送测试请求...\n');

    // 执行简单的聊天测试
    const testMessage = '你好，请简单介绍一下你自己。';
    console.log(`👤 用户输入: ${testMessage}`);

    const startTime = Date.now();
    const result = await simpleChat(testMessage, undefined, {
      temperature: 0.7,
      maxTokens: 200,
      user: 'test-user-001'
    });
    const endTime = Date.now();

    console.log(`\n🤖 AI 回复: ${result.text}`);
    
    // 显示思考过程（如果存在）
    if (result.reasoningContent) {
      console.log(`\n🧠 思考过程: ${result.reasoningContent}`);
    }
    
    console.log(`\n📊 请求统计:`);
    console.log(`   耗时: ${endTime - startTime}ms`);
    
    if (result.usage) {
      console.log(`   Token 使用:`);
      console.log(`     输入: ${result.usage.promptTokens || 'N/A'}`);
      console.log(`     输出: ${result.usage.completionTokens || 'N/A'}`);
      console.log(`     总计: ${result.usage.totalTokens || 'N/A'}`);
    }

    console.log('\n✅ 非流式响应测试完成！');

    // 测试流式响应
    console.log('\n🔄 测试流式响应...');
    const streamTestMessage = '请简短地说一句话。';
    console.log(`👤 用户输入: ${streamTestMessage}`);

    const streamStartTime = Date.now();
    const streamResult = await simpleChat(streamTestMessage, undefined, {
      temperature: 0.7,
      maxTokens: 100,
      stream: true,
      user: 'stream-test-user'
    });
    const streamEndTime = Date.now();

    console.log(`\n🤖 流式回复: ${streamResult.text}`);
    
    if (streamResult.reasoningContent) {
      console.log(`\n🧠 流式思考过程: ${streamResult.reasoningContent}`);
    }
    
    console.log(`\n📊 流式请求统计:`);
    console.log(`   耗时: ${streamEndTime - streamStartTime}ms`);

    console.log('\n✅ 所有测试完成！星火 X1 API 工作正常。');

  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error(error instanceof Error ? error.message : String(error));
    
    // 提供排查建议
    console.error('\n🔍 排查建议:');
    console.error('1. 检查 .env.local 文件是否存在且包含正确的 OPENAI_API_KEY');
    console.error('2. 检查网络连接是否正常');
    console.error('3. 检查 API 密钥是否有效且未过期');
    console.error('4. 检查是否超出 API 调用限制');
    
    process.exit(1);
  }
}

// 运行主函数
main().catch((error) => {
  console.error('💥 脚本执行出错:', error);
  process.exit(1);
});
