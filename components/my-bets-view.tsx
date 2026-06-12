'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Search } from 'lucide-react'
import { TierBadge, Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TeamFlag } from '@/components/team-flag'
import { EditBetDialog } from '@/components/edit-bet-dialog'
import { ShareBetButton } from '@/components/share-bet-button'
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
  acertou_placar: 'Cravou',
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
  const filtered = entries.filter((e) => matchesFilter(e.status, !!e.bet, filter))

  return (
    <div className="flex flex-col gap-4">
      {/* Abas de rodada */}
      <div className="flex gap-2">
        {[1, 2, 3].map((r) => {
          const count = rounds[r]?.length ?? 0
          return (
            <button
              key={r}
              type="button"
              onClick={() => setActiveRound(r)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2.5 text-sm font-semibold transition-colors',
                activeRound === r
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              <span>Rodada {r}</span>
              {count > 0 && (
                <span className="text-[10px] opacity-70">{count} jogos</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Filtros de status */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              filter === f.key
                ? 'bg-brand-blue text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Nada aqui com esse filtro. 🤷
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map(({ match, bet, status }) => {
            const home = match.home_team
            const away = match.away_team
            const isOpen =
              match.status === 'scheduled' &&
              !(match.deadline_at && isDeadlinePassed(match.deadline_at))
            const isFinished = match.status === 'finished'
            const homeTier =
              match.home_tier_at_kickoff ?? home?.current_tier ?? 3
            const awayTier =
              match.away_tier_at_kickoff ?? away?.current_tier ?? 3

            const preview =
              bet && !isFinished
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
                className={cn(
                  'flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-shadow',
                  isOpen && 'border-brand-blue/30 shadow-sm',
                )}
              >
                {/* Cabeçalho: grupo + status do jogo */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">
                    {match.group_name ? `Grupo ${match.group_name}` : 'Fase de grupos'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isOpen && (
                      <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-semibold text-brand-blue">
                        ABERTO
                      </span>
                    )}
                    {isFinished && match.home_score !== null && (
                      <span className="font-display text-xs font-bold text-foreground">
                        {match.home_score} - {match.away_score}
                      </span>
                    )}
                  </div>
                </div>

                {/* Times */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-1 items-center gap-2">
                    <TeamFlag
                      flagUrl={home?.flag_url ?? null}
                      teamName={home?.name ?? '?'}
                      size={26}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold leading-tight">
                        {home?.name}
                      </span>
                      <TierBadge tier={homeTier as 1 | 2 | 3 | 4 | 5} />
                    </div>
                  </div>

                  <span className="shrink-0 font-display text-lg text-muted-foreground">
                    ×
                  </span>

                  <div className="flex flex-1 items-center justify-end gap-2 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold leading-tight">
                        {away?.name}
                      </span>
                      <TierBadge tier={awayTier as 1 | 2 | 3 | 4 | 5} />
                    </div>
                    <TeamFlag
                      flagUrl={away?.flag_url ?? null}
                      teamName={away?.name ?? '?'}
                      size={26}
                    />
                  </div>
                </div>

                {/* Palpite + status */}
                {bet ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Seu chute</span>
                      <span className="font-display text-base font-bold">
                        {bet.predicted_home_score}-{bet.predicted_away_score}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isFinished ? (
                        <Badge variant={STATUS_VARIANT[status]}>
                          {STATUS_LABEL[status]}
                          {bet.total_points !== null && status !== 'errou'
                            ? ` · ${bet.total_points.toFixed(2).replace('.', ',')}`
                            : ''}
                        </Badge>
                      ) : preview ? (
                        <span className="text-xs text-muted-foreground">
                          até{' '}
                          <span className="font-semibold text-success">
                            {preview.ifExact.toFixed(2).replace('.', ',')} pts
                          </span>
                        </span>
                      ) : (
                        <Badge variant="travado">Pendente</Badge>
                      )}
                    </div>
                  </div>
                ) : isOpen ? (
                  <div className="rounded-xl border border-dashed border-brand-blue/40 px-3 py-2.5 text-center">
                    <Button asChild size="sm" variant="outline" className="border-brand-blue text-brand-blue hover:bg-brand-blue/10">
                      <Link href={`/grupos/rodada/${match.round_number ?? 1}`}>
                        Palpitar!
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                    Sem palpite 😬
                  </div>
                )}

                {/* Rodapé: data + ações */}
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {formatKickoff(match.kickoff_at)}
                  </span>
                  {bet && (
                    <div className="flex items-center gap-1">
                      {isOpen && (
                        <EditBetDialog match={match} currentBet={bet} />
                      )}
                      <ShareBetButton
                        homeTeam={home?.name ?? '?'}
                        awayTeam={away?.name ?? '?'}
                        homeScore={bet.predicted_home_score}
                        awayScore={bet.predicted_away_score}
                        homeFlagUrl={home?.flag_url}
                        awayFlagUrl={away?.flag_url}
                        groupName={match.group_name}
                      />
                    </div>
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
