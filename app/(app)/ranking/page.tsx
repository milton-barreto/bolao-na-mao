import { createClient } from '@/lib/supabase/server'
import { getRanking } from '@/lib/actions/ranking'
import { RankingPodium } from '@/components/ranking-podium'
import { RankingList } from '@/components/ranking-list'

export const revalidate = 60

export default async function RankingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ranking = await getRanking(user?.id)

  // Checa se há algum ponto no ranking
  const hasPoints = ranking.some((e) => e.total_points > 0)

  // Top 3 para o pódio (posições 1, 2 e 3)
  const podiumEntries = ranking.filter((e) => e.position <= 3)

  // Lista do 4º em diante
  const listEntries = ranking.filter((e) => e.position > 3)

  return (
    <div className="container py-4 pb-8">
      {!hasPoints ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <span className="text-5xl">🏆</span>
          <p className="text-lg font-semibold">Ninguém pontuou ainda. Aguenta firme.</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Os pontos aparecem aqui quando os jogos terminarem.
          </p>
        </div>
      ) : (
        <>
          {/* Pódio top 3 */}
          <RankingPodium entries={podiumEntries} />

          {/* Divider */}
          <div className="border-t border-[var(--border)] mx-4 my-4" />

          {/* Lista do 4º em diante */}
          {listEntries.length > 0 && (
            <RankingList entries={listEntries} currentUserId={user?.id} />
          )}

          {/* Se o usuário está no pódio, destaca isso */}
          {user && podiumEntries.some((e) => e.user.id === user.id) && (
            <p className="text-center text-sm text-success font-medium mt-4">
              🎉 Você está no pódio! Bora manter!
            </p>
          )}
        </>
      )}
    </div>
  )
}
