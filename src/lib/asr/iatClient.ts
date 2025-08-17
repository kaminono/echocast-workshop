/**
 * 讯飞IAT语音识别 客户端封装
 * 
 * Node.js 环境专用 - 提供简单易用的语音转写接口
 * 
 * @private 此模块不应被前端直接导入
 */

import dotenv from 'dotenv';
import { createTransport, IATTransport } from './iatTransport';
import {
  IATConfig,
  IATResult,
  IATError,
  IATErrorCode,
  TranscribeParams,
  WSFrame,
  WSResponse,
  AudioParams,
  LanguageParams,
  WSConnectionState
} from './types';

// 加载环境变量
dotenv.config();

// Node.js 环境检查
if (typeof window !== 'undefined') {
  throw new Error('iatClient 仅支持 Node.js 环境，禁止在浏览器中使用');
}

/**
 * 默认音频参数
 */
const DEFAULT_AUDIO_PARAMS: AudioParams = {
  encoding: 'raw',
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16
};

/**
 * 默认语言参数
 */
const DEFAULT_LANGUAGE_PARAMS: LanguageParams = {
  language: 'zh_cn',
  domain: 'iat'
};

/**
 * 转写请求参数
 */
export interface TranscribeRequest {
  /** 音频数据（Buffer、base64字符串或文件路径） */
  audio: Buffer | string;
  /** 音频格式，默认为 16k 采样率的 PCM */
  audioParams?: Partial<AudioParams>;
  /** 语言设置，默认中文 */
  languageParams?: Partial<LanguageParams>;
  /** 是否返回置信度，默认不返回 */
  nbest?: number;
  /** 是否添加标点符号，默认添加 */
  punc?: 0 | 1;
}

/**
 * IAT 客户端类
 */
export class IATClient {
  private config: IATConfig;
  private transport: IATTransport | null = null;

  constructor(config?: Partial<IATConfig>) {
    this.config = this.loadConfig(config);
    this.validateConfig();
  }

  /**
   * 加载配置
   */
  private loadConfig(userConfig?: Partial<IATConfig>): IATConfig {
    const envConfig: IATConfig = {
      apiKey: process.env.IAT_API_KEY || '',
      apiSecret: process.env.IAT_API_SECRET || '',
      appId: process.env.IAT_APP_ID || undefined,
      timeout: parseInt(process.env.IAT_TIMEOUT_MS || '20000'),
      logLevel: (process.env.IAT_LOG_LEVEL as any) || 'info'
    };

    return { ...envConfig, ...userConfig };
  }

  /**
   * 验证配置
   */
  private validateConfig() {
    if (!this.config.apiKey) {
      throw new IATError(
        IATErrorCode.PARAM_ERROR,
        'IAT_API_KEY 未配置，请在环境变量或参数中提供'
      );
    }

    if (!this.config.apiSecret) {
      throw new IATError(
        IATErrorCode.PARAM_ERROR,
        'IAT_API_SECRET 未配置，请在环境变量或参数中提供'
      );
    }
  }

