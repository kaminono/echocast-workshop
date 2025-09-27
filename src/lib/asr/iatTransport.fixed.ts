/**
 * 讯飞IAT语音识别 兼容传输层实现
 * 
 * 兼容 Node.js 和浏览器环境 - 避免 bufferUtil.mask 问题
 */

import crypto from 'crypto';
import {
  IATConfig,
  TransportConfig,
  AuthConfig,
  WSFrame,
  WSResponse,
  WSConnectionState,
  IATError,
  IATErrorCode
} from './types';

/**
 * 日志记录器接口
 */
interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

/**
 * 简单的控制台日志记录器
 */
class ConsoleLogger implements Logger {
  info(message: string, ...args: any[]): void {
    console.log(`[IAT] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[IAT Error] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[IAT Warning] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`[IAT Debug] ${message}`, ...args);
  }
}

/**
 * 兼容的 WebSocket 传输层类
 */
export class IATTransport {
  private ws: any | null = null;
  private logger: Logger;
  private config: TransportConfig;
  private connectionState: WSConnectionState = WSConnectionState.CLOSED;
  private messageHandlers: Map<string, (data: WSResponse) => void> = new Map();
  private errorHandlers: Map<string, (error: IATError) => void> = new Map();
  private isNodeEnvironment: boolean;

  constructor(config: TransportConfig) {
    this.config = config;
    this.logger = new ConsoleLogger();
    this.isNodeEnvironment = typeof window === 'undefined' && typeof process !== 'undefined';
  }

  /**
   * 建立 WebSocket 连接
   */
  async connect(): Promise<void> {
    if (this.connectionState === WSConnectionState.OPEN) {
      return;
    }

    this.connectionState = WSConnectionState.CONNECTING;

    return new Promise((resolve, reject) => {
      try {
        // 生成签名URL
        const authUrl = this.generateAuthUrl();
        this.logger.info('正在连接 IAT WebSocket...');
        
        // 根据环境创建 WebSocket
        if (this.isNodeEnvironment) {
          // Node.js 环境
          // 禁用 ws 对可选原生模块 bufferutil/utf-8-validate 的使用，避免打包或运行时不兼容
          try {
            if (!process.env.WS_NO_BUFFER_UTIL) process.env.WS_NO_BUFFER_UTIL = 'true';
            if (!process.env.WS_NO_UTF_8_VALIDATE) process.env.WS_NO_UTF_8_VALIDATE = 'true';
          } catch {}
          const WebSocket = require('ws');
          this.ws = new WebSocket(authUrl);
        } else {
          // 浏览器环境
          this.ws = new WebSocket(authUrl);
        }
        
        // 设置超时
        const timeout = this.config.timeout || 20000;
        const timeoutId = setTimeout(() => {
          if (this.connectionState === WSConnectionState.CONNECTING) {
            this.ws?.close();
            reject(new IATError(IATErrorCode.NETWORK_ERROR, '连接超时'));
          }
        }, timeout);

        // 设置事件处理器
        this.setupEventHandlers(resolve, reject, timeoutId);

      } catch (error) {
        this.logger.error('创建WebSocket连接失败:', error);
        reject(new IATError(
          IATErrorCode.NETWORK_ERROR,
          `创建连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
          error
        ));
      }
    });
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(resolve: () => void, reject: (error: IATError) => void, timeoutId: NodeJS.Timeout) {
    if (this.isNodeEnvironment) {
      // Node.js 环境事件处理
      this.ws.on('open', () => {
        clearTimeout(timeoutId);
        this.connectionState = WSConnectionState.OPEN;
        this.logger.info('[NODE] IAT WebSocket 连接成功');
        resolve();
      });

      this.ws.on('message', (data: any) => {
        try {
          const response: WSResponse = JSON.parse(data.toString());
          this.handleMessage(response);
        } catch (error) {
          this.logger.error('解析响应数据失败:', error);
        }
      });

      this.ws.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        const wasConnecting = this.connectionState === WSConnectionState.CONNECTING;
        this.connectionState = WSConnectionState.ERROR;
        this.logger.error('[NODE] WebSocket 连接错误:', error);
        
        const iatError = new IATError(
          IATErrorCode.NETWORK_ERROR,
          `WebSocket 连接失败: ${error.message}`,
          error
        );
        
        this.handleError(iatError);
        if (wasConnecting) {
          reject(iatError);
        }
      });

      this.ws.on('close', (code: number, reason: string) => {
        clearTimeout(timeoutId);
        this.connectionState = WSConnectionState.CLOSED;
        this.logger.info(`[NODE] WebSocket 连接关闭: ${code} - ${reason}`);
      });
    } else {
      // 浏览器环境事件处理
      this.ws.onopen = () => {
        clearTimeout(timeoutId);
        this.connectionState = WSConnectionState.OPEN;
        this.logger.info('[BROWSER] IAT WebSocket 连接成功');
        resolve();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const response: WSResponse = JSON.parse(event.data);
          this.handleMessage(response);
        } catch (error) {
          this.logger.error('解析响应数据失败:', error);
        }
      };

      this.ws.onerror = (event: Event) => {
        clearTimeout(timeoutId);
        const wasConnecting = this.connectionState === WSConnectionState.CONNECTING;
        this.connectionState = WSConnectionState.ERROR;
        this.logger.error('[BROWSER] WebSocket 连接错误:', event);
        
        const iatError = new IATError(
          IATErrorCode.NETWORK_ERROR,
          'WebSocket 连接失败'
        );
        
        this.handleError(iatError);
        if (wasConnecting) {
          reject(iatError);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        clearTimeout(timeoutId);
        this.connectionState = WSConnectionState.CLOSED;
        this.logger.info(`[BROWSER] WebSocket 连接关闭: ${event.code} - ${event.reason}`);
      };
    }
  }

  /**
   * 发送数据帧 - 完全兼容版本
   */
  async sendFrame(frame: WSFrame): Promise<void> {
    if (this.connectionState !== WSConnectionState.OPEN || !this.ws) {
      throw new IATError(IATErrorCode.NETWORK_ERROR, 'WebSocket 连接未建立');
    }

    try {
      const data = JSON.stringify(frame);
      this.logger.info(`[COMPATIBLE] 发送帧数据: ${data.length} 字节`);
      
      if (this.isNodeEnvironment) {
        // Node.js 环境 - 不使用回调，直接同步发送
        this.logger.info('[COMPATIBLE] 使用 Node.js 同步发送模式');
        this.ws.send(data);
      } else {
        // 浏览器环境
        this.logger.info('[COMPATIBLE] 使用浏览器发送模式');
        this.ws.send(data);
      }
      
      this.logger.info('[COMPATIBLE] 数据发送成功');
    } catch (error) {
      this.logger.error('[COMPATIBLE] 发送帧数据失败:', error);
      throw new IATError(
        IATErrorCode.NETWORK_ERROR,
        `[COMPATIBLE] 发送数据失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error
      );
    }
  }

  /**
   * 关闭连接
   */
  async disconnect(): Promise<void> {
    if (this.ws && this.connectionState !== WSConnectionState.CLOSED) {
      this.connectionState = WSConnectionState.CLOSED;
      this.ws.close(1000, '正常关闭');
      this.ws = null;
      this.logger.info('[COMPATIBLE] WebSocket 连接已关闭');
    }
  }

  /**
   * 注册消息处理器
   */
  onMessage(id: string, handler: (data: WSResponse) => void): void {
    this.messageHandlers.set(id, handler);
  }

  /**
   * 注册错误处理器
   */
  onError(id: string, handler: (error: IATError) => void): void {
    this.errorHandlers.set(id, handler);
  }

  /**
   * 取消注册所有处理器（消息与错误）
   */
  off(id: string): void {
    this.messageHandlers.delete(id);
    this.errorHandlers.delete(id);
  }

  /**
   * 获取连接状态（与 Node 版 API 对齐）
   */
  getState(): WSConnectionState {
    return this.connectionState;
  }

  /**
   * 移除消息处理器
   */
  removeMessageHandler(id: string): void {
    this.messageHandlers.delete(id);
  }

  /**
   * 移除错误处理器
   */
  removeErrorHandler(id: string): void {
    this.errorHandlers.delete(id);
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(response: WSResponse): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(response);
      } catch (error) {
        this.logger.error('消息处理器执行失败:', error);
      }
    });
  }

  /**
   * 处理错误
   */
  private handleError(error: IATError): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        this.logger.error('错误处理器执行失败:', err);
      }
    });
  }

  /**
   * 生成鉴权URL
   */
  private generateAuthUrl(): string {
    const host = 'iat-api.xfyun.cn';
    const path = '/v2/iat';
    const method = 'GET';
    
    // 生成RFC1123格式的时间戳
    const date = new Date().toUTCString();
    
    // 构建签名字符串
    const signatureOrigin = `host: ${host}\ndate: ${date}\n${method} ${path} HTTP/1.1`;
    
    // 使用HMAC-SHA256生成签名
    const signature = crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(signatureOrigin)
      .digest('base64');
    
    // 构建authorization字符串
    const authorization = `api_key="${this.config.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    
    // Base64编码
    const authorizationBase64 = Buffer.from(authorization).toString('base64');
    
    // 构建最终URL
    const params = new URLSearchParams({
      authorization: authorizationBase64,
      date: date,
      host: host
    });
    
    return `${this.config.wsUrl}?${params.toString()}`;
  }
}

// 常量定义
const IAT_WS_HOST = 'iat-api.xfyun.cn';
const IAT_WS_PATH = '/v2/iat';

/**
 * 创建传输层实例
 */
export function createTransport(config: IATConfig): IATTransport {
  const transportConfig: TransportConfig = {
    ...config,
    wsUrl: `wss://${IAT_WS_HOST}${IAT_WS_PATH}`,
    retryCount: 1,
    retryDelay: 1000
  };
  
  return new IATTransport(transportConfig);
}
