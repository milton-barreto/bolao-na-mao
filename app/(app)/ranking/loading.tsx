import { Container } from '@/components/layout/container'

export default function Loading() {
  return (
    <Container className="py-4 pb-10">
      {/* Pódio */}
      <div className="flex items-end justify-center gap-3 pt-4 mb-8">
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
          <div className="h-16 w-24 rounded-t-xl bg-muted animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
          <div className="h-24 w-24 rounded-t-xl bg-muted animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
          <div className="h-12 w-24 rounded-t-xl bg-muted animate-pulse" />
        </div>
      </div>

      <div className="border-t border-border my-2" />

      {/* Lista */}
      <div className="flex flex-col">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-3 border-b border-border/40">
            <div className="h-4 w-4 rounded bg-muted animate-pulse shrink-0" />
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 h-4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-14 rounded bg-muted animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </Container>
  )
}
