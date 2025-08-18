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
    let audioBase64: string;
    let audioParams: any = {};
    let languageParams: any = {};
    let addPunctuation = true;

    // 检查 Content-Type 决定解析方式
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // 处理 FormData 格式
      try {
        const formData = await request.formData();
        const audioFile = formData.get('file') as File;
        
        if (!audioFile) {
          return NextResponse.json(
            {
              success: false,
              error: '未找到音频文件，请确保文件字段名为 "file"',
              errorCode: 'MISSING_FILE'
            },
            { status: 400 }
          );
        }

        // 验证文件大小（最大 10MB）
        if (audioFile.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            {
              success: false,
              error: '音频文件过大，请确保文件小于 10MB',
              errorCode: 'FILE_TOO_LARGE'
            },
            { status: 400 }
          );
        }

        // 验证文件类型
        if (!audioFile.type.startsWith('audio/')) {
          return NextResponse.json(
            {
              success: false,
              error: '不支持的文件类型，请上传音频文件',
              errorCode: 'INVALID_FILE_TYPE'
            },
            { status: 400 }
          );
        }

        // 将文件转换为 Base64
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        audioBase64 = buffer.toString('base64');

        // 从 FormData 中获取其他参数
        const sampleRateStr = formData.get('sampleRate')?.toString();
        const encoding = formData.get('encoding')?.toString();
        const language = formData.get('language')?.toString();
        const accent = formData.get('accent')?.toString();
        const puncStr = formData.get('addPunctuation')?.toString();

        if (sampleRateStr) audioParams.sampleRate = parseInt(sampleRateStr);
        if (encoding) audioParams.encoding = encoding;
        if (language) languageParams.language = language;
        if (accent) languageParams.accent = accent;
        if (puncStr) addPunctuation = puncStr === 'true';

      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: '解析 FormData 失败',
            errorCode: 'FORMDATA_PARSE_ERROR'
          },
          { status: 400 }
        );
      }
    } else {
      // 处理 JSON 格式
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

      audioBase64 = body.audio;
      audioParams = body.audioParams || {};
      languageParams = body.languageParams || {};
      addPunctuation = body.addPunctuation ?? true;
    }

    // 调用IAT客户端进行转写
    const result = await transcribe(audioBase64, {
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
