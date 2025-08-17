/**
 * OpenAI 兼容客户端 - 仅供 Node.js 环境使用
 * 
 * 注意：此文件只能在服务端（Node.js）环境中使用，
 * 不要在浏览器端代码中直接导入，避免泄露 API 密钥。
 */

import OpenAI from 'openai';

// 星火 X1 的 OpenAI 兼容 API 基础地址
const SPARK_X1_BASE_URL = 'https://spark-api-open.xf-yun.com/v2';

// 默认配置常量
const DEFAULT_TIMEOUT = 30000; // 30秒超时

/**
 * 创建 OpenAI 兼容客户端实例
 */
export function createOpenAICompatClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      '缺少必需的环境变量 OPENAI_API_KEY。\n' +
      '请在 .env.local 文件中配置：OPENAI_API_KEY=your_api_password\n' +
      '或在运行时设置环境变量。'
    );
  }

  try {
    return new OpenAI({
      apiKey,
      baseURL: SPARK_X1_BASE_URL,
      timeout: DEFAULT_TIMEOUT,
    });
  } catch (error) {
    throw new Error(`创建 OpenAI 兼容客户端失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 全局客户端实例（延迟初始化）
 */
let clientInstance: OpenAI | null = null;

/**
 * 获取全局客户端实例
 */
export function getOpenAICompatClient(): OpenAI {
  if (!clientInstance) {
    clientInstance = createOpenAICompatClient();
  }
  return clientInstance;
}

/**
 * 重置全局客户端实例（主要用于测试）
 */
export function resetClientInstance(): void {
  clientInstance = null;
}

/**
 * 格式化 API 错误信息，使其更易于理解
 */
export function formatAPIError(error: unknown): string {
  if (error instanceof Error) {
    // 检查常见的 HTTP 错误状态码
    if ('status' in error) {
      const status = (error as any).status;
      switch (status) {
        case 401:
          return '鉴权失败：请检查 OPENAI_API_KEY 是否正确配置';
        case 429:
          return '请求频率限制：请稍后重试或检查配额';
        case 500:
        case 502:
        case 503:
        case 504:
          return '服务端错误：请稍后重试';
        default:
          return `API 错误 (${status}): ${error.message}`;
      }
    }
    return error.message;
  }
  return String(error);
}
