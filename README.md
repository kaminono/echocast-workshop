# EchoCast Workshop

一个专为内容创作者设计的多语种处理工作台，帮助您从创意收集到多语种发布的全流程管理。

本项目为科大讯飞 AI 大学堂 内 Cursor 项目实战的全流程记录项目，欢迎大家动手实践，生成属于自己的项目。

## 项目简介

EchoCast Workshop 是一个基于 Next.js 15 构建的现代化内容创作工具，旨在简化内容创作者的工作流程，从最初的创意收集到最终的多语种内容发布。

### 核心功能

- **💡 创意收集**：随时记录灵感，整理创意想法，为内容创作奠定基础
  - **文字输入**：快速文字记录，AI 智能优化为播客标题和摘要
  - **🎙️ 语音收集**：支持浏览器录音（≤60秒），自动语音转写 + AI 补全
  - **来源筛选**：按文本/语音来源筛选创意，便于分类管理
- **📝 文案打磨**：多轮迭代优化文案内容，打造高质量的创作素材  
- **🌍 多语种处理**：智能多语种转换与时间线管理，扩展内容影响力

## 技术栈

- **框架**：Next.js 15 (App Router)
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **存储**：IndexedDB (本地存储)
- **AI 服务**：星火 X1 大模型（文本优化）、讯飞 IAT（语音转写）

## 项目结构

```
echocast-workshop/
├── src/
│   ├── app/                 # Next.js App Router 页面
│   │   ├── page.tsx        # 首页
│   │   ├── ideas/          # 创意收集页
│   │   ├── drafts/         # 文案打磨页
│   │   ├── timeline/       # 时间线管理页
│   │   ├── layout.tsx      # 根布局
│   │   └── globals.css     # 全局样式
│   ├── components/         # 可复用组件
│   │   ├── TopNav.tsx      # 顶部导航
│   │   └── Container.tsx   # 布局容器
│   ├── lib/                # 工具库
│   │   └── indexeddb.ts    # IndexedDB 封装
│   └── types/              # 类型定义
│       └── domain.ts       # 领域模型类型
├── .env.example            # 环境变量示例
├── package.json            # 项目依赖
└── README.md              # 项目文档
```

## 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn 或 pnpm

### 安装依赖

```bash
npm install
# 或
yarn install
# 或  
pnpm install
```

### 环境配置

1. 复制环境变量文件：
```bash
cp .env.example .env.local
```

2. 编辑 `.env.local` 文件，填入相应的 API 密钥

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
npm start
```

## 创意收集功能使用说明

### 功能概述

创意收集模块提供了完整的创意管理功能，包括：

- **智能优化**：输入原始创意想法，AI 自动优化为适合播客的内容
- **本地存储**：使用 IndexedDB 进行本地数据管理，无需联网即可查看已保存的创意
- **交互友好**：现代化的模态弹窗设计，支持键盘快捷键和无障碍访问
- **实时反馈**：提供加载状态、错误处理和成功提示

### 使用流程

#### 文字创意收集
1. **访问页面**：导航到 `/ideas` 页面
2. **新建创意**：点击"新建创意"按钮打开弹窗
3. **输入想法**：在文本框中描述您的创意想法（最多2000字符）
4. **AI 优化**：点击"优化创意"，系统调用 X1 大模型进行内容优化
5. **查看结果**：AI 返回优化后的播客标题和摘要
6. **保存收藏**：点击"保存创意"将内容存储到本地数据库

#### 🎙️ 语音创意收集
1. **访问页面**：导航到 `/ideas` 页面
2. **语音收集**：点击"语音收集"按钮打开录音弹窗
3. **开始录音**：点击"开始录音"，最长可录制 60 秒，支持实时进度显示
4. **完成录音**：点击"停止录音"或达到时间上限自动停止
5. **提交处理**：点击"提交"，系统自动进行语音转写（IAT）
6. **AI 优化**：转写完成后，X1 模型自动优化为播客标题和摘要
7. **预览保存**：查看优化结果，点击"保存创意"存储到本地

#### 管理和筛选
- **来源筛选**：使用顶部筛选器按"全部"/"文本"/"语音"查看不同来源的创意
- **列表管理**：查看所有创意，支持星标收藏和删除操作
- **音频标识**：语音创意显示录音时长，便于识别

### 技术特点

- **服务端处理**：AI 调用仅在服务端进行，确保 API 密钥安全
- **语音处理**：集成讯飞 IAT 语音转写，支持中英文识别
- **音频存储**：使用 IndexedDB 分离存储音频 Blob 和创意数据，优化性能
- **状态机管理**：完整的录音-转写-优化-保存状态流转，提供清晰的用户反馈
- **离线可用**：已保存的创意支持离线浏览和管理
- **响应式设计**：适配各种屏幕尺寸，提供良好的移动端体验
- **无障碍支持**：完整的键盘导航和屏幕阅读器支持

## AI 接入（OpenAI 兼容）

本项目已集成星火 X1 大模型，采用 OpenAI 兼容接口，支持聊天对话功能。

### 环境配置

项目仅需配置一个环境变量：

```bash
# .env.local 文件中配置
OPENAI_API_KEY=your_api_password
```

其中 `your_api_password` 是您的星火 X1 API 密钥。

### 本地运行与测试

```bash
# 测试 AI 接口连通性
npm run try:x1

