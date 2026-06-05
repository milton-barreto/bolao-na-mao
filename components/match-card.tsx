'use client'

import { useState, useTransition } from 'react'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { InputScore } from '@/components/ui/input-score'
import { Badge, TierBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TeamFlag } from '@/components/team-flag'
import { BetPreview } from '@/components/bet-preview'
import { BetsPanel } from '@/components/bets-panel'
import { saveBet, type BetEntry } from '@/lib/actions/bets'
import { formatKickoff, formatDeadline, isDeadlinePassed } from '@/lib/datetime'
import { TOAST } from '@/lib/constants'
import type { Bet, MatchWithTeams } from '@/types'

interface MatchCardProps {
  match: MatchWithTeams
  myBet: Bet | null
  /** Palpites dos outros (preenchido só após deadline) */
  otherBets?: BetEntry[]
  currentUserId?: string
}

export function MatchCard({
  match,
  myBet,
  otherBets = [],
  currentUserId,
}: MatchCardProps) {
  const home = match.home_team
  const away = match.away_team

  // Tiers para o preview: usa o tier_at_kickoff se já fixado, senão o atual
  const homeTier = match.home_tier_at_kickoff ?? home?.current_tier ?? 3
  const awayTier = match.away_tier_at_kickoff ?? away?.current_tier ?? 3

  const [homeScore, setHomeScore] = useState<number | ''>(
    myBet?.predicted_home_score ?? '',
  )
  const [awayScore, setAwayScore] = useState<number | ''>(
    myBet?.predicted_away_score ?? '',
  )
  const [isPending, startTransition] = useTransition()

  const deadlinePassed =
    match.deadline_at !== null && isDeadlinePassed(match.deadline_at)
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'
  const locked = match.status !== 'scheduled' || deadlinePassed

  function handleSave() {
    if (homeScore === '' || awayScore === '') {
      toast.error('Preenche os dois placares, mano.')
      return
    }
    startTransition(async () => {
      const result = await saveBet(match.id, homeScore as number, awayScore as number)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(TOAST.betSaved)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {/* Cabeçalho: grupo + status */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {match.group_name ? `Grupo ${match.group_name}` : ''}
        </span>
        {isLive && (
          <Badge variant="errou" className="gap-1">
            AO VIVO 🔴
          </Badge>
        )}
        {isFinished && <Badge variant="travado">Encerrado</Badge>}
        {!isFinished && !isLive && deadlinePassed && (
          <Badge variant="travado" className="gap-1">
            <Lock className="h-3 w-3" /> TRAVADO
          </Badge>
        )}
      </div>

      {/* Times */}
      <div className="flex items-center justify-between gap-2">
        {/* Casa */}
        <div className="flex flex-1 items-center gap-2">
          <TeamFlag flagUrl={home?.flag_url ?? null} teamName={home?.name ?? '?'} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{home?.name ?? '?'}</span>
            <TierBadge tier={homeTier as 1 | 2 | 3 | 4 | 5} />
          </div>
        </div>

        {/* Placar real (se finalizado/live) ou "x" */}
        <div className="shrink-0 px-2 font-display text-lg font-bold text-muted-foreground">
          {isFinished || isLive ? (
            <span className="text-foreground">
              {match.home_score ?? 0} - {match.away_score ?? 0}
            </span>
          ) : (
            '×'
          )}
        </div>

        {/* Visitante */}
        <div className="flex flex-1 items-center justify-end gap-2 text-right">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold">{away?.name ?? '?'}</span>
            <TierBadge tier={awayTier as 1 | 2 | 3 | 4 | 5} />
          </div>
          <TeamFlag flagUrl={away?.flag_url ?? null} teamName={away?.name ?? '?'} />
        </div>
      </div>

      {/* Inputs de palpite (só quando aberto) */}
      {!locked && (
        <>
          <div className="flex items-center justify-center gap-4">
            <InputScore
              value={homeScore}
              onChange={setHomeScore}
              aria-label={`Placar ${home?.name}`}
            />
            <span className="font-display text-2xl text-muted-foreground">×</span>
            <InputScore
              value={awayScore}
              onChange={setAwayScore}
              aria-label={`Placar ${away?.name}`}
            />
          </div>

          <BetPreview
            homeTier={homeTier}
            awayTier={awayTier}
            predictedHome={homeScore}
            predictedAway={awayScore}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {match.deadline_at ? formatDeadline(match.deadline_at) : ''}
            </span>
            <Button onClick={handleSave} disabled={isPending} size="sm">
              {isPending ? 'Salvando...' : myBet ? 'Atualizar' : 'Salvar palpite'}
            </Button>
          </div>
        </>
      )}

      {/* Quando travado: mostra meu palpite read-only */}
      {locked && myBet && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted py-2 text-sm">
          <span className="text-muted-foreground">Seu palpite:</span>
          <span className="font-display font-bold">
            {myBet.predicted_home_score} - {myBet.predicted_away_score}
          </span>
          {myBet.total_points !== null && (
            <span className="font-display font-bold text-success">
              · {myBet.total_points.toFixed(2).replace('.', ',')} pts
            </span>
          )}
        </div>
      )}

      {locked && !myBet && (
        <div className="rounded-lg bg-muted py-2 text-center text-sm text-muted-foreground">
          Você não palpitou nesse. 😬
        </div>
      )}

      {/* Kickoff */}
      <div className="text-center text-xs text-muted-foreground">
        🗓️ {formatKickoff(match.kickoff_at)}
        {isLive && ' · atualizado a cada ~10min'}
      </div>

      {/* Palpites dos outros (após deadline) */}
      {deadlinePassed && (
        <BetsPanel bets={otherBets} currentUserId={currentUserId} />
      )}
    </div>
  )
}
