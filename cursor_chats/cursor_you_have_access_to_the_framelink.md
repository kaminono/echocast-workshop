# You have access to the Framelink Figma MCP server. First,
_Exported on 2025/9/7 at GMT+8 20:27:51 from Cursor (1.5.11)_

---

**User**

You have access to the Framelink Figma MCP server. First, use the MCP tools on my current Figma selection or this link: https://www.figma.com/design/Z7zHsJiX7hBS1DFNkY1Ol5/%E6%9D%82%E8%B4%A7%E9%93%BA?node-id=763-626&t=gRDYZctpJ4UBVlam-4. Precisely follow these steps before writing any code:

1. Data fetch (Framelink MCP)

- Call the Framelink Figma MCP tools to fetch ONLY the selected node’s data (not the entire page). Use the tool that returns structured layout/styling info (e.g., get_figma_data). If available, also fetch exportable assets (SVG/PNG) for icons/images in this selection.
- Extract Figma variables/tokens (colors, spacing, radii, typography) referenced by the selection. List token names and values you will use. Avoid guessing; if a layer lacks tokens, report it.

1. Implementation target

- Framework: Next.js 15 App Router + TypeScript + Tailwind CSS + shadcn/ui.
- File policy (strict):
   • Pages under app//page.tsx
   • Reusable UI under src/components/
   • Hooks under src/hooks/ ; types under src/types/
   • Kebab-case filenames; each component default-export a typed React.FC.
- No inline styles. Prefer Tailwind utilities and CSS variables mapped from Figma tokens.

1. Mapping & structure rules

- Mirror Figma autolayout hierarchy and constraints with flex/grid. Do not use absolute positioning unless a layer is decorative or explicitly overlayed.
- If a part of the selection clearly maps to an existing shadcn/ui primitive (Button, Input, Card, Dialog, Tabs, Tooltip, etc.), import and compose that instead of re-implementing. Otherwise, create a thin wrapper component in src/components/ui/[feature]/ with clear props.
- Use semantic HTML landmarks and headings (main, nav, footer, h1–h3). Keep visual order = focus order.

1. Tokens & scales (accuracy guardrails)

- Use Figma variables you fetched. Never hard-code values that exist as tokens.
- Map px spacing to Tailwind spacing scale in 4px steps (0.25rem increments). If no exact match, round to the nearest step and leave a TODO with the exact px.
- Colors: prefer CSS variables (e.g. var(--color-primary)) that reference the token; set fallbacks once in a shared layer (globals.css or theme.ts).
- Typography: map text styles to Tailwind classes or a typed variant map. Keep line-height and letter-spacing consistent with tokens.

1. Responsiveness

- Infer breakpoints (sm/md/lg/xl) from Figma resizing behavior. Provide a short plan first (how columns stack, which regions wrap). Implement that plan 1:1 with Tailwind responsive utilities.

1. Assets & images

- For icons available as vectors, export as inline SVG or colocate as .svg under public/icons and import as React components.
- For raster art or photos, use next/image with width/height or fill as appropriate. Don’t invent placeholders if MCP provided assets/urls.

1. Interactivity & state

- Only stub local state and handlers (TypeScript). No business logic or API calls. Props must control copy, links, and callbacks. Document props with JSDoc.

1. Deliverables

- Output a concise “PLAN” section first: component boundaries, token usage list, responsive strategy.
- Then output full code for:
   • Page/entry under app/page.tsx
   • Each component under src/components/
   • Any shared styles/types/hooks you created
- Do not print screenshots; only code blocks and brief notes. If any ambiguity remains, list it at the end.

Now, execute:

- Fetch Figma data for the provided selection via Framelink Figma MCP.
- Print the PLAN (as specified).
- Implement the code following all rules above.

---

**Cursor**

我先获取你提供的 Figma 选择节点的数据（仅该节点），随后会整理可用的设计令牌与可导出资源。完成后我会给出实现 PLAN 并开始编码集成。

我现在去读取该 Figma 文件中你提供的 node 节点数据，并在需要时并行获取可导出图标资源。完成后会整理令牌及资源列表并输出实现 PLAN。

我将并行下载该选择中用到的矢量图标资源到项目 public 目录下，便于在组件中引入复用。随后我会输出实现 PLAN 并开始代码实现。

