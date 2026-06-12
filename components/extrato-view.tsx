'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TeamFlag } from '@/components/team-flag'
import { cn } from '@/lib/utils'
import type { MyBetEntry } from '@/lib/actions/bets'
import type { BetStatus } from '@/types'

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

export function ExtratoView({ rounds }: { rounds: Record<number, MyBetEntry[]> }) {
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b)
  const [openRounds, setOpenRounds] = useState<Set<number>>(new Set(roundNumbers))

  function toggle(r: number) {
    setOpenRounds((prev) => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r)
      else next.add(r)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {roundNumbers.map((roundNum) => {
        const entries = (rounds[roundNum] ?? []).filter((e) => e.bet)
        const finished = entries.filter((e) => e.status !== 'pendente')
        const roundTotal = finished.reduce((s, e) => s + (e.bet?.total_points ?? 0), 0)
        const isOpen = openRounds.has(roundNum)

        return (
          <div key={roundNum} className="overflow-hidden rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => toggle(roundNum)}
              className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180',
                  )}
                />
                <span className="text-sm font-semibold">Rodada {roundNum}</span>
                <span className="text-xs text-muted-foreground">
                  {entries.length} palpite{entries.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span
                className={cn(
                  'font-display text-sm font-bold',
                  finished.length > 0 && roundTotal > 0
                    ? 'text-success'
                    : 'text-muted-foreground',
                )}
              >
                {finished.length > 0
                  ? `${roundTotal > 0 ? '+' : ''}${roundTotal.toFixed(2).replace('.', ',')}`
                  : '—'}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-border px-3 pb-3 pt-2">
                {entries.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    Nenhum palpite nessa rodada.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {entries.map(({ match, bet, status }) => {
                      const home = match.home_team
                      const away = match.away_team
                      const isFinished = match.status === 'finished'

                      return (
                        <li
                          key={match.id}
                          className={cn(
                            'flex items-center gap-2 rounded-xl px-3 py-2',
                            isFinished ? 'bg-muted' : 'bg-muted/40',
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <TeamFlag flagUrl={home?.flag_url ?? null} teamName={home?.name ?? '?'} size={18} />
                            <span className="text-[11px] font-semibold">
                              {home?.name?.slice(0, 3).toUpperCase()}
                            </span>
                            <span className="font-display text-xs font-bold">
                              {isFinished ? `${match.home_score ?? 0}-${match.away_score ?? 0}` : '×'}
                            </span>
                            <span className="text-[11px] font-semibold">
                              {away?.name?.slice(0, 3).toUpperCase()}
                            </span>
                            <TeamFlag flagUrl={away?.flag_url ?? null} teamName={away?.name ?? '?'} size={18} />
                          </div>

                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {bet!.predicted_home_score}-{bet!.predicted_away_score}
                          </span>

                          <div className="flex shrink-0 flex-col items-end gap-0.5">
                            <Badge variant={STATUS_VARIANT[status]} className="px-1.5 py-0 text-[9px]">
                              {STATUS_LABEL[status]}
                            </Badge>
                            {bet!.total_points !== null && status !== 'errou' && (
                              <span className="font-display text-[10px] font-bold text-success">
                                +{bet!.total_points.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
