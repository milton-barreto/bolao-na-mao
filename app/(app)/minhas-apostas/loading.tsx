import { Container } from '@/components/layout/container'

function BetCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <div className="h-6 w-6 rounded bg-muted animate-pulse" />
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-5 w-4 rounded bg-muted animate-pulse" />
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          <div className="h-6 w-6 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="h-10 rounded-xl bg-muted animate-pulse" />
    </div>
  )
}

export default function Loading() {
  return (
    <Container className="py-6">
      <div className="mb-4 h-8 w-44 rounded-lg bg-muted animate-pulse" />
      {/* Totalizador */}
      <div className="mb-5 h-20 w-full rounded-xl bg-muted animate-pulse" />
      {/* Abas de rodada */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-12 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 w-16 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
      {/* Cards */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <BetCardSkeleton key={i} />
        ))}
      </div>
    </Container>
  )
}