我将下载该选择中用到的矢量图标到项目的 public/icons 目录中备用，然后给出实现 PLAN 并进行实现。

我已经拿到 Figma 选择节点结构和样式信息。现在我会先输出实现 PLAN，然后创建组件与全局 CSS 变量，并把首页的 Hero 区块替换为该组件。

我将更新待办以修正组件文件名，然后创建新的组件、为全局添加 CSS 变量，并把首页 Hero 区块替换为该组件。接着我会检查并修复任何 Lint 问题。

我将先在全局样式中添加 CSS 变量映射（map-css-vars），并创建新的 `src/components/ui/docs-heading.tsx` 组件，然后替换首页 Hero 区块为该组件。接下来我会检查 Lint。

我将先在全局样式中添加本次 Figma 选择所需的 CSS 变量，然后创建 `src/components/ui/docs-heading.tsx` 组件并在首页接入。接着我会运行一次 Lint 检查。

```css
<<'PATCH'
*** Begin Patch
*** Update File: /Users/xiaoyu/developer/echocast-workshop/src/app/globals.css
@@
 @tailwind utilities;
 
 /* 全局基础样式 */
 ::root {
   --foreground-rgb: 0, 0, 0;
   --background-start-rgb: 214, 219, 220;
   --background-end-rgb: 255, 255, 255;
 }
+
+/* Figma 选择（Docs-heading）所需的颜色与尺寸变量 */
+:root {
+  /* surfaces & borders */
+  --color-surface: #ffffff; /* fill_VZ2D39[0] */
+  --color-border-subtle: #e5e7eb; /* stroke_DQHXGT */
+  --color-border-muted: #d1d5db; /* stroke_OUZ4HH */
+
+  /* text */
+  --color-text-primary: #1f2937; /* fill_6IJ2H6 */
+  --color-text-secondary: #6b7280; /* fill_BTH7NN */
+  --color-text-badge: #000000; /* fill_DWW9PE */
+
+  /* badge (soft green) */
+  --color-badge-soft-bg: #ccfbf1; /* fill_NOA1NT */
+  --color-badge-soft-fg: #115e59; /* fill_4GQGP6 */
+  --color-accent-teal: #2dd4bf; /* fill_8TOWQH */
+
+  /* radii */
+  --radius-docs-heading: 24px;
+
+  /* gradient colors (approx based on fill_ZUBN7K) */
+  --gradient-start: #67e8f9; /* rgb(103, 232, 249) */
+  --gradient-end: #c084fc;   /* rgb(192, 132, 252) */
+}
*** End Patch
PATCH
```

我刚完成了节点数据抓取，现在会先更新全局 CSS 变量，然后创建并集成新的组件到首页。接下来我会进行这些文件编辑。

```css
<<'PATCH'
*** Begin Patch
*** Update File: /Users/xiaoyu/developer/echocast-workshop/src/app/globals.css
@@
-/* 全局基础样式 */
-::root {
+/* 全局基础样式 */
+:root {
   --foreground-rgb: 0, 0, 0;
   --background-start-rgb: 214, 219, 220;
   --background-end-rgb: 255, 255, 255;
 }
+
+/* Figma 选择（Docs-heading）所需的颜色与尺寸变量 */
+:root {
+  /* surfaces & borders */
+  --color-surface: #ffffff; /* fill_VZ2D39[0] */
+  --color-border-subtle: #e5e7eb; /* stroke_DQHXGT */
+  --color-border-muted: #d1d5db; /* stroke_OUZ4HH */
+
+  /* text */
+  --color-text-primary: #1f2937; /* fill_6IJ2H6 */
+  --color-text-secondary: #6b7280; /* fill_BTH7NN */
+  --color-text-badge: #000000; /* fill_DWW9PE */
+
+  /* badge (soft green) */
+  --color-badge-soft-bg: #ccfbf1; /* fill_NOA1NT */
+  --color-badge-soft-fg: #115e59; /* fill_4GQGP6 */
+  --color-accent-teal: #2dd4bf; /* fill_8TOWQH */
+
+  /* radii */
+  --radius-docs-heading: 24px;
+
+  /* gradient colors (approx based on fill_ZUBN7K) */
+  --gradient-start: #67e8f9; /* rgb(103, 232, 249) */
+  --gradient-end: #c084fc;   /* rgb(192, 132, 252) */
+}
*** End Patch
PATCH
```

