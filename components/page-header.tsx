import type { ReactNode } from 'react'

/**
 * The header every route opens with: a quiet meta line, the page's one <h1>,
 * an optional sentence, and a right-hand slot for the page's controls. Shared
 * so the type scale is decided once — the flat 18px headings were the loudest
 * thing wrong with the old screens.
 */
export function PageHeader({
  meta,
  title,
  description,
  children,
}: {
  meta?: ReactNode
  title: string
  description?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        {meta ? (
          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            {meta}
          </p>
        ) : null}
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground max-w-[56ch] text-sm text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  )
}
