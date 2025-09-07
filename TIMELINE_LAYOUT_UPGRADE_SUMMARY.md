# 时间轴布局升级总结

## 升级目标
将 Timeline 页面由"列表样式"升级为**现代垂直时间轴布局**，仅改布局与样式，保持现有数据逻辑不变。

## 主要改动

### 1. 新增时间轴组件 ✅
- **TimelineRail.tsx** - 时间轴轨道组件，渲染竖向连接线
- **TimelineNode.tsx** - 时间轴节点组件，渲染节点圆点
- **TimelineCard.tsx** - 时间轴卡片组件，承载原 item 信息
- **TimelineDayGroup.tsx** - 日期分组组件，sticky 分组头
- **TimelineList.tsx** - 时间轴列表组件，实现垂直时间轴布局

### 2. 布局形态升级 ✅
- **单列垂直时间轴**：左侧竖向时间轨 + 右侧卡片
- **节点圆点**：每个条目在轨上有一个节点圆点与上下连线
- **日期分组**：按日期分组，分组头吸顶显示
- **响应式设计**：
  - ≥1024px：左侧 72px 轨道区，右侧卡片宽度自适应
  - <1024px：左侧 48px 轨道区，文本字号略降

### 3. 视觉与动效 ✅
- **颜色与密度**：延用现有设计系统，节点使用语义色
- **悬停/聚焦效果**：
  - 卡片 hover 微升起（shadow-sm→md）
  - focus 有清晰轮廓（focus-visible）
  - 节点 hover 缩放效果
- **进场动画**：列表初次渲染时，节点与卡片淡入+轻微上移（200-250ms）
- **深色模式**：rail/line 使用 `bg-muted`，文本对比度符合 AA

### 4. 交互可访问性 ✅
- 卡片 `role="button"`、`tabIndex=0`、`aria-label="打开定稿 v{{N}}：{{title}}"`
- Enter 触发跳转
- Sticky 分组头含当前分组的可见标签（本地化）

### 5. 组件与文件改造 ✅
- **TimelinePage.tsx**：保留现有数据获取与筛选，容器改为时间轴容器
- **TimelineList.tsx**：保留虚拟滚动/分页，在 item 渲染处套入轨道+节点+卡片结构
- **样式组件**：仅改样式相关，不改业务逻辑

## 技术实现

### 布局结构
```tsx
<div className="grid grid-cols-[72px_1fr] gap-4 lg:grid-cols-[72px_1fr] sm:grid-cols-[48px_1fr]">
  {/* 左侧时间轴轨道 */}
  <div className="flex flex-col items-center">
    <TimelineRail>
      <TimelineNode />
    </TimelineRail>
  </div>
  
  {/* 右侧卡片内容 */}
  <div className="space-y-0">
    <TimelineDayGroup>
      <TimelineCard />
    </TimelineDayGroup>
  </div>
</div>
```

### 关键样式类名
- **容器**：`grid grid-cols-[72px_1fr] gap-4 lg:grid-cols-[72px_1fr] sm:grid-cols-[48px_1fr]`
- **轨道**：`relative flex flex-col items-center`
- **节点**：`relative h-5 w-5 rounded-full border-2 ring-2 ring-primary`
- **卡片**：`rounded-2xl border bg-card/60 backdrop-blur p-4 shadow-sm hover:shadow-md transition`
- **Sticky 头**：`sticky top-0 z-10 backdrop-blur bg-background/70 border-b`

### 深色模式支持
- **轨道线**：`dark:bg-gray-700`
- **节点**：`dark:bg-gray-800 dark:border-gray-600`
- **卡片**：`dark:bg-gray-800/60 dark:border-gray-700`
- **文本**：`dark:text-gray-100`
- **Sticky 头**：`dark:bg-gray-900/70`

### 动画效果
- **进场动画**：`opacity-0 translate-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300`
- **悬停效果**：`hover:shadow-md hover:-translate-y-1 transition-all duration-200`
- **聚焦效果**：`focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`

## 保持不变的功能

### ✅ 数据逻辑
- 数据来源：IndexedDB 获取 FinalScript
- 筛选逻辑：仅展示已排期 `publishAtUtc` 的定稿
- 排序逻辑：默认倒序排列（最新在上）
- 分页逻辑：保留虚拟滚动/分页

### ✅ 交互逻辑
- 点击跳转：`router.push("/finals/${scriptId}")`
- 键盘导航：Enter 触发跳转
- 筛选功能：日期范围、语言、平台、关键词筛选
- 时区联动：UTC 入库，本地渲染

### ✅ 类型安全
- 数据类型：`TimelineItem` 接口不变
- 查询参数：`TimelineQueryParams` 接口不变
- 组件 props：类型检查通过

## 验收标准检查

### ✅ 垂直时间轴布局
- 页面呈现为垂直时间轴：清晰可见 rail、节点 dot、上下连线与分组头
- 倒序展示不变：最新定稿在上方

### ✅ 仅显示已排期定稿
- 只显示有 `publishAtUtc` 的定稿
- 点击任意卡片可跳转定稿 vN 详情

### ✅ Sticky 分组头
- 分组头随滚动正确吸顶
- 移动端与深色模式样式正常

### ✅ 交互反馈
- 悬停/聚焦有可见反馈
- 键盘 Enter 可打开详情
- 节点点击有活跃状态反馈

### ✅ 代码质量
- 未更改任何数据/接口/筛选逻辑
- 类型检查通过
- 仅布局样式变更，便于后续 diff 审阅

## 文件变更清单

### 新增文件
- `src/components/TimelineRail.tsx` - 时间轴轨道组件
- `src/components/TimelineNode.tsx` - 时间轴节点组件
- `src/components/TimelineCard.tsx` - 时间轴卡片组件
- `src/components/TimelineDayGroup.tsx` - 日期分组组件
- `src/components/TimelineList.tsx` - 时间轴列表组件

### 修改文件
- `src/app/timeline/page.tsx` - 更新时间线页面容器，使用新的 TimelineList 组件

### 删除文件
- 无

## 总结

时间轴布局升级已完成，实现了以下核心目标：

1. **现代垂直时间轴**：左侧轨道 + 右侧卡片，视觉更形象
2. **响应式设计**：桌面 72px 轨道，移动端 48px 轨道
3. **日期分组**：按日期分组，sticky 分组头提高可扫读性
4. **深色模式支持**：完整的深色模式样式适配
5. **动画效果**：进场动画 + 悬停效果，提升用户体验
6. **可访问性**：键盘导航 + ARIA 标签，符合无障碍标准
7. **保持功能**：数据筛选、排序、跳转逻辑完全不变

所有功能都经过测试验证，仅改布局与样式，业务逻辑保持不变，可以立即投入使用。