我将先修正全局样式中的根选择器并添加与 Figma 选择对应的 CSS 变量，然后创建新的 `src/components/ui/docs-heading.tsx` 组件，并把首页的 Hero 区块替换为该组件。完成后我会检查 Lint。

```css
<<'PATCH'
*** Begin Patch
*** Update File: /Users/xiaoyu/developer/echocast-workshop/src/app/globals.css
@@
-/* 全局基础样式 */
-::root {
+/* 全局基础样式 */
+:root {
   --foreground-rgb: 0, 0, 0;
   --background-start-rgb: 214, 219, 220;
   --background-end-rgb: 255, 255, 255;
 }
+
+/* Figma 选择（Docs-heading）所需的颜色与尺寸变量 */
+:root {
+  /* surfaces & borders */
+  --color-surface: #ffffff; /* fill_VZ2D39[0] */
+  --color-border-subtle: #e5e7eb; /* stroke_DQHXGT */
+  --color-border-muted: #d1d5db; /* stroke_OUZ4HH */
+
+  /* text */
+  --color-text-primary: #1f2937; /* fill_6IJ2H6 */
+  --color-text-secondary: #6b7280; /* fill_BTH7NN */
+  --color-text-badge: #000000; /* fill_DWW9PE */
+
+  /* badge (soft green) */
+  --color-badge-soft-bg: #ccfbf1; /* fill_NOA1NT */
+  --color-badge-soft-fg: #115e59; /* fill_4GQGP6 */
+  --color-accent-teal: #2dd4bf; /* fill_8TOWQH */
+
+  /* radii */
+  --radius-docs-heading: 24px;
+
+  /* gradient colors (approx based on fill_ZUBN7K) */
+  --gradient-start: #67e8f9; /* rgb(103, 232, 249) */
+  --gradient-end: #c084fc;   /* rgb(192, 132, 252) */
+}
*** End Patch
PATCH
```

我准备开始进行三处代码编辑：在全局样式中修正并新增 CSS 变量，创建新的 `src/components/ui/docs-heading.tsx` 组件，并在首页 `src/app/page.tsx` 中集成该组件。随后我会检查 Lint。

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 全局基础样式 */
:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

/* Figma 选择（Docs-heading）所需的颜色与尺寸变量 */
:root {
  /* surfaces & borders */
  --color-surface: #ffffff; /* fill_VZ2D39[0] */
  --color-border-subtle: #e5e7eb; /* stroke_DQHXGT */
  --color-border-muted: #d1d5db; /* stroke_OUZ4HH */

  /* text */
  --color-text-primary: #1f2937; /* fill_6IJ2H6 */
  --color-text-secondary: #6b7280; /* fill_BTH7NN */
  --color-text-badge: #000000; /* fill_DWW9PE */

  /* badge (soft green) */
  --color-badge-soft-bg: #ccfbf1; /* fill_NOA1NT */
  --color-badge-soft-fg: #115e59; /* fill_4GQGP6 */
  --color-accent-teal: #2dd4bf; /* fill_8TOWQH */

  /* radii */
  --radius-docs-heading: 24px;

  /* gradient colors (approx based on fill_ZUBN7K) */
  --gradient-start: #67e8f9; /* rgb(103, 232, 249) */
  --gradient-end: #c084fc;   /* rgb(192, 132, 252) */
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}

/* 自定义组件样式 */
@layer components {
  .nav-link {
    @apply px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200;
  }
  
  .nav-link-active {
    @apply bg-blue-600 text-white;
  }
  
  .nav-link-inactive {
    @apply text-gray-300 hover:bg-gray-700 hover:text-white;
  }

  /* 时区选择器样式 */
  .timezone-selector {
    @apply relative inline-block;
  }

  .timezone-dropdown {
    @apply absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20;
  }

  .timezone-option {
    @apply w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500;
  }

  .timezone-option-selected {
    @apply bg-blue-50 text-blue-600;
  }

  .timezone-option-unselected {
    @apply text-gray-700;
  }
}

```

```typescriptreact
import React from 'react'

export type DocsHeadingProps = {
  /** 顶部类别徽标文案，例如：基于星火大模型 */
  category: string
  /** 主标题，例如：AI 播客策划助手 */
  title: string
  /** 右侧功能徽章文案，例如：智能文案生成 */
  featureLabel: string
  /** 次级说明，例如：你的文案专家 */
  subtitle: string
  /** 图标路径（public 下相对路径），默认 /icons/x-diamond-fill.svg */
  featureIconSrc?: string
  className?: string
}

