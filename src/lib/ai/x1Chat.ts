/**
 * 星火 X1 聊天完成功能 - 仅供 Node.js 环境使用
 * 
 * 基于 OpenAI Chat Completions API 兼容接口实现
 */

import { getOpenAICompatClient, formatAPIError } from './openaiCompatClient';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// 星火 X1 模型标识符（根据 API 文档调整）
const SPARK_X1_MODEL = 'x1';

/**
 * 聊天完成选项
 */
export interface ChatCompleteOptions {
  /** 生成文本的随机性，0-2 之间，默认 1 */
  temperature?: number;
  /** 生成的最大 token 数，默认 1024 */
  maxTokens?: number;
  /** 核采样参数，0-1 之间，默认 1 */
  topP?: number;
  /** 请求超时时间（毫秒），默认使用客户端配置 */
  timeout?: number;
  /** 是否启用流式响应，默认 false */
  stream?: boolean;
  /** 用户标识符，用于请求跟踪 */
  user?: string;
}

/**
 * 聊天完成返回结果
 */
export interface ChatCompleteResult {
  /** 生成的文本内容 */
  text: string;
  /** 原始 API 响应 */
  raw: unknown;
  /** 使用的 token 数统计（如果可用） */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** 思考过程内容（X1 模型特有，仅在支持时提供） */
  reasoningContent?: string;
}

/**
 * 执行聊天完成请求
 * 
 * @param messages 对话消息列表
 * @param options 可选参数
 * @returns Promise 包含生成的文本和原始响应
 */
export async function chatComplete(
  messages: ChatCompletionMessageParam[],
  options: ChatCompleteOptions = {}
): Promise<ChatCompleteResult> {
  try {
    const client = getOpenAICompatClient();
    
    const {
      temperature = 1,
      maxTokens = 1024,
      topP = 1,
      timeout,
      stream = false,
      user = '123456'
    } = options;

    // 构建请求参数
    const requestParams = {
      model: SPARK_X1_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      stream,
      user,
      ...(timeout && { timeout })
    };

    // 发送请求
    if (stream) {
      // 流式响应处理
      const stream = await client.chat.completions.create(requestParams);
      let fullResponse = '';
      let reasoningContent = '';

      for await (const chunk of stream as any) {
        // 处理思考过程内容（X1 模型特有）
        if (chunk.choices[0]?.delta?.reasoning_content) {
          reasoningContent += chunk.choices[0].delta.reasoning_content;
        }
        
        // 处理普通内容
        if (chunk.choices[0]?.delta?.content) {
          fullResponse += chunk.choices[0].delta.content;
        }
      }

      return {
        text: fullResponse,
        reasoningContent: reasoningContent || undefined,
        raw: { stream: true, fullResponse, reasoningContent }
      };
    } else {
      // 非流式响应处理
      const completion = await client.chat.completions.create(requestParams);

      // 提取生成的文本
      const text = completion.choices[0]?.message?.content || '';
      
      if (!text) {
        throw new Error('API 返回空响应或无效格式');
      }

      // 构建返回结果
      const result: ChatCompleteResult = {
        text,
        raw: completion,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined
      };

      return result;
    }

  } catch (error) {
    // 统一错误处理
    const errorMessage = formatAPIError(error);
    throw new Error(`聊天完成请求失败: ${errorMessage}`);
  }
}

/**
 * 简化的单轮对话函数
 * 
 * @param userMessage 用户消息
 * @param systemMessage 可选的系统提示
 * @param options 可选参数
 * @returns Promise 包含生成的文本和原始响应
 */
export async function simpleChat(
  userMessage: string,
  systemMessage?: string,
  options: ChatCompleteOptions = {}
): Promise<ChatCompleteResult> {
  const messages: ChatCompletionMessageParam[] = [];
  
  // 添加系统消息（如果提供）
  if (systemMessage) {
    messages.push({
      role: 'system',
      content: systemMessage
    });
  }
  
  // 添加用户消息
  messages.push({
    role: 'user',
    content: userMessage
  });

  return chatComplete(messages, options);
}
