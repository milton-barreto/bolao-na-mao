'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TierBadge, Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TeamFlag } from '@/components/team-flag'
import { formatKickoff, isDeadlinePassed } from '@/lib/datetime'
import { previewPoints } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import type { MyBetEntry } from '@/lib/actions/bets'
import type { BetStatus } from '@/types'

type Filter = 'todos' | 'acertei' | 'errei' | 'pendentes'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'acertei', label: 'Acertei' },
  { key: 'errei', label: 'Errei' },
  { key: 'pendentes', label: 'Pendentes' },
]

const STATUS_LABEL: Record<BetStatus, string> = {
  acertou_placar: 'Cravou 🎯',
  acertou_resultado: 'Resultado',
  errou: 'Errou',
  pendente: 'Pendente',
}

const STATUS_VARIANT: Record<
  BetStatus,
  'acertou_placar' | 'acertou_resultado' | 'errou' | 'travado'
> = {
  acertou_placar: 'acertou_placar',
  acertou_resultado: 'acertou_resultado',
  errou: 'errou',
  pendente: 'travado',
}

function matchesFilter(status: BetStatus, hasBet: boolean, filter: Filter): boolean {
  if (filter === 'todos') return true
  if (filter === 'acertei')
    return status === 'acertou_placar' || status === 'acertou_resultado'
  if (filter === 'errei') return status === 'errou'
  if (filter === 'pendentes') return status === 'pendente' || !hasBet
  return true
}

export function MyBetsView({ rounds }: { rounds: Record<number, MyBetEntry[]> }) {
  const [activeRound, setActiveRound] = useState(1)
  const [filter, setFilter] = useState<Filter>('todos')

  const entries = rounds[activeRound] ?? []
  const filtered = entries.filter((e) =>
    matchesFilter(e.status, !!e.bet, filter),
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Abas de rodada */}
      <div className="flex gap-2">
        {[1, 2, 3].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setActiveRound(r)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-semibold transition-colors',
              activeRound === r
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            Rodada {r}
          </button>
        ))}
      </div>

      {/* Filtros de status */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === f.key
                ? 'border-brand-blue bg-brand-blue text-white'
                : 'border-input text-muted-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          Nada por aqui com esse filtro.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map(({ match, bet, status }) => {
            const home = match.home_team
            const away = match.away_team
            const open =
              match.status === 'scheduled' &&
              !(match.deadline_at && isDeadlinePassed(match.deadline_at))
            const homeTier =
              match.home_tier_at_kickoff ?? home?.current_tier ?? 3
            const awayTier =
              match.away_tier_at_kickoff ?? away?.current_tier ?? 3

            // Preview de pontos para jogo ainda não finalizado e com palpite
            const preview =
              bet && match.status !== 'finished'
                ? previewPoints(
                    homeTier,
                    awayTier,
                    bet.predicted_home_score,
                    bet.predicted_away_score,
                  )
                : null

            return (
              <li
                key={match.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-1 items-center gap-2">
                    <TeamFlag
                      flagUrl={home?.flag_url ?? null}
                      teamName={home?.name ?? '?'}
                      size={24}
                    />
                    <span className="text-sm font-medium">{home?.name}</span>
                  </div>
                  <span className="shrink-0 font-display text-sm">
                    {match.status === 'finished'
                      ? `${match.home_score ?? 0} - ${match.away_score ?? 0}`
                      : '×'}
                  </span>
                  <div className="flex flex-1 items-center justify-end gap-2 text-right">
                    <span className="text-sm font-medium">{away?.name}</span>
                    <TeamFlag
                      flagUrl={away?.flag_url ?? null}
                      teamName={away?.name ?? '?'}
                      size={24}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    🗓️ {formatKickoff(match.kickoff_at)}
                  </span>

                  {bet ? (
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold">
                        Palpite: {bet.predicted_home_score}-
                        {bet.predicted_away_score}
                      </span>
                      {match.status === 'finished' ? (
                        <Badge variant={STATUS_VARIANT[status]}>
                          {STATUS_LABEL[status]}
                          {bet.total_points !== null && status !== 'errou'
                            ? ` · ${bet.total_points.toFixed(2).replace('.', ',')}`
                            : ''}
                        </Badge>
                      ) : preview ? (
                        <span className="text-muted-foreground">
                          até {preview.ifExact.toFixed(2).replace('.', ',')} pts
                        </span>
                      ) : null}
                    </div>
                  ) : open ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/grupos/rodada/${match.round_number ?? 1}`}>
                        Palpitar
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">Sem palpite 😬</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
