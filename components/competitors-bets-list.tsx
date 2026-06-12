'use client'

import { useState } from 'react'
import { ChevronDown, Lock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { TeamFlag } from '@/components/team-flag'
import { formatKickoff } from '@/lib/datetime'
import type { BetEntry } from '@/lib/actions/bets'
import type { MatchWithTeams, BetStatus } from '@/types'

const STATUS_VARIANT: Record<
  BetStatus,
  'acertou_placar' | 'acertou_resultado' | 'errou' | 'travado'
> = {
  acertou_placar: 'acertou_placar',
  acertou_resultado: 'acertou_resultado',
  errou: 'errou',
  pendente: 'travado',
}

const STATUS_LABEL: Record<BetStatus, string> = {
  acertou_placar: 'Cravou',
  acertou_resultado: 'Resultado',
  errou: 'Errou',
  pendente: 'Pendente',
}

interface MatchBetsItem {
  match: MatchWithTeams
  bets: BetEntry[]
  deadlinePassed: boolean
}

export function CompetitorsBetsList({ matches }: { matches: MatchBetsItem[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(matches[0] ? [matches[0].match.id] : []),
  )

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {matches.map(({ match, bets, deadlinePassed }) => {
        const home = match.home_team
        const away = match.away_team
        const isFinished = match.status === 'finished'
        const isLive = match.status === 'live'
        const isOpen = openIds.has(match.id)

        return (
          <div
            key={match.id}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            {/* Cabeçalho clicável */}
            <button
              type="button"
              onClick={() => toggle(match.id)}
              className="flex w-full items-center gap-2 px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
            >
              {/* Time da casa */}
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <TeamFlag
                  flagUrl={home?.flag_url ?? null}
                  teamName={home?.name ?? '?'}
                  size={20}
                />
                <span className="text-sm font-semibold truncate">{home?.name}</span>
              </div>

              {/* Placar / horário */}
              <div className="shrink-0 text-center px-1">
                {isFinished ? (
                  <span className="font-display text-sm font-bold">
                    {match.home_score ?? 0} - {match.away_score ?? 0}
                  </span>
                ) : isLive ? (
                  <span className="font-display text-xs font-bold text-danger">AO VIVO</span>
                ) : (
                  <span className="font-display text-xs text-muted-foreground">
                    {formatKickoff(match.kickoff_at)}
                  </span>
                )}
              </div>

              {/* Time visitante */}
              <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
                <span className="text-sm font-semibold truncate text-right">{away?.name}</span>
                <TeamFlag
                  flagUrl={away?.flag_url ?? null}
                  teamName={away?.name ?? '?'}
                  size={20}
                />
              </div>

              {/* Chevron */}
              <ChevronDown
                className={`ml-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Conteúdo expansível */}
            {isOpen && (
              <div className="border-t border-border px-4 pb-3 pt-2.5">
                {!deadlinePassed ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span>Palpites revelados após o início do jogo.</span>
                  </div>
                ) : bets.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">
                    Nenhum palpite registrado.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {bets.map((b) => {
                      const initial = b.user_name.charAt(0).toUpperCase()
                      return (
                        <div
                          key={b.bet_id}
                          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/60"
                        >
                          <Avatar className="h-6 w-6 shrink-0">
                            {b.user_avatar_url ? (
                              <AvatarImage src={b.user_avatar_url} alt={b.user_name} />
                            ) : null}
                            <AvatarFallback className="text-[10px] font-bold">
                              {initial}
                            </AvatarFallback>
                          </Avatar>

                          <span className="flex-1 truncate text-xs font-medium">
                            {b.user_name.split(' ')[0]}
                          </span>

                          <span className="font-display text-sm font-bold tabular-nums">
                            {b.predicted_home_score}-{b.predicted_away_score}
                          </span>

                          {isFinished && (
                            <Badge
                              variant={STATUS_VARIANT[b.status]}
                              className="shrink-0 text-[10px]"
                            >
                              {STATUS_LABEL[b.status]}
                              {b.total_points !== null && b.status !== 'errou'
                                ? ` · ${b.total_points.toFixed(1)}`
                                : ''}
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
