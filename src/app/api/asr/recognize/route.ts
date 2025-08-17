/**
 * 语音识别 API 路由
 * 
 * 接收音频数据并调用讯飞IAT进行语音转写
 */

import { NextRequest, NextResponse } from 'next/server';
import { transcribe } from '@/lib/asr/iatClient';
import { IATError, IATErrorCode } from '@/lib/asr/types';

/**
 * 音频识别请求接口
 */
interface RecognizeRequest {
  /** Base64编码的音频数据 */
  audio: string;
  /** 音频格式参数（可选） */
  audioParams?: {
    sampleRate?: 8000 | 16000;
    encoding?: 'raw' | 'speex' | 'speex-wb';
  };
  /** 语言参数（可选） */
  languageParams?: {
    language?: 'zh_cn' | 'en_us';
    accent?: 'mandarin' | 'cantonese';
  };
  /** 是否添加标点符号，默认 true */
  addPunctuation?: boolean;
}

/**
 * 音频识别响应接口
 */
interface RecognizeResponse {
  /** 识别成功标志 */
  success: boolean;
  /** 识别的文本内容 */
  text?: string;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
  /** 处理时间（毫秒） */
  processingTime?: number;
}

/**
 * 验证请求参数
 */
function validateRequest(body: any): { valid: boolean; error?: string } {
  if (!body) {
    return { valid: false, error: '请求体不能为空' };
  }

  if (!body.audio || typeof body.audio !== 'string') {
    return { valid: false, error: 'audio 字段是必需的，且必须为字符串' };
  }

  // 简单验证 Base64 格式
  try {
    const buffer = Buffer.from(body.audio, 'base64');
    // 验证编码后的数据长度是否合理
    if (buffer.length === 0) {
      return { valid: false, error: 'audio 数据不能为空' };
    }
  } catch {
    return { valid: false, error: 'audio 必须是有效的 Base64 编码' };
  }

  // 验证音频参数
  if (body.audioParams) {
    const { sampleRate, encoding } = body.audioParams;
    
    if (sampleRate && ![8000, 16000].includes(sampleRate)) {
      return { valid: false, error: 'sampleRate 必须是 8000 或 16000' };
    }
    
    if (encoding && !['raw', 'speex', 'speex-wb'].includes(encoding)) {
      return { valid: false, error: 'encoding 必须是 raw, speex 或 speex-wb' };
    }
  }

  // 验证语言参数
  if (body.languageParams) {
    const { language, accent } = body.languageParams;
    
    if (language && !['zh_cn', 'en_us'].includes(language)) {
      return { valid: false, error: 'language 必须是 zh_cn 或 en_us' };
    }
    
    if (accent && !['mandarin', 'cantonese'].includes(accent)) {
      return { valid: false, error: 'accent 必须是 mandarin 或 cantonese' };
    }
  }

  return { valid: true };
}

/**
 * 处理音频识别请求
 */
export async function POST(request: NextRequest): Promise<NextResponse<RecognizeResponse>> {
  const startTime = Date.now();
  
  try {
    // 解析请求体
    let body: RecognizeRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: '请求体格式错误，必须是有效的 JSON',
          errorCode: 'INVALID_JSON'
        },
        { status: 400 }
      );
    }

    // 验证请求参数
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          errorCode: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // 构建转写参数
    const { audio, audioParams, languageParams, addPunctuation = true } = body;
    
    // 调用IAT客户端进行转写
    const result = await transcribe(audio, {
      audioParams: {
        sampleRate: 16000,
        encoding: 'raw',
        ...audioParams
      },
      languageParams: {
        language: 'zh_cn',
        domain: 'iat',
        ...languageParams
      },
      punc: addPunctuation ? 1 : 0
    });

    const processingTime = Date.now() - startTime;

    // 返回成功响应
    return NextResponse.json({
      success: true,
      text: result.text,
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // 处理已知的IAT错误
    if (error instanceof IATError) {
      const statusCode = getStatusCodeFromIATError(error.code);
      
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
          processingTime
        },
        { status: statusCode }
      );
    }

    // 处理未知错误
    console.error('语音识别API错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '内部服务器错误',
        errorCode: 'INTERNAL_ERROR',
        processingTime
      },
      { status: 500 }
    );
  }
}

/**
 * 处理不支持的HTTP方法
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: '不支持的请求方法',
      errorCode: 'METHOD_NOT_ALLOWED'
    },
    { status: 405 }
  );
}

/**
 * 根据IAT错误代码映射HTTP状态码
 */
function getStatusCodeFromIATError(errorCode: IATErrorCode): number {
  switch (errorCode) {
    case IATErrorCode.PARAM_ERROR:
    case IATErrorCode.AUDIO_FORMAT_ERROR:
      return 400; // Bad Request
      
    case IATErrorCode.AUTH_FAILED:
      return 401; // Unauthorized
      
    case IATErrorCode.QUOTA_EXCEEDED:
      return 429; // Too Many Requests
      
    case IATErrorCode.TIMEOUT_ERROR:
      return 408; // Request Timeout
      
    case IATErrorCode.NETWORK_ERROR:
    case IATErrorCode.SERVER_ERROR:
      return 502; // Bad Gateway
      
    default:
      return 500; // Internal Server Error
  }
}

/**
 * 支持的方法列表
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