# 运行所有测试
npm run test

# 监听模式运行测试
npm run test:watch
```

### 使用示例

```typescript
import { simpleChat, chatComplete } from '@src/lib/ai/x1Chat';

// 简单对话
const result = await simpleChat('你好，请介绍一下自己');
console.log(result.text); // AI 的回复内容

// 带配置的对话
const result = await simpleChat(
  '请简短回复',
  '你是一个友善的助手',
  {
    temperature: 0.7,
    maxTokens: 100,
    user: 'user-123'
  }
);

// 流式响应（实时获取回复）
const streamResult = await simpleChat(
  '请详细解释什么是人工智能',
  undefined,
  {
    stream: true,
    user: 'stream-user'
  }
);
console.log(streamResult.text); // 完整回复
console.log(streamResult.reasoningContent); // 思考过程（X1 特有）

// 多轮对话
const messages = [
  { role: 'user', content: '你好' },
  { role: 'assistant', content: '您好！有什么可以帮助您的吗？' },
  { role: 'user', content: '请介绍一下星火大模型' }
];
const chatResult = await chatComplete(messages, {
  temperature: 0.8,
  maxTokens: 500
});
```

### 常见问题排查

#### 鉴权失败
- 检查 `.env.local` 文件是否存在
- 确认 `OPENAI_API_KEY` 配置正确
- 验证 API 密钥是否有效

#### 请求超时
- 检查网络连接
- 确认防火墙设置
- 可能需要重试请求

#### 限流错误
- 检查 API 调用频率
- 确认账户配额充足
- 适当增加请求间隔

#### 服务端错误 (5xx)
- 稍后重试
- 检查 API 服务状态
- 联系技术支持

### 技术说明

- **仅 Node.js 环境**：AI 相关代码只在服务端运行，确保 API 密钥安全
- **OpenAI 兼容**：使用标准 OpenAI SDK，便于后续切换模型
- **流式响应支持**：支持实时流式回复，提升用户体验
- **思考过程展示**：X1 模型独有的思考过程可视化
- **用户追踪**：支持 user 参数进行请求跟踪和统计
- **错误处理**：完善的错误包装和人性化提示
- **测试覆盖**：包含单元测试和集成测试，确保代码质量

## 语音识别（IAT）

本项目已集成讯飞星火中英语音识别服务，支持实时语音转写功能。

### 环境变量配置

在 `.env.local` 文件中配置以下变量：

```bash
# 语音识别 IAT 配置
IAT_API_KEY=your_iat_api_key_here      # 语音识别 APIKey
IAT_API_SECRET=your_iat_api_secret_here # 语音识别 APISecret
IAT_APP_ID=your_iat_app_id_here        # 可选，部分接口需要 APPID
IAT_TIMEOUT_MS=20000                   # 可选，请求超时时间（毫秒），默认 20000
IAT_LOG_LEVEL=info                     # 可选，日志级别：info|error|silent
```

**安全提示**：所有 API 密钥仅在 Node.js 服务端使用，不会暴露给浏览器端或记录在日志中。

### 本地演示与测试

```bash
# 语音识别演示（需要配置完整的环境变量）
npm run try:iat

