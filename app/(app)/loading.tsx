import { Container } from '@/components/layout/container'

export default function Loading() {
  return (
    <Container className="py-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-muted animate-pulse" />
        <div className="h-5 w-48 rounded bg-muted animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="h-6 w-6 rounded bg-muted animate-pulse" />
              <div className="h-6 w-6 rounded bg-muted animate-pulse" />
            </div>
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <div className="h-4 w-36 rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="h-4 w-10 rounded bg-muted animate-pulse" />
              <div className="h-3 w-14 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  )
}
