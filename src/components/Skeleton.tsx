export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`bg-surface-200 animate-pulse rounded-xl ${className}`} />
}

export function SkeletonStatCard() {
  return (
    <div className="card p-4 flex items-center gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-lg bg-surface-300 shrink-0" />
      <div className="space-y-1.5 flex-1">
        <div className="h-3 w-16 bg-surface-300 rounded" />
        <div className="h-5 w-20 bg-surface-300 rounded" />
      </div>
    </div>
  )
}

export function SkeletonCardRow({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-surface-300 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-surface-300 rounded" />
              <div className="h-3 w-2/3 bg-surface-300 rounded" />
            </div>
            <div className="flex gap-1">
              <div className="w-8 h-8 bg-surface-300 rounded-lg" />
              <div className="w-8 h-8 bg-surface-300 rounded-lg" />
              <div className="w-8 h-8 bg-surface-300 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-surface-300 rounded w-1/4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 bg-surface-300 rounded flex-1" />
          <div className="h-4 bg-surface-300 rounded flex-1" />
          <div className="h-4 bg-surface-300 rounded flex-1" />
          <div className="h-4 bg-surface-300 rounded w-12" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart() {
  return <div className="card p-4 animate-pulse"><div className="h-[180px] bg-surface-300 rounded-xl" /></div>
}