# 运行 IAT 相关测试
npm run test:iat

# 运行所有测试
npm run test

# 监听模式运行测试
npm run test:watch
```

### 使用示例

#### 直接调用 IAT 客户端

```typescript
import { transcribe, IATClient } from '@/lib/asr/iatClient';

// 使用便捷函数
const result = await transcribe(audioBuffer, {
  audioParams: {
    sampleRate: 16000,
    encoding: 'raw'
  },
  languageParams: {
    language: 'zh_cn', // 中文识别
    domain: 'iat'
  },
  punc: 1 // 添加标点符号
});

console.log('识别结果:', result.text);

// 使用客户端类
const client = new IATClient();
const result = await client.transcribe({
  audio: audioBuffer, // Buffer | base64字符串 | 文件路径
  audioParams: {
    sampleRate: 16000,
    encoding: 'raw'
  },
  languageParams: {
    language: 'en_us', // 英文识别
    domain: 'iat'
  }
});
```

#### 通过 API 路由调用

```typescript
// POST /api/asr/recognize
const response = await fetch('/api/asr/recognize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    audio: audioBase64, // Base64 编码的音频数据
    audioParams: {
      sampleRate: 16000,
      encoding: 'raw'
    },
    languageParams: {
      language: 'zh_cn',
      accent: 'mandarin'
    },
    addPunctuation: true
  })
});

const result = await response.json();
if (result.success) {
  console.log('识别文本:', result.text);
  console.log('处理时间:', result.processingTime, 'ms');
} else {
  console.error('识别失败:', result.error);
}
```

### 支持的音频格式

- **编码格式**：raw, speex, speex-wb
- **采样率**：8000Hz, 16000Hz
- **声道数**：单声道 (1)
- **位深度**：16bit
- **推荐格式**：16kHz, 16bit, 单声道 PCM

### 支持的语言

- **中文**：`zh_cn` (普通话、粤语)
- **英文**：`en_us`
- **方言支持**：`mandarin`, `cantonese` (仅中文时有效)

### 常见错误与排查

#### 鉴权失败 (401)
- 检查 `IAT_API_KEY` 和 `IAT_API_SECRET` 是否正确
- 确认账户状态是否正常
- 验证 API 服务是否可用

#### 配额不足 (429)
- 检查账户余额或点数
- 查看 API 调用频率限制
- 考虑升级服务套餐

#### 网络错误 (502)
- 检查网络连接状况
- 确认防火墙设置
- 重试操作或稍后再试

#### 请求超时 (408)
- 增加 `IAT_TIMEOUT_MS` 配置值
- 检查网络延迟情况
- 缩短音频长度

#### 音频格式错误 (400)
- 确认音频采样率为 8000Hz 或 16000Hz
- 检查音频编码格式是否支持
- 验证音频数据是否完整

### 音频数据处理

支持多种音频输入格式：

```typescript
// 1. 直接使用 Buffer
const audioBuffer = fs.readFileSync('audio.wav');
const result = await transcribe(audioBuffer);

// 2. Base64 字符串
const audioBase64 = audioBuffer.toString('base64');
const result = await transcribe(audioBase64);

