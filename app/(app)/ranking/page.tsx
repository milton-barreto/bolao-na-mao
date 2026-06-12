import { createClient } from '@/lib/supabase/server'
import { getRanking } from '@/lib/actions/ranking'
import { Trophy } from 'lucide-react'
import { Container } from '@/components/layout/container'
import { RankingPodium } from '@/components/ranking-podium'
import { RankingList } from '@/components/ranking-list'
import { ShareRankingButton } from '@/components/share-ranking-button'

export const revalidate = 60

export default async function RankingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ranking = await getRanking(user?.id)

  const hasPoints = ranking.some((e) => e.total_points > 0)
  const podiumEntries = ranking.filter((e) => e.position <= 3)
  const listEntries = ranking.filter((e) => e.position > 3)

  return (
    <Container className="py-4 pb-10">
      {!hasPoints ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-semibold">Ninguém pontuou ainda. Aguenta firme.</p>
          <p className="text-sm text-muted-foreground">
            Os pontos pipocam aqui quando rolar os jogos.
          </p>
        </div>
      ) : (
        <>
          <RankingPodium entries={podiumEntries} />

          <div className="flex justify-end px-1 -mt-2 mb-3">
            <ShareRankingButton entries={ranking} currentUserId={user?.id} />
          </div>

          <div className="border-t border-border my-2" />

          {listEntries.length > 0 && (
            <RankingList entries={listEntries} currentUserId={user?.id} />
          )}

          {user && podiumEntries.some((e) => e.user.id === user.id) && (
            <p className="mt-4 text-center text-sm font-medium text-success">
              Você tá no pódio! 🔥 Não deixa cair!
            </p>
          )}
        </>
      )}
    </Container>
  )
}
