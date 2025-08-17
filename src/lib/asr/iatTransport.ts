/**
 * 讯飞IAT语音识别 传输层实现
 * 
 * Node.js 环境专用 - WebSocket 连接与鉴权签名
 * 
 * @private 此模块不应被前端直接导入
 */

import crypto from 'crypto';
import WebSocket from 'ws';
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

// Node.js 环境检查
if (typeof window !== 'undefined') {
  throw new Error('iatTransport 仅支持 Node.js 环境，禁止在浏览器中使用');
}

/**
 * 讯飞IAT WebSocket API 地址
 */
const IAT_WS_HOST = 'iat-api.xfyun.cn';
const IAT_WS_PATH = '/v2/iat';

/**
 * 日志输出工具
 */
class Logger {
  constructor(private level: 'info' | 'error' | 'silent' = 'info') {}

  info(message: string, ...args: any[]) {
    if (this.level === 'info') {
      console.log(`[IAT] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]) {
    if (this.level !== 'silent') {
      console.error(`[IAT Error] ${message}`, ...args);
    }
  }
}

/**
 * 生成鉴权URL
 * 
 * 基于讯飞API鉴权规范生成带签名的WebSocket连接URL
 */
export function generateAuthUrl(config: AuthConfig): string {
  const { host, path, method, apiKey, apiSecret } = config;

  // 生成RFC1123格式的时间戳
  const date = new Date().toUTCString();
  
  // 构建签名字符串
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  
  // 使用HMAC-SHA256生成签名
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(signatureOrigin)
    .digest('base64');
  
  // 构建authorization字符串
  const authorization = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  
  // Base64编码authorization
  const authorizationBase64 = Buffer.from(authorization).toString('base64');
  
  // 构建查询参数
  const params = new URLSearchParams({
    authorization: authorizationBase64,
    date: date,
    host: host
  });
  
  return `wss://${host}${path}?${params.toString()}`;
}

/**
 * WebSocket传输层类
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
    this.logger = new Logger(config.logLevel);
    this.validateConfig();
  }

  /**
   * 验证配置参数
   */
  private validateConfig() {
    const { apiKey, apiSecret } = this.config;
    
    if (!apiKey) {
      throw new IATError(IATErrorCode.PARAM_ERROR, 'IAT_API_KEY 未配置');
    }
    
    if (!apiSecret) {
      throw new IATError(IATErrorCode.PARAM_ERROR, 'IAT_API_SECRET 未配置');
    }
  }

  /**
   * 建立WebSocket连接
   */
  async connect(): Promise<void> {
    if (this.connectionState === WSConnectionState.OPEN) {
      this.logger.info('WebSocket 连接已存在');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.connectionState = WSConnectionState.CONNECTING;
        
        // 生成鉴权URL
        const authUrl = generateAuthUrl({
          host: IAT_WS_HOST,
          path: IAT_WS_PATH,
          method: 'GET',
          apiKey: this.config.apiKey,
          apiSecret: this.config.apiSecret
        });

        this.logger.info('正在连接 IAT WebSocket...');
        
        // 创建WebSocket连接
        this.ws = new WebSocket(authUrl);
        
        // 设置超时
        const timeout = this.config.timeout || 20000;
        const timeoutId = setTimeout(() => {
          if (this.connectionState === WSConnectionState.CONNECTING) {
            this.connectionState = WSConnectionState.ERROR;
            reject(new IATError(IATErrorCode.TIMEOUT_ERROR, `连接超时 (${timeout}ms)`));
          }
        }, timeout);

        // 连接成功
        this.ws.on('open', () => {
          clearTimeout(timeoutId);
          this.connectionState = WSConnectionState.OPEN;
          this.logger.info('IAT WebSocket 连接成功');
          resolve();
        });

        // 接收消息
        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const response: WSResponse = JSON.parse(data.toString());
            this.handleMessage(response);
          } catch (error) {
            this.logger.error('解析响应数据失败:', error);
            this.handleError(new IATError(
              IATErrorCode.SERVER_ERROR,
              '响应数据格式错误',
              error
            ));
          }
        });

        // 连接错误
        this.ws.on('error', (error) => {
          clearTimeout(timeoutId);
          this.connectionState = WSConnectionState.ERROR;
          this.logger.error('WebSocket 连接错误:', error);
          
          const iatError = new IATError(
            IATErrorCode.NETWORK_ERROR,
            `WebSocket 连接失败: ${error.message}`,
            error
          );
          
          reject(iatError);
          this.handleError(iatError);
        });

        // 连接关闭
        this.ws.on('close', (code, reason) => {
          clearTimeout(timeoutId);
          this.connectionState = WSConnectionState.CLOSED;
          this.logger.info(`WebSocket 连接关闭: ${code} - ${reason}`);
          
          if (code !== 1000) {
            // 非正常关闭
            this.handleError(new IATError(
              IATErrorCode.NETWORK_ERROR,
              `连接异常关闭: ${code} - ${reason}`
            ));
          }
        });

      } catch (error) {
        this.connectionState = WSConnectionState.ERROR;
        reject(new IATError(
          IATErrorCode.UNKNOWN_ERROR,
          '创建WebSocket连接失败',
          error
        ));
      }
    });
  }

  /**
   * 发送数据帧
   */
  async sendFrame(frame: WSFrame): Promise<void> {
    if (this.connectionState !== WSConnectionState.OPEN || !this.ws) {
      throw new IATError(IATErrorCode.NETWORK_ERROR, 'WebSocket 连接未建立');
    }

    return new Promise((resolve, reject) => {
      try {
        const data = JSON.stringify(frame);
        this.ws!.send(data, (error) => {
          if (error) {
            reject(new IATError(
              IATErrorCode.NETWORK_ERROR,
              `发送数据失败: ${error.message}`,
              error
            ));
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(new IATError(
          IATErrorCode.UNKNOWN_ERROR,
          '序列化数据帧失败',
          error
        ));
      }
    });
  }

  /**
   * 关闭连接
   */
  async disconnect(): Promise<void> {
    if (this.ws && this.connectionState === WSConnectionState.OPEN) {
      this.connectionState = WSConnectionState.CLOSING;
      
      return new Promise((resolve) => {
        this.ws!.close(1000, 'Normal closure');
        
        // 强制超时关闭
        setTimeout(() => {
          if (this.connectionState !== WSConnectionState.CLOSED) {
            this.connectionState = WSConnectionState.CLOSED;
          }
          resolve();
        }, 1000);
      });
    }
  }

  /**
   * 注册消息处理器
   */
  onMessage(id: string, handler: (data: WSResponse) => void) {
    this.messageHandlers.set(id, handler);
  }

  /**
   * 注册错误处理器
   */
  onError(id: string, handler: (error: IATError) => void) {
    this.errorHandlers.set(id, handler);
  }

  /**
   * 移除处理器
   */
  off(id: string) {
    this.messageHandlers.delete(id);
    this.errorHandlers.delete(id);
  }

  /**
   * 获取连接状态
   */
  getState(): WSConnectionState {
    return this.connectionState;
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(response: WSResponse) {
    // 检查响应错误码
    if (response.code !== 0) {
      const error = this.mapServerError(response.code, response.message);
      this.handleError(error);
      return;
    }

    // 分发消息给所有处理器
    this.messageHandlers.forEach((handler) => {
      try {
        handler(response);
      } catch (error) {
        this.logger.error('消息处理器执行错误:', error);
      }
    });
  }

  /**
   * 处理错误
   */
  private handleError(error: IATError) {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (handlerError) {
        this.logger.error('错误处理器执行错误:', handlerError);
      }
    });
  }

  /**
   * 映射服务器错误码到IAT错误
   */
  private mapServerError(code: number, message: string): IATError {
    const codeMap: Record<number, IATErrorCode> = {
      10105: IATErrorCode.AUTH_FAILED,      // appid错误
      10106: IATErrorCode.AUTH_FAILED,      // appid状态异常
      10107: IATErrorCode.AUTH_FAILED,      // 鉴权失败
      10110: IATErrorCode.PARAM_ERROR,      // 无权限操作
      10700: IATErrorCode.QUOTA_EXCEEDED,   // 应用超出访问限制
      11200: IATErrorCode.PARAM_ERROR,      // 参数不合法
      11201: IATErrorCode.AUDIO_FORMAT_ERROR, // 音频编码格式错误
      26605: IATErrorCode.QUOTA_EXCEEDED,   // 用户点数不足
    };

    const errorCode = codeMap[code] || IATErrorCode.SERVER_ERROR;
    return new IATError(errorCode, `服务器错误 ${code}: ${message}`);
  }
}

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
