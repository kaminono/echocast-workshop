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