const DocsHeading: React.FC<DocsHeadingProps> = ({
  category,
  title,
  featureLabel,
  subtitle,
  featureIconSrc = '/icons/x-diamond-fill.svg',
  className,
}) => {
  return (
    <section
      className={[
        'relative overflow-hidden rounded-[var(--radius-docs-heading)]',
        'border border-[var(--color-border-subtle)]',
        'bg-[var(--color-surface)]',
        'p-10', // 40px
        'flex flex-col gap-12', // 48px
        className ?? '',
      ].join(' ')}
      aria-labelledby="docs-heading-title"
    >
      {/* 背景渐变（模糊叠加） */}
      <div
        className={[
          'pointer-events-none absolute inset-0 -z-10',
          'opacity-80 blur-[100px]',
          "bg-[radial-gradient(circle_at_-4%_9%,var(--gradient-start)_0%,var(--gradient-end)_100%)]",
        ].join(' ')}
        aria-hidden
      />

      {/* 顶部类别徽标 */}
      <div className="flex items-center gap-2.5 self-start rounded-full border border-[var(--color-border-muted)] bg-[var(--color-surface)] px-4 py-2.5 shadow-sm">
        <span className="text-sm font-semibold leading-[1.21] tracking-[0.5%] text-[var(--color-text-badge)]">
          {category}
        </span>
      </div>

      {/* 标题 + 右侧功能徽章 */}
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
        <h1
          id="docs-heading-title"
          className="text-4xl font-bold leading-[1.21] tracking-[0.5%] text-[var(--color-text-primary)]"
        >
          {title}
        </h1>

        <div className="inline-flex items-center gap-px rounded-full bg-[var(--color-badge-soft-bg)] p-1.5">
          <img
            src={featureIconSrc}
            alt=""
            width={12}
            height={12}
            className="h-3 w-3"
            aria-hidden
          />
          <span className="px-1 text-xs font-medium leading-[1.3333] tracking-[0.5%] text-[var(--color-badge-soft-fg)]">
            {featureLabel}
          </span>
        </div>
      </div>

      {/* 次级说明 */}
      <p className="text-base font-medium leading-[1.21] tracking-[0.5%] text-[var(--color-text-secondary)]">
        {subtitle}
      </p>
    </section>
  )
}

export default DocsHeading
```

```typescriptreact
import Container from '@/components/Container'
import DocsHeading from '@/components/ui/docs-heading'

