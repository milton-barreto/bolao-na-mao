import { Clock, Swords, Lock } from 'lucide-react'
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
        <Clock className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <p className="text-lg font-semibold">Calma aí! ⏳</p>
        <p className="text-sm text-[var(--text-secondary)]">
          O mata-mata aparece aqui quando acabar a fase de grupos. Vai chegando!
        </p>
      </div>
    )
  }

  // Determinar aba ativa
  const availablePhases = PHASES.filter((p) => tournamentState ? isPhaseAvailable(tournamentState, p.id) : false)
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
      <h1 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
        <Swords className="h-5 w-5" />
        Mata-mata
      </h1>

      {/* Abas de fase */}
      <div className="flex overflow-x-auto gap-0 border-b border-[var(--border)] mb-6 -mx-4 px-4">
        {PHASES.map((p) => {
          const available = tournamentState ? isPhaseAvailable(tournamentState, p.id) : false
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
              <span className="flex items-center gap-1">
                {p.label}
                {!available && <Lock className="h-3 w-3" />}
              </span>
            </a>
          )
        })}
      </div>

      {/* Conteúdo da aba */}
      {(!tournamentState || !isPhaseAvailable(tournamentState, activePhase)) ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Lock className="h-8 w-8 text-muted-foreground/50" />
          <p className="font-medium">Ainda não! Espera essa fase acabar. 🏃</p>
        </div>
      ) : matches.length === 0 ? (
        <p className="text-center text-[var(--text-secondary)] py-8">
          Sem jogo aqui por enquanto. 👀
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
