import { Container } from '@/components/layout/container'
import { MyBetsView } from '@/components/my-bets-view'
import { getMyBets, type MyBetEntry } from '@/lib/actions/bets'

export const revalidate = 60
export const metadata = { title: 'Minhas Apostas — Bolão na Mão' }

export default async function MinhasApostasPage() {
  // Todos os jogos da fase de grupos com meus palpites
  const allBets = await getMyBets('group')

  // Agrupa por rodada
  const rounds: Record<number, MyBetEntry[]> = { 1: [], 2: [], 3: [] }
  for (const entry of allBets) {
    const r = entry.match.round_number ?? 1
    if (rounds[r]) rounds[r].push(entry)
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
        <h1 className="font-display text-2xl font-bold">Minhas Apostas</h1>
      </header>

      {/* Totalizador */}
      <div className="mb-5 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
        <div>
          <p className="text-xs font-medium opacity-80">
            Pontos na fase de grupos
          </p>
          <p className="font-display text-3xl font-bold">
            {totalPoints.toFixed(2).replace('.', ',')}
          </p>
        </div>
        <div className="text-right text-xs font-medium opacity-90">
          <p>🎯 {cravadas} cravadas</p>
          <p>⚡ {resultados} resultados</p>
        </div>
      </div>

      <MyBetsView rounds={rounds} />
    </Container>
  )
}