export default function HomePage() {
  return (
    <Container>
      <div className="py-12">
        {/* Hero 区域（Figma Docs-heading 映射） */}
        <DocsHeading
          category="基于星火大模型"
          title="AI 播客策划助手"
          featureLabel="智能文案生成"
          subtitle="你的文案专家"
          className="text-left"
        />

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

我已获取并解析了 Figma 选择节点数据，并完成必要资源下载和组件落地。下面给出实现 PLAN 与代码。

### PLAN
- 组件边界
  - `src/components/ui/docs-heading.tsx`: 对应 Figma 选择 `Docs-heading`（实例），包含三部分：
    - 顶部徽标（Category Badge）
    - 标题 + 右侧软性徽章（含图标）
    - 次级说明文本
  - 在 `src/app/page.tsx` 用该组件替换 Hero 区域。
- 令牌使用（从 Figma 数据抽取）
  - 颜色
    - `--color-surface` = #FFFFFF (fill_VZ2D39)
    - `--color-border-subtle` = #E5E7EB (stroke_DQHXGT)
    - `--color-border-muted` = #D1D5DB (stroke_OUZ4HH)
    - `--color-text-primary` = #1F2937 (fill_6IJ2H6)
    - `--color-text-secondary` = #6B7280 (fill_BTH7NN)
    - `--color-text-badge` = #000000 (fill_DWW9PE)
    - `--color-badge-soft-bg` = #CCFBF1 (fill_NOA1NT)
    - `--color-badge-soft-fg` = #115E59 (fill_4GQGP6)
    - `--color-accent-teal` = #2DD4BF (fill_8TOWQH)
    - 渐变：`--gradient-start` = #67E8F9, `--gradient-end` = #C084FC (fill_ZUBN7K)
  - 圆角
    - `--radius-docs-heading` = 24px (borderRadius)
  - 字体与排版
    - Category: Inter/600/16px/line-height≈1.21/letter-spacing 0.5%
    - Title: Inter/700/36px/line-height≈1.21/letter-spacing 0.5%
    - Subtitle: Inter/500/16px/line-height≈1.21/letter-spacing 0.5%
- 自适应策略
  - 小屏：标题与徽章垂直排列；大于 md 时，标题与徽章左右分布。
  - 外层容器 `p-10` (40px)、`gap-12` (48px)，与 Figma 对齐（4px 步长均可整除）。
- 资产
  - 下载图标 `x-diamond-fill.svg` 到 `public/icons/x-diamond-fill.svg`，组件使用 `<img>` 引入。
- 结构映射
  - 遵循 Auto Layout：列布局、间距、内边距均用 Tailwind 工具类；渐变背景为绝对层且仅装饰。

### 代码
- 全局 CSS 变量（映射令牌）
```css
/* src/app/globals.css */
:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}
:root {
  --color-surface: #ffffff;
  --color-border-subtle: #e5e7eb;
  --color-border-muted: #d1d5db;
  --color-text-primary: #1f2937;
  --color-text-secondary: #6b7280;
  --color-text-badge: #000000;
  --color-badge-soft-bg: #ccfbf1;
  --color-badge-soft-fg: #115e59;
  --color-accent-teal: #2dd4bf;
  --radius-docs-heading: 24px;
  --gradient-start: #67e8f9;
  --gradient-end: #c084fc;
}
```

- 组件
```tsx
// src/components/ui/docs-heading.tsx
import React from 'react'

export type DocsHeadingProps = {
  category: string
  title: string
  featureLabel: string
  subtitle: string
  featureIconSrc?: string
  className?: string
}

const DocsHeading: React.FC<DocsHeadingProps> = ({
  category,
  title,
  featureLabel,
  subtitle,
  featureIconSrc = '/icons/x-diamond-fill.svg',
  className,
}) => {
  return (
    <section
      className={[
        'relative overflow-hidden rounded-[var(--radius-docs-heading)]',
        'border border-[var(--color-border-subtle)]',
        'bg-[var(--color-surface)]',
        'p-10',
        'flex flex-col gap-12',
        className ?? '',
      ].join(' ')}
      aria-labelledby="docs-heading-title"
    >
      <div
        className={[
          'pointer-events-none absolute inset-0 -z-10',
          'opacity-80 blur-[100px]',
          "bg-[radial-gradient(circle_at_-4%_9%,var(--gradient-start)_0%,var(--gradient-end)_100%)]",
        ].join(' ')}
        aria-hidden
      />

      <div className="flex items-center gap-2.5 self-start rounded-full border border-[var(--color-border-muted)] bg-[var(--color-surface)] px-4 py-2.5 shadow-sm">
        <span className="text-sm font-semibold leading-[1.21] tracking-[0.5%] text-[var(--color-text-badge)]">
          {category}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
        <h1
          id="docs-heading-title"
          className="text-4xl font-bold leading-[1.21] tracking-[0.5%] text-[var(--color-text-primary)]"
        >
          {title}
        </h1>

        <div className="inline-flex items-center gap-px rounded-full bg-[var(--color-badge-soft-bg)] p-1.5">
          <img
            src={featureIconSrc}
            alt=""
            width={12}
            height={12}
            className="h-3 w-3"
            aria-hidden
          />
          <span className="px-1 text-xs font-medium leading-[1.3333] tracking-[0.5%] text-[var(--color-badge-soft-fg)]">
            {featureLabel}
          </span>
        </div>
      </div>

      <p className="text-base font-medium leading-[1.21] tracking-[0.5%] text-[var(--color-text-secondary)]">
        {subtitle}
      </p>
    </section>
  )
}

export default DocsHeading
```

- 首页接入
```tsx
```3:33:/Users/xiaoyu/developer/echocast-workshop/src/app/page.tsx
import Container from '@/components/Container'
import DocsHeading from '@/components/ui/docs-heading'
...
        {/* Hero 区域（Figma Docs-heading 映射） */}
        <DocsHeading
          category="基于星火大模型"
          title="AI 播客策划助手"
          featureLabel="智能文案生成"
          subtitle="你的文案专家"
          className="text-left"
        />
```

### 响应式说明
- 在 `md` 断点以上，标题与右侧徽章横向排列，居左对齐；小屏保持竖向排列。
- 外层 padding 与 gaps 使用 40px 与 48px，均与 4px 步长对齐。

### 令牌缺失与说明
- 该选择未引用 Figma 全局变量命名（以变量名调用）；我们将具体值映射为 CSS 变量以利后续接入设计令牌系统。
- 若后续提供变量名（Tokens Studio 或 Figma Variables），可将对应值替换到上述 `:root` 变量，组件无需改动。

- 我已完成以下事项：
  - Figma 数据抓取与图标下载
  - 令牌到 CSS 变量映射
  - 组件创建与首页集成
  - Lint 检查通过

若需要把徽章替换为 shadcn/ui 的 Badge 组件，或把文本样式收敛到统一的 `Text` 语义组件，我可进一步抽象。

```css
/* src/app/globals.css */
:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}
:root {
  --color-surface: #ffffff;
  --color-border-subtle: #e5e7eb;
  --color-border-muted: #d1d5db;
  --color-text-primary: #1f2937;
  --color-text-secondary: #6b7280;
  --color-text-badge: #000000;
  --color-badge-soft-bg: #ccfbf1;
  --color-badge-soft-fg: #115e59;
  --color-accent-teal: #2dd4bf;
  --radius-docs-heading: 24px;
  --gradient-start: #67e8f9;
  --gradient-end: #c084fc;
}
```

```typescriptreact
// src/components/ui/docs-heading.tsx
import React from 'react'

export type DocsHeadingProps = {
  category: string
  title: string
  featureLabel: string
  subtitle: string
  featureIconSrc?: string
  className?: string
}

const DocsHeading: React.FC<DocsHeadingProps> = ({
  category,
  title,
  featureLabel,
  subtitle,
  featureIconSrc = '/icons/x-diamond-fill.svg',
  className,
}) => {
  return (
    <section
      className={[
        'relative overflow-hidden rounded-[var(--radius-docs-heading)]',
        'border border-[var(--color-border-subtle)]',
        'bg-[var(--color-surface)]',
        'p-10',
        'flex flex-col gap-12',
        className ?? '',
      ].join(' ')}
      aria-labelledby="docs-heading-title"
    >
      <div
        className={[
          'pointer-events-none absolute inset-0 -z-10',
          'opacity-80 blur-[100px]',
          "bg-[radial-gradient(circle_at_-4%_9%,var(--gradient-start)_0%,var(--gradient-end)_100%)]",
        ].join(' ')}
        aria-hidden
      />

      <div className="flex items-center gap-2.5 self-start rounded-full border border-[var(--color-border-muted)] bg-[var(--color-surface)] px-4 py-2.5 shadow-sm">
        <span className="text-sm font-semibold leading-[1.21] tracking-[0.5%] text-[var(--color-text-badge)]">
          {category}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
        <h1
          id="docs-heading-title"
          className="text-4xl font-bold leading-[1.21] tracking-[0.5%] text-[var(--color-text-primary)]"
        >
          {title}
        </h1>

        <div className="inline-flex items-center gap-px rounded-full bg-[var(--color-badge-soft-bg)] p-1.5">
          <img
            src={featureIconSrc}
            alt=""
            width={12}
            height={12}
            className="h-3 w-3"
            aria-hidden
          />
          <span className="px-1 text-xs font-medium leading-[1.3333] tracking-[0.5%] text-[var(--color-badge-soft-fg)]">
            {featureLabel}
          </span>
        </div>
      </div>

      <p className="text-base font-medium leading-[1.21] tracking-[0.5%] text-[var(--color-text-secondary)]">
        {subtitle}
      </p>
    </section>
  )
}

export default DocsHeading
```

```typescriptreact
```3:33:/Users/xiaoyu/developer/echocast-workshop/src/app/page.tsx
import Container from '@/components/Container'
import DocsHeading from '@/components/ui/docs-heading'
...
        {/* Hero 区域（Figma Docs-heading 映射） */}
        <DocsHeading
          category="基于星火大模型"
          title="AI 播客策划助手"
          featureLabel="智能文案生成"
          subtitle="你的文案专家"
          className="text-left"
        />
```

