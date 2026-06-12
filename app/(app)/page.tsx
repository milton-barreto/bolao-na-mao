import Link from 'next/link'
import { Suspense } from 'react'
import { Timer, Zap, CheckCircle2, Calendar, ChevronRight } from 'lucide-react'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { TeamFlag } from '@/components/team-flag'
import { CompetitorsBetsSection } from '@/components/competitors-bets-section'
import { getUpcomingMatches } from '@/lib/actions/matches'
import { getOdd } from '@/lib/odds'
import { formatKickoff, isDeadlineSoon } from '@/lib/datetime'
import type { MatchWithTeams } from '@/types'

export const revalidate = 300

function maxPotential(homeTier: number, awayTier: number): number {
  const odds = [
    getOdd(homeTier, awayTier, 'home_win'),
    getOdd(homeTier, awayTier, 'away_win'),
    getOdd(homeTier, awayTier, 'draw'),
  ]
  return parseFloat((2 * Math.max(...odds)).toFixed(2))
}

function PendingMatchCard({
  match,
  urgent,
}: {
  match: MatchWithTeams
  urgent: boolean
}) {
  const home = match.home_team
  const away = match.away_team
  const homeTier = match.home_tier_at_kickoff ?? home?.current_tier ?? 3
  const awayTier = match.away_tier_at_kickoff ?? away?.current_tier ?? 3
  const potential = maxPotential(homeTier, awayTier)

  return (
    <Link
      href={`/grupos/rodada/${match.round_number ?? 1}`}
      className={`group flex items-center gap-3 rounded-2xl border bg-card p-3.5 transition-all hover:shadow-sm active:scale-[0.99] ${
        urgent
          ? 'border-warning/60 bg-warning/5'
          : 'border-border'
      }`}
    >
      {/* Times */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5">
          <TeamFlag flagUrl={home?.flag_url ?? null} teamName={home?.name ?? '?'} size={24} />
          <TeamFlag flagUrl={away?.flag_url ?? null} teamName={away?.name ?? '?'} size={24} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold leading-tight truncate">
            {home?.name} × {away?.name}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {urgent ? (
              <span className="flex items-center gap-1 font-semibold text-warning">
                <Timer className="h-3 w-3" /> Fecha em breve
              </span>
            ) : (
              <>
                <Calendar className="h-3 w-3" />
                <span>{formatKickoff(match.kickoff_at)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Potencial + seta */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-success tabular-nums">
            +{potential.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-[10px] text-muted-foreground">pts máx</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

export default async function Home() {
  const matches = await getUpcomingMatches(3)

  const urgentCount = matches.filter(
    (m) => m.deadline_at && isDeadlineSoon(m.deadline_at),
  ).length

  return (
    <Container className="py-6">

      {/* Seção 1 — Palpites pendentes */}
      <section className="mb-6">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h1 className="font-display text-lg font-bold leading-tight">
                {matches.length === 0
                  ? 'Tudo palpitado'
                  : `${matches.length} jogo${matches.length > 1 ? 's' : ''} sem palpite`}
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground pl-6">
              {matches.length === 0
                ? 'Você apostou em todos os próximos jogos.'
                : 'Palpita antes do prazo fechar.'}
            </p>
          </div>
        </div>

        {urgentCount > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-warning/15 border border-warning/30 px-3.5 py-2.5 text-sm font-semibold text-foreground">
            <Timer className="h-4 w-4 shrink-0 text-warning" />
            <span className="text-[13px]">
              {urgentCount === 1
                ? 'Atenção: 1 jogo fecha em menos de 1h!'
                : `Atenção: ${urgentCount} jogos fecham em menos de 1h!`}
            </span>
          </div>
        )}

        {matches.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-4 py-10 text-center">
            <CheckCircle2 className="h-9 w-9 text-success/70" />
            <p className="text-sm font-semibold">Você tá em dia!</p>
            <p className="text-xs text-muted-foreground">
              Todos os próximos jogos já têm o seu palpite.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-1">
              <Link href="/ranking">Ver o ranking</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {matches.map((match) => (
              <PendingMatchCard
                key={match.id}
                match={match}
                urgent={!!(match.deadline_at && isDeadlineSoon(match.deadline_at))}
              />
            ))}
          </div>
        )}
      </section>

      <div className="border-t border-border" />

      {/* Seção 2 — Acompanhamento da galera */}
      <section className="mt-6">
        <Suspense
          fallback={
            <div className="py-6 text-center text-sm text-muted-foreground">
              Carregando palpites...
            </div>
          }
        >
          <CompetitorsBetsSection />
        </Suspense>
      </section>
    </Container>
  )
}
