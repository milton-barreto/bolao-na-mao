import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { TierBadge } from '@/components/ui/badge'
import { TeamFlag } from '@/components/team-flag'
import { getUpcomingMatches } from '@/lib/actions/matches'
import { getOdd } from '@/lib/odds'
import { formatKickoff, formatDeadline, isDeadlineSoon } from '@/lib/datetime'
import type { MatchWithTeams } from '@/types'

export const revalidate = 300

/** Pontuação potencial máxima de um confronto = 2 × maior odd possível */
function maxPotential(homeTier: number, awayTier: number): number {
  const odds = [
    getOdd(homeTier, awayTier, 'home_win'),
    getOdd(homeTier, awayTier, 'away_win'),
    getOdd(homeTier, awayTier, 'draw'),
  ]
  return parseFloat((2 * Math.max(...odds)).toFixed(2))
}

function HomeMatchCard({ match }: { match: MatchWithTeams }) {
  const home = match.home_team
  const away = match.away_team
  const homeTier = match.home_tier_at_kickoff ?? home?.current_tier ?? 3
  const awayTier = match.away_tier_at_kickoff ?? away?.current_tier ?? 3
  const potential = maxPotential(homeTier, awayTier)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <TeamFlag flagUrl={home?.flag_url ?? null} teamName={home?.name ?? '?'} size={28} />
          <span className="text-sm font-semibold">{home?.name ?? '?'}</span>
          <TierBadge tier={homeTier as 1 | 2 | 3 | 4 | 5} />
        </div>
        <span className="shrink-0 font-display text-sm text-muted-foreground">×</span>
        <div className="flex flex-1 items-center justify-end gap-2 text-right">
          <TierBadge tier={awayTier as 1 | 2 | 3 | 4 | 5} />
          <span className="text-sm font-semibold">{away?.name ?? '?'}</span>
          <TeamFlag flagUrl={away?.flag_url ?? null} teamName={away?.name ?? '?'} size={28} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>🗓️ {formatKickoff(match.kickoff_at)}</span>
        <span className="font-semibold text-success">
          vale até {potential.toFixed(2).replace('.', ',')} pts
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {match.deadline_at ? formatDeadline(match.deadline_at) : ''}
        </span>
        <Button asChild size="sm">
          <Link href={`/grupos/rodada/${match.round_number ?? 1}`}>Palpitar</Link>
        </Button>
      </div>
    </div>
  )
}

export default async function Home() {
  const matches = await getUpcomingMatches(5)

  const hasSoonDeadline = matches.some(
    (m) => m.deadline_at && isDeadlineSoon(m.deadline_at),
  )

  return (
    <Container className="py-6">
      <header className="mb-4">
        <h1 className="font-display text-2xl font-bold">Próximos jogos ⚽</h1>
        <p className="text-sm text-muted-foreground">
          Palpita antes do relógio fechar.
        </p>
      </header>

      {hasSoonDeadline && (
        <div className="mb-4 rounded-xl bg-warning px-4 py-3 text-sm font-semibold text-black">
          ⏱️ Ó o relógio! Tem jogo fechando em menos de 1h.
        </div>
      )}

      {matches.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-lg font-semibold">
            Tá voando! 🚀
          </p>
          <p className="text-muted-foreground">
            Todos os próximos jogos já têm palpite.
          </p>
          <Button asChild variant="outline">
            <Link href="/ranking">Ver o ranking</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {matches.map((match) => (
            <HomeMatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </Container>
  )
}
