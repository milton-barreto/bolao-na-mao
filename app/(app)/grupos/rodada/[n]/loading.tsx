import { Container } from '@/components/layout/container'

function MatchCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <div className="h-9 w-9 rounded bg-muted animate-pulse" />
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-3 w-10 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="h-6 w-5 rounded bg-muted animate-pulse" />
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="flex flex-col items-end gap-1.5">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-3 w-10 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-9 w-9 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 py-1">
        <div className="h-12 w-16 rounded-xl bg-muted animate-pulse" />
        <div className="h-6 w-4 rounded bg-muted animate-pulse" />
        <div className="h-12 w-16 rounded-xl bg-muted animate-pulse" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded bg-muted animate-pulse" />
        <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <Container className="py-6">
      <header className="mb-4">
        <div className="h-8 w-28 rounded-lg bg-muted animate-pulse" />
      </header>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    </Container>
  )
}
