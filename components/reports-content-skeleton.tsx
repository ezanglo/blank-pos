export function ReportsContentSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading report">
      <div className="bg-muted/60 h-10 max-w-md animate-pulse rounded-md" />
      <div className="bg-muted/40 h-40 animate-pulse rounded-lg border" />
    </div>
  )
}
