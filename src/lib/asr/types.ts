/**
 * 讯飞IAT语音识别 类型定义
 * 
 * 基于讯飞星火语音转写 WebSocket API 实现
 */

/**
 * IAT 配置参数
 */
export interface IATConfig {
  /** API Key */
  apiKey: string;
  /** API Secret */
  apiSecret: string;
  /** App ID（可选，部分接口需要） */
  appId?: string;
  /** 请求超时时间（毫秒），默认 20000 */
  timeout?: number;
  /** 日志级别 */
  logLevel?: 'info' | 'error' | 'silent';
}

/**
 * 音频参数配置
 */
export interface AudioParams {
  /** 音频编码格式 */
  encoding: 'raw' | 'speex' | 'speex-wb';
  /** 采样率，支持 8000/16000 */
  sampleRate: 8000 | 16000;
  /** 音频声道数，仅支持单声道 */
  channels: 1;
  /** 数据位宽，支持 16bit */
  bitDepth: 16;
}

/**
 * 语言参数配置
 */
export interface LanguageParams {
  /** 语言类型 */
  language: 'zh_cn' | 'en_us';
  /** 应用领域 */
  domain: 'iat';
  /** 方言，当 language=zh_cn 时有效 */
  accent?: 'mandarin' | 'cantonese';
}

/**
 * 个性化参数
 */
export interface PersonalizationParams {
  /** 垂直领域个性化参数 */
  ptt?: 0 | 1;
  /** 强制输出结果 */
  rlang?: 'zh-cn' | 'zh-hk' | 'en-us';
  /** 动态修正 */
  dwa?: 'wpgs';
}

/**
 * 转写请求参数
 */
export interface TranscribeParams {
  /** 音频参数 */
  audio: AudioParams;
  /** 语言参数 */
  language: LanguageParams;
  /** 个性化参数（可选） */
  personalization?: PersonalizationParams;
  /** 是否返回置信度分数 */
  nbest?: number;
  /** 标点符号处理 */
  punc?: 0 | 1;
  /** VAD（语音活动检测） */
  vad?: {
    /** VAD 开关 */
    enable: boolean;
    /** VAD 超时时间 */
    timeout: number;
  };
}

/**
 * WebSocket 消息类型
 */
export type WSMessageType = 'start' | 'continue' | 'end';

/**
 * WebSocket 帧数据
 */
export interface WSFrame {
  /** 通用头部 */
  common: {
    /** 应用ID */
    app_id: string;
  };
  /** 业务参数 */
  business: {
    /** 语言类型 */
    language?: string;
    /** 应用领域 */
    domain?: string;
    /** 方言 */
    accent?: string;
    /** 标点符号 */
    pd?: string;
    /** 多候选 */
    nbest?: number;
  };
  /** 数据部分 */
  data: {
    /** 音频状态 */
    status: 0 | 1 | 2;  // 0: 首帧, 1: 中间帧, 2: 末帧
    /** 音频格式 */
    format: 'audio/L16;rate=16000';
    /** 音频编码 */
    encoding: 'raw';
    /** 音频数据（base64） */
    audio: string;
  };
}

/**
 * IAT 识别结果
 */
export interface IATResult {
  /** 识别文本 */
  text: string;
  /** 原始响应数据 */
  raw: unknown;
  /** 置信度分数（如果请求） */
  confidence?: number;
  /** 是否为最终结果 */
  isFinal?: boolean;
}

/**
 * WebSocket 响应数据
 */
export interface WSResponse {
  /** 返回码 */
  code: number;
  /** 返回信息描述 */
  message: string;
  /** 会话ID */
  sid: string;
  /** 结果数据 */
  data?: {
    /** 结果状态 */
    status: 0 | 1 | 2;  // 0: 首个结果, 1: 中间结果, 2: 最后一个结果
    /** 结果数据 */
    result: {
      /** 语音识别结果 */
      ws: Array<{
        /** 识别结果 */
        cw: Array<{
          /** 单词 */
          w: string;
          /** 置信度分数 */
          sc?: number;
        }>;
        /** 开始时间 */
        bg?: number;
        /** 结束时间 */
        ed?: number;
      }>;
    };
  };
}

/**
 * 错误类型枚举
 */
export enum IATErrorCode {
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 鉴权失败 */
  AUTH_FAILED = 'AUTH_FAILED',
  /** 参数错误 */
  PARAM_ERROR = 'PARAM_ERROR',
  /** 配额不足 */
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  /** 服务器错误 */
  SERVER_ERROR = 'SERVER_ERROR',
  /** 超时错误 */
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  /** 音频格式错误 */
  AUDIO_FORMAT_ERROR = 'AUDIO_FORMAT_ERROR',
  /** 未知错误 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * IAT 错误类
 */
export class IATError extends Error {
  constructor(
    public code: IATErrorCode,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'IATError';
  }
}

/**
 * 鉴权配置
 */
export interface AuthConfig {
  /** 主机地址 */
  host: string;
  /** 请求路径 */
  path: string;
  /** 请求方法 */
  method: string;
  /** API Key */
  apiKey: string;
  /** API Secret */
  apiSecret: string;
}

/**
 * WebSocket 连接状态
 */
export enum WSConnectionState {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed',
  ERROR = 'error'
}

/**
 * 传输层配置
 */
export interface TransportConfig extends IATConfig {
  /** WebSocket URL */
  wsUrl: string;
  /** 重试次数，默认 1 */
  retryCount?: number;
  /** 重试间隔（毫秒），默认 1000 */
  retryDelay?: number;
}
