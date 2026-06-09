import { type ReactNode } from 'react'

export interface Column<T> {
  header: string
  accessor?: (item: T, index: number) => ReactNode
  render?: (item: T, index: number) => ReactNode
  textAlign?: 'left' | 'right' | 'center'
  hideOnMobile?: boolean
  mobileLabel?: string
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  mobileCard?: (item: T) => ReactNode
}

export function ResponsiveTable<T>({ columns, data, keyExtractor, mobileCard }: Props<T>) {
  const visibleCols = columns.filter((c) => !c.hideOnMobile)

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 text-surface-400 text-xs uppercase">
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={`p-3 ${col.textAlign === 'right' ? 'text-right' : col.textAlign === 'center' ? 'text-center' : 'text-left'}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={keyExtractor(item)} className="border-b border-surface-700/50">
                {columns.map((col) => {
                  const val = col.render ? col.render(item, idx) : col.accessor?.(item, idx)
                  return (
                    <td
                      key={col.header}
                      className={`p-3 ${col.textAlign === 'right' ? 'text-right' : col.textAlign === 'center' ? 'text-center' : 'text-left'}`}
                    >
                      {val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="block md:hidden space-y-3">
        {data.length === 0 && (
          <div className="text-center py-8 text-surface-400 text-sm">No data</div>
        )}
        {data.map((item, idx) => (
          <div key={keyExtractor(item)}>
            {mobileCard ? (
              mobileCard(item)
            ) : (
              <div className="card !p-4 space-y-1.5">
                {visibleCols.map((col) => {
                  const val = col.render ? col.render(item, idx) : col.accessor?.(item, idx)
                  if (val === null || val === undefined) return null
                  return (
                    <div key={col.header} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-surface-400 shrink-0">{col.mobileLabel ?? col.header}</span>
                      <span className="text-sm text-surface-200 text-right">{val}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
