import { Target, Zap } from 'lucide-react'
import { Container } from '@/components/layout/container'
import { MyBetsView } from '@/components/my-bets-view'
import { getMyBets, type MyBetEntry } from '@/lib/actions/bets'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 60
export const metadata = { title: 'Minhas Apostas — Bolão na Mão' }

export default async function MinhasApostasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Todos os jogos da fase de grupos com meus palpites
  const allBets = await getMyBets('group')

  // Agrupa por rodada (dinâmico — sem hardcode de rodadas)
  const rounds: Record<number, MyBetEntry[]> = {}
  for (const entry of allBets) {
    const r = entry.match.round_number ?? 1
    if (!rounds[r]) rounds[r] = []
    rounds[r].push(entry)
  }

  // Totalizador: soma de total_points dos jogos finalizados
  const totalPoints = allBets.reduce(
    (sum, e) => sum + (e.bet?.total_points ?? 0),
    0,
  )

  // Contadores
  const cravadas = allBets.filter((e) => e.status === 'acertou_placar').length
  const resultados = allBets.filter(
    (e) => e.status === 'acertou_resultado',
  ).length

  return (
    <Container className="py-6">
      <header className="mb-4">
        <h1 className="font-display text-2xl font-bold">Meus Palpites</h1>
      </header>

      {/* Totalizador */}
      <div className="mb-5 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
        <div>
          <p className="text-xs font-medium opacity-80">
            seus pontos na fase de grupos
          </p>
          <p className="font-display text-3xl font-bold">
            {totalPoints.toFixed(2).replace('.', ',')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs font-medium opacity-90">
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {cravadas} cravadas
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {resultados} resultados
          </span>
        </div>
      </div>

      <MyBetsView rounds={rounds} currentUserId={user?.id} />
    </Container>
  )
}
