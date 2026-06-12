'use client'

import { useState, useTransition } from 'react'
import { Lock, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { InputScore } from '@/components/ui/input-score'
import { Badge, TierBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TeamFlag } from '@/components/team-flag'
import { BetPreview } from '@/components/bet-preview'
import { BetsPanel } from '@/components/bets-panel'
import { ShareBetButton } from '@/components/share-bet-button'
import { saveBet, type BetEntry } from '@/lib/actions/bets'
import { formatKickoff, formatDeadline, isDeadlinePassed } from '@/lib/datetime'
import { TOAST } from '@/lib/constants'
import type { Bet, MatchWithTeams } from '@/types'

interface MatchCardProps {
  match: MatchWithTeams
  myBet: Bet | null
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
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      {/* Cabeçalho: grupo + status */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">
          {match.group_name ? `Grupo ${match.group_name}` : ''}
        </span>
        <div className="flex items-center gap-1.5">
          {isLive && (
            <Badge variant="errou" className="gap-1.5 text-[10px]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              AO VIVO
            </Badge>
          )}
          {isFinished && <Badge variant="travado" className="text-[10px]">Acabou</Badge>}
          {!isFinished && !isLive && deadlinePassed && (
            <Badge variant="travado" className="gap-1 text-[10px]">
              <Lock className="h-2.5 w-2.5" /> Travado
            </Badge>
          )}
        </div>
      </div>

      {/* Times */}
      <div className="flex items-center justify-between gap-2">
        {/* Casa */}
        <div className="flex flex-1 items-center gap-2">
          <TeamFlag flagUrl={home?.flag_url ?? null} teamName={home?.name ?? '?'} />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold leading-tight">{home?.name ?? '?'}</span>
            <TierBadge tier={homeTier as 1 | 2 | 3 | 4 | 5} />
          </div>
        </div>

        {/* Placar real ou separador */}
        <div className="shrink-0 px-2 font-display text-xl font-bold">
          {isFinished || isLive ? (
            <span className="text-foreground">
              {match.home_score ?? 0} - {match.away_score ?? 0}
            </span>
          ) : (
            <span className="text-muted-foreground">×</span>
          )}
        </div>

        {/* Visitante */}
        <div className="flex flex-1 items-center justify-end gap-2 text-right">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-sm font-semibold leading-tight">{away?.name ?? '?'}</span>
            <TierBadge tier={awayTier as 1 | 2 | 3 | 4 | 5} />
          </div>
          <TeamFlag flagUrl={away?.flag_url ?? null} teamName={away?.name ?? '?'} />
        </div>
      </div>

      {/* Inputs de palpite — apenas quando jogo está aberto */}
      {!locked && (
        <>
          <div className="flex items-center justify-center gap-4 py-1">
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

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {match.deadline_at ? formatDeadline(match.deadline_at) : ''}
            </span>
            <Button onClick={handleSave} disabled={isPending} size="sm">
              {isPending ? 'Salvando...' : myBet ? 'Atualizar' : 'Palpitar'}
            </Button>
          </div>
        </>
      )}

      {/* Jogo travado — meu palpite read-only */}
      {locked && myBet && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Você chutou:</span>
            <span className="font-display text-base font-bold">
              {myBet.predicted_home_score} - {myBet.predicted_away_score}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {myBet.total_points !== null && (
              <span className="font-display font-bold text-success">
                {myBet.total_points.toFixed(2).replace('.', ',')} pts
              </span>
            )}
            <ShareBetButton
              homeTeam={home?.name ?? '?'}
              awayTeam={away?.name ?? '?'}
              homeScore={myBet.predicted_home_score}
              awayScore={myBet.predicted_away_score}
              homeFlagUrl={home?.flag_url}
              awayFlagUrl={away?.flag_url}
              groupName={match.group_name}
            />
          </div>
        </div>
      )}

      {locked && !myBet && (
        <div className="rounded-xl bg-muted px-3 py-2.5 text-center text-sm text-muted-foreground">
          Você não palpitou nesse. 😬
        </div>
      )}

      {/* Kickoff */}
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3 shrink-0" />
        {formatKickoff(match.kickoff_at)}
        {isLive && ' · placar atualiza a cada ~10min'}
      </div>

      {/* Palpites dos outros — após deadline */}
      {deadlinePassed && (
        <BetsPanel
          bets={otherBets}
          currentUserId={currentUserId}
          matchTiers={{ home: homeTier, away: awayTier }}
        />
      )}
    </div>
  )
}
