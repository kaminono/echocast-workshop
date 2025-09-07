# 时间线页面重构总结

## 重构目标
重构 EchoCast Workshop 的时间线页面，仅显示已排期定稿，优化展示逻辑与样式。

## 主要改动

### 1. 数据类型重构 ✅
- **文件**: `src/types/domain.ts`
- **改动**: 
  - 更新 `TimelineItem` 接口，添加 `locale` 和 `platform` 字段
  - 移除 `publishStatus` 字段（不再需要状态筛选）
  - 更新 `TimelineQueryParams`，移除 `status` 筛选，添加 `locales` 和 `platforms` 多选筛选

### 2. 时间线页面重构 ✅
- **文件**: `src/app/timeline/page.tsx`
- **改动**:
  - 默认排序改为 `desc`（倒序，最新在上）
  - 数据筛选逻辑：仅显示有 `publishAtUtc` 的定稿
  - 添加语言和平台筛选支持
  - 更新空状态提示："暂无已排期定稿，去设置发布时间"
  - 添加 router 导入以支持跳转

### 3. 筛选栏重构 ✅
- **文件**: `src/components/TimelineFilters.tsx`
- **改动**:
  - 移除状态筛选控件
  - 添加语言多选筛选（中文、English、日本語、한국어）
  - 添加平台多选筛选（Spotify、Apple Podcasts、Google Podcasts、YouTube）
  - 更新排序选项文案："按发布时间倒序/升序"
  - 更新活跃筛选条件显示

### 4. 时间线项目卡片优化 ✅
- **文件**: `src/components/TimelineItem.tsx`
- **改动**:
  - 优化信息层级：时间（大号加粗）→ 标题（单行省略）→ 徽标行
  - 添加可访问性支持：`role="button"`、`aria-label`、键盘导航
  - 徽标显示：版本 vN、语言 locale、平台 platform
  - 移除状态显示（不再需要）
  - 更新跳转逻辑使用 `scriptId`

### 5. 数据获取逻辑更新 ✅
- **文件**: `src/lib/stores/timeline.ts`
- **改动**:
  - 默认排序改为 `desc`
  - 数据转换逻辑更新以支持新的 `TimelineItem` 结构

### 6. 服务器端数据访问层 ✅
- **文件**: `src/lib/server-data.ts`
- **改动**:
  - 更新 `toTimelineItem` 函数以匹配新的数据结构
  - 添加默认的 `locale` 和 `platform` 值

## 核心功能特性

### ✅ 仅显示已排期定稿
- 筛选条件：`publishAtUtc` 不为空
- 前端内存过滤，确保只显示已设置发布时间的定稿

### ✅ 默认倒序排列
- 排序方式：`publishAtUtc` 降序（最新在上）
- 保留升序/降序切换功能

### ✅ 优化的筛选功能
- **保留**: 日期范围、语言、平台、关键词搜索
- **移除**: 状态筛选（不再暴露给用户）
- **新增**: 语言和平台多选筛选

### ✅ 优化的卡片样式
- **时间显示**: 大号加粗字体，突出显示
- **标题**: 单行溢出省略，保持整洁
- **徽标**: 版本、语言、平台信息清晰展示
- **可访问性**: 支持键盘导航和屏幕阅读器

### ✅ 改进的交互体验
- 点击卡片跳转到对应定稿详情页
- 键盘 `Enter` 和 `Space` 键支持
- 空状态引导用户去设置发布时间
- 时区切换后时间显示即时联动

## 验收标准检查

### ✅ 仅显示已排期定稿
- 时间线页面只显示有 `publishAtUtc` 的定稿
- 默认倒序排列（最新在上）

### ✅ 跳转功能正常
- 点击任意节点跳转到对应 FinalScript 详情页
- 跳转路径：`/finals/${scriptId}`

### ✅ 筛选功能优化
- 状态筛选已移除
- 日期范围、语言、平台、关键词筛选可用
- 筛选结果仍然只包含已排期的定稿

### ✅ 时区联动正确
- 不同全局时区下时间本地化渲染正确
- 切换时区后列表即时联动更新

### ✅ 用户体验优化
- 空状态提示与跳转可用
- 键盘导航支持
- 可访问性标签完整
- 无 mock 数据，类型检查通过

## 技术实现

### 数据流
1. 从 IndexedDB 获取所有 FinalScript
2. 前端过滤：仅保留有 `publishAtUtc` 的定稿
3. 应用筛选条件（日期、语言、平台、关键词）
4. 按 `publishAtUtc` 排序（默认倒序）
5. 分页处理
6. 转换为 `TimelineItem` 格式
7. 渲染到 UI

### 组件架构
```
TimelinePage
├── TimelineFilters (筛选栏)
├── TimelineList (列表容器)
└── TimelineItem (项目卡片)
```

### 类型安全
- 完整的 TypeScript 类型定义
- 运行时数据验证
- 组件 props 类型检查

## 文件变更清单

### 新增文件
- 无

### 修改文件
- `src/types/domain.ts` - 更新类型定义
- `src/app/timeline/page.tsx` - 重构页面逻辑
- `src/components/TimelineFilters.tsx` - 重构筛选栏
- `src/components/TimelineItem.tsx` - 优化卡片样式
- `src/lib/stores/timeline.ts` - 更新状态管理
- `src/lib/server-data.ts` - 更新数据转换

### 删除文件
- 无

## 总结

时间线页面重构已完成，实现了以下核心目标：

1. **专注已排期内容**: 仅显示已设置发布时间的定稿
2. **优化信息层级**: 时间突出、标题简洁、徽标清晰
3. **改进筛选体验**: 移除状态筛选，添加语言和平台筛选
4. **提升可访问性**: 支持键盘导航和屏幕阅读器
5. **保持性能**: 前端过滤和排序，响应迅速

所有功能都经过测试验证，符合验收标准，可以投入使用。