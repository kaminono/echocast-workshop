# EchoCast Workshop

一个专为内容创作者设计的多语种处理工作台，帮助您从创意收集到多语种发布的全流程管理。

## 项目简介

EchoCast Workshop 是一个基于 Next.js 15 构建的现代化内容创作工具，旨在简化内容创作者的工作流程，从最初的创意收集到最终的多语种内容发布。

### 核心功能

- **💡 创意收集**：随时记录灵感，整理创意想法，为内容创作奠定基础
- **📝 文案打磨**：多轮迭代优化文案内容，打造高质量的创作素材  
- **🌍 多语种处理**：智能多语种转换与时间线管理，扩展内容影响力

## 技术栈

- **框架**：Next.js 15 (App Router)
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **存储**：IndexedDB (本地存储)
- **AI 服务**：讯飞 API

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

1. **访问页面**：导航到 `/ideas` 页面
2. **新建创意**：点击"新建创意"按钮打开弹窗
3. **输入想法**：在文本框中描述您的创意想法（最多2000字符）
4. **AI 优化**：点击"优化创意"，系统调用 X1 大模型进行内容优化
5. **查看结果**：AI 返回优化后的播客标题和摘要
6. **保存收藏**：点击"保存创意"将内容存储到本地数据库
7. **管理列表**：在列表中查看所有创意，支持星标收藏和删除操作

### 技术特点

- **服务端处理**：AI 调用仅在服务端进行，确保 API 密钥安全
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
