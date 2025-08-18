/**
 * 讯飞IAT语音识别 浏览器传输层实现
 * 
 * 专为浏览器环境设计 - 使用原生 WebSocket
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
 * 浏览器 WebSocket 传输层类
 */
export class IATTransport {
  private ws: WebSocket | null = null;
  private logger: Logger;
  private config: TransportConfig;
  private connectionState: WSConnectionState = WSConnectionState.CLOSED;
  private messageHandlers: Map<string, (data: WSResponse) => void> = new Map();
  private errorHandlers: Map<string, (error: IATError) => void> = new Map();

  constructor(config: TransportConfig) {
    this.config = config;
    this.logger = new ConsoleLogger();
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
        
        // 创建浏览器原生 WebSocket 连接
        this.ws = new WebSocket(authUrl);
        
        // 设置超时
        const timeout = this.config.timeout || 20000;
        const timeoutId = setTimeout(() => {
          if (this.connectionState === WSConnectionState.CONNECTING) {
            this.ws?.close();
            reject(new IATError(IATErrorCode.NETWORK_ERROR, '连接超时'));
          }
        }, timeout);

        // 连接成功
        this.ws.onopen = () => {
          clearTimeout(timeoutId);
          this.connectionState = WSConnectionState.OPEN;
          this.logger.info('IAT WebSocket 连接成功');
          resolve();
        };

        // 接收消息
        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const response: WSResponse = JSON.parse(event.data);
            this.handleMessage(response);
          } catch (error) {
            this.logger.error('解析响应数据失败:', error);
            this.handleError(new IATError(
              IATErrorCode.SERVER_ERROR,
              '响应数据格式错误',
              error
            ));
          }
        };

        // 连接错误
        this.ws.onerror = (event: Event) => {
          clearTimeout(timeoutId);
          this.connectionState = WSConnectionState.ERROR;
          this.logger.error('WebSocket 连接错误:', event);
          
          const iatError = new IATError(
            IATErrorCode.NETWORK_ERROR,
            'WebSocket 连接失败'
          );
          
          reject(iatError);
          this.handleError(iatError);
        };

        // 连接关闭
        this.ws.onclose = (event: CloseEvent) => {
          clearTimeout(timeoutId);
          this.connectionState = WSConnectionState.CLOSED;
          this.logger.info(`WebSocket 连接关闭: ${event.code} - ${event.reason}`);
          
          if (event.code !== 1000) {
            // 非正常关闭
            this.handleError(new IATError(
              IATErrorCode.NETWORK_ERROR,
              `连接异常关闭: ${event.code} - ${event.reason}`
            ));
          }
        };

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
   * 发送数据帧 - 浏览器版本
   */
  async sendFrame(frame: WSFrame): Promise<void> {
    this.logger.info('[BROWSER-TRANSPORT] sendFrame 被调用');
    
    if (this.connectionState !== WSConnectionState.OPEN || !this.ws) {
      throw new IATError(IATErrorCode.NETWORK_ERROR, 'WebSocket 连接未建立');
    }

    try {
      const data = JSON.stringify(frame);
      this.logger.info(`[BROWSER-TRANSPORT] 发送帧数据: ${data.length} 字节`);
      this.logger.info(`[BROWSER-TRANSPORT] WebSocket 类型: ${this.ws.constructor.name}`);
      
      // 浏览器环境：使用原生 WebSocket.send() - 同步方法，无回调
      this.ws.send(data);
      this.logger.info('[BROWSER-TRANSPORT] 数据发送成功 - 使用原生 WebSocket');
    } catch (error) {
      this.logger.error('[BROWSER-TRANSPORT] 发送帧数据失败:', error);
      this.logger.error('[BROWSER-TRANSPORT] WebSocket 状态:', this.ws?.readyState);
      throw new IATError(
        IATErrorCode.NETWORK_ERROR,
        `[BROWSER-TRANSPORT] 发送数据失败: ${error instanceof Error ? error.message : '未知错误'}`,
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
      this.logger.info('WebSocket 连接已关闭');
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

/**
 * 创建传输层实例
 */
export function createTransport(config: TransportConfig): IATTransport {
  return new IATTransport(config);
}