// 3. 文件路径
const result = await transcribe('./audio/sample.wav');
```

### 性能优化建议

1. **音频预处理**：确保音频格式符合要求，避免在线转换
2. **分段处理**：长音频建议分段处理，每段不超过60秒
3. **并发控制**：避免同时发起过多识别请求
4. **缓存结果**：对于重复音频可以缓存识别结果
5. **错误重试**：网络错误时实现指数退避重试机制

### 技术实现细节

- **WebSocket 连接**：使用讯飞 IAT WebSocket API 实现实时识别
- **鉴权机制**：HMAC-SHA256 签名算法，符合讯飞 API 规范
- **数据分帧**：音频数据按 40ms (1280字节) 分帧传输
- **Node.js 专用**：所有识别逻辑仅在服务端运行，保护 API 密钥安全
- **完整测试**：包含单元测试、集成测试和条件跳过机制

## 文案打磨工作台（Drafts / Finals）

### 运行

- 安装依赖：
```bash
npm i
```
- 开发启动：
```bash
npm run dev
```

### 环境变量（可选）
- 在项目根目录创建 `.env.local`：
```
NEXT_PUBLIC_SPARK_API_KEY=your_key
NEXT_PUBLIC_SPARK_ENDPOINT=https://example.com/v1
```
未配置时，LLM 调用走 Mock 分支，UI 会提示“Mock 响应”。

### 技术约束
- Next.js App Router + TypeScript
- Tailwind CSS；可用内置组件
- 状态管理以组件内部状态为主，必要时可引入 Zustand（本迭代未使用）
- 本地持久化使用 IndexedDB，经 `src/lib/idb.ts` 封装

### 数据契约
- `Idea`：只读，镜像/种子
- `ScriptDraft`：仅最新一份，无版本历史
- `FinalScript`：版本只追加；保证 `(finalScriptId, versionNumber)` 唯一；`finalScriptId` 采用 `ideaId`
- `LocaleVariant`：绑定 `finalScriptId + sourceVersion`

### 核心路径
- 页面：
  - `/drafts` 列表 + 新建草稿（选择点子）
  - `/drafts/[id]` 编辑 + 生成 + 发布
  - `/finals` 列表
  - `/finals/[finalScriptId]` 详情 + 时间线 + 回滚
- 组件：`src/components/*`
- 仓库：`src/lib/repos/*`
- 服务：`src/lib/services/*`
- LLM 适配：`src/lib/llm/spark-x1.ts`

### 演示脚本（可选）
浏览器环境可执行 `scripts/demo.ts`（在任意页面加载后于 DevTools Console）：
```js
import('/_next/static/chunks/pages/scripts/demo.js').then(m => m?.default?.())
```
或将脚本逻辑复制到页面环境执行，按日志观察：创建→生成→发布 v1→再次生成→发布 v2→回滚 v1→发布 v3。

### 提示
- 键盘：
  - 草稿编辑页：Cmd/Ctrl+S 发布
  - 建议输入框：Enter 提交，Shift+Enter 换行，Cmd/Ctrl+Enter 提交
- 错误/成功反馈通过右下角 Toast 展示
- 种子数据在客户端启动时注入，可在 `src/mock/seed.ts` 调整

## 开发指南

### 代码规范

项目遵循以下开发原则（按优先级排序）：

1. **First Principles**：梳理最核心需求与边界
2. **YAGNI**：只实现当前真正需要的功能
3. **KISS**：保持设计和实现的简单性
4. **SOLID**：面向对象/模块化设计原则
5. **DRY**：消除重复，提炼公用逻辑

### 类型安全

项目全面使用 TypeScript，所有 API 接口和数据模型都有完整的类型定义。

### 样式规范

使用 Tailwind CSS 作为唯一样式方案，遵循原子化 CSS 理念。

## 功能路线图

### Phase 1 - 基础功能 (当前版本)
- [x] 项目初始化与基础架构
- [x] 四个核心页面布局
- [x] 导航和布局组件
- [x] 类型系统定义

### Phase 2 - 创意管理 (已完成)
- [x] 创意录入与编辑
- [x] AI 优化创意为播客内容
- [x] 本地存储管理 (IndexedDB)
- [x] 星标收藏功能
- [x] 按时间排序展示
- [ ] 标签分类系统
- [ ] 创意评估筛选
- [ ] 搜索和过滤功能

### Phase 3 - 文案处理
- [ ] 文案编辑器
- [ ] 版本历史管理
- [ ] AI 辅助优化
- [ ] 协作评审功能

### Phase 4 - 多语种支持
- [ ] 多语种翻译
- [ ] 本地化适配
- [ ] 发布时间规划
- [ ] 效果追踪分析

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进项目。

## 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件。
