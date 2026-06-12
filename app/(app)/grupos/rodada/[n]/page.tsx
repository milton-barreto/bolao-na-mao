import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight, Timer } from 'lucide-react'
import { Container } from '@/components/layout/container'
import { MatchCard } from '@/components/match-card'
import { getMatchesByRound } from '@/lib/actions/matches'
import { getBetsForMatch } from '@/lib/actions/bets'
import { createClient } from '@/lib/supabase/server'
import { isDeadlinePassed, isDeadlineSoon } from '@/lib/datetime'
import type { Bet } from '@/types'

export const revalidate = 60

const ROUNDS = [1, 2, 3]

export default async function RodadaPage({
  params,
}: {
  params: Promise<{ n: string }>
}) {
  const { n } = await params
  const round = Number(n)
  if (!ROUNDS.includes(round)) notFound()

  // Busca matches e usuário em paralelo
  const supabase = await createClient()
  const [matches, { data: { user } }] = await Promise.all([
    getMatchesByRound(round),
    supabase.auth.getUser(),
  ])

  const matchIds = matches.map((m) => m.id)
  const passedDeadlineMatches = matches.filter(
    (m) => m.deadline_at && isDeadlinePassed(m.deadline_at),
  )

  // Meus palpites e palpites alheios em paralelo
  const [myBetsResult, otherBetsEntries] = await Promise.all([
    user && matchIds.length > 0
      ? supabase.from('bets').select('*').eq('user_id', user.id).in('match_id', matchIds)
      : Promise.resolve({ data: null }),
    Promise.all(
      passedDeadlineMatches.map(async (m) => ({
        matchId: m.id,
        bets: await getBetsForMatch(m.id),
      })),
    ),
  ])

  const myBetByMatch = new Map<string, Bet>()
  for (const b of myBetsResult.data ?? []) {
    if (b.match_id) myBetByMatch.set(b.match_id, b as Bet)
  }

  const otherBetsByMatch = new Map<string, Awaited<ReturnType<typeof getBetsForMatch>>>()
  for (const { matchId, bets } of otherBetsEntries) {
    otherBetsByMatch.set(matchId, bets)
  }

  // Banner se algum jogo tem deadline < 1h
  const hasSoonDeadline = matches.some(
    (m) => m.deadline_at && isDeadlineSoon(m.deadline_at),
  )

  const prevRound = round > 1 ? round - 1 : null
  const nextRound = round < 3 ? round + 1 : null

  return (
    <Container className="py-6">
      <header className="mb-4">
        <h1 className="font-display text-2xl font-bold">
          Rodada {round}
        </h1>
      </header>

      {hasSoonDeadline && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-warning px-4 py-3 text-sm font-semibold text-black">
          <Timer className="h-4 w-4 shrink-0" />
          Ó o relógio! Tem jogo fechando em menos de 1h.
        </div>
      )}

      {matches.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Sem jogo nessa rodada ainda. 🤷
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              myBet={myBetByMatch.get(match.id) ?? null}
              otherBets={otherBetsByMatch.get(match.id) ?? []}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}

      {/* Navegação entre rodadas */}
      <nav className="mt-6 flex items-center justify-between">
        {prevRound ? (
          <Link
            href={`/grupos/rodada/${prevRound}`}
            className="flex items-center gap-1 text-sm font-medium text-brand-blue"
          >
            <ChevronLeft className="h-4 w-4" /> Rodada {prevRound}
          </Link>
        ) : (
          <span />
        )}
        {nextRound ? (
          <Link
            href={`/grupos/rodada/${nextRound}`}
            className="flex items-center gap-1 text-sm font-medium text-brand-blue"
          >
            Rodada {nextRound} <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </Container>
  )
}
