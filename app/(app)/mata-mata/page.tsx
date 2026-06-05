import { createClient } from '@/lib/supabase/server'
import { KnockoutMatchCard } from '@/components/knockout-match-card'
import { getTournamentState } from '@/lib/actions/golden-ticket'
import { getKnockoutMatches, getKnockoutBetsForMatch } from '@/lib/actions/knockout'
import { isPhaseAvailable } from '@/lib/constants'
import type { MatchWithTeams, Bet } from '@/types'

export const dynamic = 'force-dynamic'

const PHASES = [
  { id: 'r32', label: '16-avos' },
  { id: 'r16', label: 'Oitavas' },
  { id: 'qf', label: 'Quartas' },
  { id: 'sf', label: 'Semis' },
  { id: 'final', label: 'Final' },
]

interface Props {
  searchParams: Promise<{ fase?: string }>
}

export default async function MataMataPage({ searchParams }: Props) {
  const params = await searchParams
  const tournamentState = await getTournamentState()

  // Fase de grupos ainda: mostrar aviso
  if (tournamentState === 'group') {
    return (
      <div className="container py-12 text-center space-y-3">
        <span className="text-4xl">⏳</span>
        <p className="text-lg font-semibold">Disponível após a fase de grupos</p>
        <p className="text-sm text-[var(--text-secondary)]">
          Quando as chaves do mata-mata forem definidas, os jogos aparecem aqui.
        </p>
      </div>
    )
  }

  // Determinar aba ativa
  const availablePhases = PHASES.filter((p) => isPhaseAvailable(tournamentState as any, p.id))
  const activePhase = params.fase ?? availablePhases[0]?.id ?? 'r32'

  // Buscar jogos da fase ativa e palpites do usuário
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const matches = await getKnockoutMatches(activePhase)

  // Busca bets do usuário para esses jogos
  const matchIds = matches.map((m) => m.id)
  const { data: myBets } = user
    ? await supabase.from('bets').select('*').eq('user_id', user.id).in('match_id', matchIds)
    : { data: [] }

  const myBetsByMatchId = new Map((myBets ?? []).map((b) => [b.match_id, b]))

  // Busca palpites alheios para cada jogo (pós deadline)
  const otherBetsMap = new Map<string, Awaited<ReturnType<typeof getKnockoutBetsForMatch>>>()
  await Promise.all(
    matches.map(async (m) => {
      const bets = await getKnockoutBetsForMatch(m.id)
      if (bets.length > 0) otherBetsMap.set(m.id, bets)
    })
  )

  return (
    <div className="container py-4 pb-8">
      <h1 className="text-xl font-bold font-display mb-4">⚔️ Mata-mata</h1>

      {/* Abas de fase */}
      <div className="flex overflow-x-auto gap-0 border-b border-[var(--border)] mb-6 -mx-4 px-4">
        {PHASES.map((p) => {
          const available = isPhaseAvailable(tournamentState as any, p.id)
          const isActive = p.id === activePhase
          return (
            <a
              key={p.id}
              href={`/mata-mata?fase=${p.id}`}
              className={[
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0',
                isActive
                  ? 'border-[var(--primary)] text-[var(--text-primary)]'
                  : available
                  ? 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-disabled)] cursor-not-allowed',
              ].join(' ')}
            >
              {p.label}
              {!available && ' 🔒'}
            </a>
          )
        })}
      </div>

      {/* Conteúdo da aba */}
      {!isPhaseAvailable(tournamentState as any, activePhase) ? (
        <div className="text-center py-12 space-y-2">
          <span className="text-3xl">🔒</span>
          <p className="font-medium">Disponível após o término da fase anterior</p>
        </div>
      ) : matches.length === 0 ? (
        <p className="text-center text-[var(--text-secondary)] py-8">
          Nenhum jogo disponível nessa fase ainda.
        </p>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <KnockoutMatchCard
              key={match.id}
              match={match}
              myBet={myBetsByMatchId.get(match.id) ?? null}
              otherBets={otherBetsMap.get(match.id) ?? []}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
