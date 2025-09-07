# Generate code from Figma design
_Exported on 2025/9/7 at GMT+8 20:08:44 from Cursor (1.5.11)_

---

**User**

@https://www.figma.com/design/Z7zHsJiX7hBS1DFNkY1Ol5/%E6%9D%82%E8%B4%A7%E9%93%BA?node-id=763-626&t=gRDYZctpJ4UBVlam-4  基于以上设计在首页生成对应代码

---

**Cursor**

我将基于你提供的 Figma 设计（杂货铺风格）重构首页布局：加入更丰富的 Hero、搜索与分类筛选、以及更清晰的功能入口网格，同时保持 Tailwind 与可访问性（focus-visible）。现在开始修改 `src/app/page.tsx`。

```typescriptreact
import Container from '@/components/Container'

export default function HomePage() {
  return (
    <Container>
      <div className="py-12">
        {/* Hero 区域 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-gray-100">
          <div className="px-6 py-12 md:px-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
              EchoCast Workshop
            </h1>
            <p className="mt-4 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              从创意到定稿，再到多语种与排期发布的全流程工作台。
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/ideas"
                className="inline-flex items-center justify-center rounded-md px-5 py-3 text-white bg-primary-600 hover:bg-primary-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                立即收集创意
              </a>
              <a
                href="/timeline"
                className="inline-flex items-center justify-center rounded-md px-5 py-3 text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                查看时间线
              </a>
            </div>
          </div>
        </div>

        {/* 搜索与分类（杂货铺风格导航） */}
        <div className="mt-12">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            <div className="flex-1">
              <label htmlFor="home-search" className="sr-only">
                搜索
              </label>
              <div className="relative">
                <input
                  id="home-search"
                  type="search"
                  placeholder="搜索功能或页面…（如：创意、草稿、定稿、翻译、时间线）"
                  aria-label="搜索功能或页面"
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 pr-10 text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-gray-400">
                  ⌘K
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '创意', href: '/ideas' },
                { label: '草稿', href: '/drafts' },
                { label: '定稿', href: '/finals' },
                { label: '多语种', href: '/finals' },
                { label: '时间线', href: '/timeline' },
              ].map((chip) => (
                <a
                  key={chip.label}
                  href={chip.href}
                  className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  {chip.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* 功能分区卡片 */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <a
            href="/ideas"
            className="group block rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">💡 创意收集</h3>
                <p className="mt-2 text-gray-600">
                  记录灵感、整理来源与摘要，作为内容生产起点。
                </p>
              </div>
              <span className="text-gray-300 group-hover:text-primary-500 transition-colors">→</span>
            </div>
          </a>

          <a
            href="/drafts"
            className="group block rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">📝 文案打磨</h3>
                <p className="mt-2 text-gray-600">
                  多轮迭代草稿，保留差异提示，随时升级为定稿。
                </p>
              </div>
              <span className="text-gray-300 group-hover:text-primary-500 transition-colors">→</span>
            </div>
          </a>

          <a
            href="/finals"
            className="group block rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">✅ 定稿版本</h3>
                <p className="mt-2 text-gray-600">
                  每次定稿形成 vN 版本快照，便于追踪与回滚。
                </p>
              </div>
              <span className="text-gray-300 group-hover:text-primary-500 transition-colors">→</span>
            </div>
          </a>

          <a
            href="/finals"
            className="group block rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">🌍 多语种</h3>
                <p className="mt-2 text-gray-600">
                  基于定稿按语言独立推进：翻译→校对→排期→发布。
                </p>
              </div>
              <span className="text-gray-300 group-hover:text-primary-500 transition-colors">→</span>
            </div>
          </a>

          <a
            href="/timeline"
            className="group block rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">🗓️ 时间线</h3>
                <p className="mt-2 text-gray-600">
                  统一查看生成进度与发布计划，跨语言可见可追溯。
                </p>
              </div>
              <span className="text-gray-300 group-hover:text-primary-500 transition-colors">→</span>
            </div>
          </a>

          <a
            href="/drafts"
            className="group block rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">🧩 工具与服务</h3>
                <p className="mt-2 text-gray-600">
                  语音识别、模型适配等服务统一编排，支持重试容错。
                </p>
              </div>
              <span className="text-gray-300 group-hover:text-primary-500 transition-colors">→</span>
            </div>
          </a>
        </div>

        {/* 引导区块 */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900">开始你的创作之旅</h2>
          <p className="mt-2 text-gray-600">先从记录一个点子开始吧</p>
          <div className="mt-6 flex justify-center">
            <a
              href="/ideas"
              className="inline-flex items-center rounded-md bg-primary-600 px-6 py-3 text-white hover:bg-primary-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              新建创意
            </a>
          </div>
        </div>
      </div>
    </Container>
  )
}

```

我刚把首页重构为“杂货铺风格”的 Hero、搜索/分类和功能卡片栅格，并将可访问性 focus-visible 一并加上。现在我先检查该文件的 Lint，并确认 Tailwind 是否定义了 primary 色板。

- 我已完成首页 UI 重构并通过了 Lint 检查；`tailwind.config.js` 中已定义 `primary` 色板，颜色引用无误。
- 引用设计来源：[Figma 设计稿](https://www.figma.com/design/Z7zHsJiX7hBS1DFNkY1Ol5/%E6%9D%82%E8%B4%A7%E9%93%BA?node-id=763-626&t=gRDYZctpJ4UBVlam-4)

变更要点：
- 新增 Hero（渐变背景、主副标题、主次按钮，含 focus-visible）。
- 增加搜索输入与“杂货铺”式分类 Chip（可键盘操作）。
- 功能卡片栅格：创意/草稿/定稿/多语种/时间线/工具与服务。
- 保持 App Router、Tailwind、无第三方 UI 库，符合项目约束。

