import Image from 'next/image'
import type { RankingEntry } from '@/types'

interface RankingListProps {
  entries: RankingEntry[]
  currentUserId?: string
}

export function RankingList({ entries, currentUserId }: RankingListProps) {
  const lastEntry = entries[entries.length - 1]

  return (
    <div className="divide-y divide-[var(--border)]">
      {entries.map((entry, idx) => {
        const isLast = idx === entries.length - 1 && entries.length > 3
        const isCurrent = entry.user.id === currentUserId

        return (
          <div
            key={entry.user.id}
            className="flex items-center gap-3 px-4 py-3 transition-colors"
            style={{
              backgroundColor: isCurrent ? '#F0FDF4' : undefined,
            }}
          >
            {/* Posição */}
            <span className="w-8 text-center text-sm font-bold text-[var(--text-secondary)] flex-shrink-0">
              {entry.position}.
            </span>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--bg-surface)] flex-shrink-0">
              {entry.user.avatar_url ? (
                <Image
                  src={entry.user.avatar_url}
                  alt={entry.user.name}
                  width={36}
                  height={36}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--primary)] text-[var(--primary-fg)] font-bold text-sm">
                  {entry.user.name[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* Nome + indicador "você" */}
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm truncate block">
                {entry.user.name}
                {isCurrent && (
                  <span className="ml-2 text-xs text-success font-semibold">
                    ← Você
                  </span>
                )}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {entry.bets_count} palpites ·{' '}
                {entry.acertou_placar_count} cravadas ·{' '}
                {entry.acertou_resultado_count} resultados
              </span>
            </div>

            {/* Pontos */}
            <span className="font-bold text-sm font-display flex-shrink-0">
              {entry.total_points.toFixed(1)} pts
            </span>
          </div>
        )
      })}

      {/* Microcopy do último lugar */}
      {lastEntry && entries.length > 3 && (
        <div className="px-4 py-2 text-xs text-[var(--text-secondary)] text-center">
          {lastEntry.isCurrentUser
            ? '😬 Lanterninha, mas ainda dá pra virar.'
            : `${lastEntry.user.name.split(' ')[0]} tá na lanterninha. Corre!`}
        </div>
      )}
    </div>
  )
}
