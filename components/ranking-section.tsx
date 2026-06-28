import { Trophy } from 'lucide-react'
import { RankingPodium } from '@/components/ranking-podium'
import { RankingList } from '@/components/ranking-list'
import { ShareRankingButton } from '@/components/share-ranking-button'
import type { RankingEntry } from '@/types'

interface RankingSectionProps {
  entries: RankingEntry[]
  currentUserId?: string
}

export function RankingSection({ entries, currentUserId }: RankingSectionProps) {
  const hasPoints = entries.some((e) => e.total_points > 0)
  const podiumEntries = entries.filter((e) => e.position <= 3)
  const listEntries = entries.filter((e) => e.position > 3)

  // Estado vazio compacto — não empurra os palpites pra fora da dobra na home
  if (!hasPoints) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4">
        <Trophy className="h-6 w-6 shrink-0 text-muted-foreground/50" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Ninguém pontuou ainda. Aguenta firme.</p>
          <p className="text-xs text-muted-foreground">
            Os pontos pipocam aqui quando rolar os jogos.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <RankingPodium entries={podiumEntries} />

      <div className="flex justify-end px-1 -mt-2 mb-3">
        <ShareRankingButton entries={entries} currentUserId={currentUserId} />
      </div>

      <div className="border-t border-border my-2" />

      {listEntries.length > 0 && (
        <RankingList entries={listEntries} currentUserId={currentUserId} />
      )}

      {currentUserId && podiumEntries.some((e) => e.user.id === currentUserId) && (
        <p className="mt-4 text-center text-sm font-medium text-success">
          Você tá no pódio! 🔥 Não deixa cair!
        </p>
      )}
    </>
  )
}