  /**
   * 语音转写主方法
   */
  async transcribe(request: TranscribeRequest): Promise<IATResult> {
    const { audio, audioParams, languageParams, nbest, punc } = request;

    try {
      // 准备音频数据
      const audioBuffer = await this.prepareAudioData(audio);
      
      // 创建传输层
      this.transport = createTransport(this.config);
      
      // 建立连接
      await this.transport.connect();

      // 构建转写参数
      const transcribeParams: TranscribeParams = {
        audio: { ...DEFAULT_AUDIO_PARAMS, ...audioParams },
        language: { ...DEFAULT_LANGUAGE_PARAMS, ...languageParams },
        nbest: nbest || 1,
        punc: punc !== undefined ? punc : 1
      };

      // 执行转写
      const result = await this.performTranscription(audioBuffer, transcribeParams);

      return result;

    } catch (error) {
      if (error instanceof IATError) {
        throw error;
      }
      
      throw new IATError(
        IATErrorCode.UNKNOWN_ERROR,
        `转写失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error
      );
    } finally {
      // 清理资源
      if (this.transport) {
        await this.transport.disconnect();
        this.transport = null;
      }
    }
  }

  /**
   * 准备音频数据
   */
  private async prepareAudioData(audio: Buffer | string): Promise<Buffer> {
    if (Buffer.isBuffer(audio)) {
      return audio;
    }

    if (typeof audio === 'string') {
      // 检查是否为Base64
      if (this.isBase64(audio)) {
        return Buffer.from(audio, 'base64');
      }
      
      // 当作文件路径处理
      const fs = await import('fs');
      try {
        return fs.readFileSync(audio);
      } catch (error) {
        throw new IATError(
          IATErrorCode.PARAM_ERROR,
          `读取音频文件失败: ${audio}`,
          error
        );
      }
    }

    throw new IATError(
      IATErrorCode.PARAM_ERROR,
      '音频数据格式不支持，请提供 Buffer、base64 字符串或文件路径'
    );
  }

  /**
   * 检查字符串是否为Base64格式
   */
  private isBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }

  /**
   * 执行语音转写
   */
  private async performTranscription(
    audioBuffer: Buffer,
    params: TranscribeParams
  ): Promise<IATResult> {
    if (!this.transport) {
      throw new IATError(IATErrorCode.NETWORK_ERROR, '传输层未初始化');
    }

    return new Promise((resolve, reject) => {
      let finalResult = '';
      let isTranscriptionComplete = false;
      const rawResponses: WSResponse[] = [];

      // 注册消息处理器
      const sessionId = Date.now().toString();
      
      this.transport!.onMessage(sessionId, (response: WSResponse) => {
        rawResponses.push(response);

        if (response.data?.result) {
          // 解析识别结果
          const text = this.parseTranscriptionResult(response);
          finalResult += text;

          // 检查是否为最终结果
          if (response.data.status === 2) {
            isTranscriptionComplete = true;
            
            const result: IATResult = {
              text: finalResult.trim(),
              raw: rawResponses,
              isFinal: true
            };

            if (this.transport) {
              this.transport.off(sessionId);
            }
            resolve(result);
          }
        }
      });

      // 注册错误处理器
      this.transport!.onError(sessionId, (error: IATError) => {
        if (this.transport) {
          this.transport.off(sessionId);
        }
        reject(error);
      });

      // 发送音频数据
      this.sendAudioData(audioBuffer, params)
        .catch((error) => {
          if (this.transport) {
            this.transport.off(sessionId);
          }
          reject(error);
        });

      // 设置超时
      const timeout = this.config.timeout || 20000;
      setTimeout(() => {
        if (!isTranscriptionComplete && this.transport) {
          this.transport.off(sessionId);
          reject(new IATError(
            IATErrorCode.TIMEOUT_ERROR,
            `转写超时 (${timeout}ms)`
          ));
        }
      }, timeout);
    });
  }

  /**
   * 发送音频数据
   */
  private async sendAudioData(
    audioBuffer: Buffer,
    params: TranscribeParams
  ): Promise<void> {
    if (!this.transport) {
      throw new IATError(IATErrorCode.NETWORK_ERROR, '传输层未初始化');
    }

    const CHUNK_SIZE = 1280; // 40ms 音频数据大小 (16000 * 16 / 8 / 25)
    const chunks = this.splitAudioBuffer(audioBuffer, CHUNK_SIZE);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isFirst = i === 0;
      const isLast = i === chunks.length - 1;

      const frame: WSFrame = {
        common: {
          app_id: this.config.appId || ''
        },
        business: isFirst ? {
          language: params.language.language,
          domain: params.language.domain,
          ...(params.language.accent && { accent: params.language.accent }),
          ...(params.punc !== undefined && { pd: params.punc.toString() }),
          ...(params.nbest && { nbest: params.nbest })
        } : {},
        data: {
          status: isFirst ? 0 : isLast ? 2 : 1,
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: chunk.toString('base64')
        }
      };

      await this.transport.sendFrame(frame);
      
      // 模拟音频流间隔
      if (!isLast) {
        await this.sleep(40);
      }
    }
  }

  /**
   * 分割音频缓冲区
   */
  private splitAudioBuffer(buffer: Buffer, chunkSize: number): Buffer[] {
    const chunks: Buffer[] = [];
    
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, buffer.length);
      chunks.push(buffer.slice(i, end));
    }

    return chunks;
  }

  /**
   * 解析转写结果
   */
  private parseTranscriptionResult(response: WSResponse): string {
    if (!response.data?.result?.ws) {
      return '';
    }

    return response.data.result.ws
      .map(item => item.cw.map(word => word.w).join(''))
      .join('');
  }

  /**
   * 休眠工具
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取客户端状态
   */
  getStatus(): WSConnectionState {
    return this.transport?.getState() || WSConnectionState.CLOSED;
  }
}

/**
 * 创建IAT客户端实例
 */
export function createIATClient(config?: Partial<IATConfig>): IATClient {
  return new IATClient(config);
}

/**
 * 便捷的语音转写函数
 * 
 * @param audio 音频数据
 * @param options 可选参数
 * @returns Promise<IATResult>
 */
export async function transcribe(
  audio: Buffer | string,
  options: Omit<TranscribeRequest, 'audio'> = {}
): Promise<IATResult> {
  const client = createIATClient();
  return await client.transcribe({ audio, ...options });
}
