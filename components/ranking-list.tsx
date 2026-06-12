import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { RankingEntry } from '@/types'

interface RankingListProps {
  entries: RankingEntry[]
  currentUserId?: string
}

export function RankingList({ entries, currentUserId }: RankingListProps) {
  return (
    <div className="divide-y divide-border">
      {entries.map((entry) => {
        const isCurrent = entry.user.id === currentUserId

        return (
          <div
            key={entry.user.id}
            className={cn(
              'flex items-center gap-3 px-2 py-3 transition-colors',
              isCurrent && 'rounded-xl bg-success/10',
            )}
          >
            {/* Posição */}
            <span className="w-8 shrink-0 text-center text-sm font-bold text-muted-foreground">
              {entry.position}.
            </span>

            {/* Avatar */}
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
              {entry.user.avatar_url ? (
                <Image
                  src={entry.user.avatar_url}
                  alt={entry.user.name}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
                  {entry.user.name[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* Nome + subtítulo */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold">
                  {entry.user.name}
                </span>
                {isCurrent && (
                  <span className="shrink-0 text-xs font-semibold text-success">
                    ← Você
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {entry.bets_count} palpites ·{' '}
                {entry.acertou_placar_count} cravadas ·{' '}
                {entry.acertou_resultado_count} resultados
              </p>
            </div>

            {/* Pontos */}
            <span className="shrink-0 font-display text-sm font-bold">
              {entry.total_points.toFixed(1)} pts
            </span>
          </div>
        )
      })}

      {/* Último lugar */}
      {entries.length > 0 && (
        <div className="px-2 py-2 text-center text-xs text-muted-foreground">
          {entries[entries.length - 1]?.isCurrentUser
            ? '😬 Lanterninha, mas ainda dá pra virar.'
            : `${entries[entries.length - 1]?.user.name.split(' ')[0]} tá na lanterninha. Corre!`}
        </div>
      )}
    </div>
  )
}
