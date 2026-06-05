'use client'

import { useState, useTransition } from 'react'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { InputScore } from '@/components/ui/input-score'
import { Badge, TierBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TeamFlag } from '@/components/team-flag'
import { BetPreview } from '@/components/bet-preview'
import { saveKnockoutBet, type SaveKnockoutBetResult } from '@/lib/actions/knockout'
import { formatKickoff, isDeadlinePassed } from '@/lib/datetime'
import { TOAST } from '@/lib/constants'
import type { Bet, MatchWithTeams } from '@/types'

interface KnockoutBetDisplayEntry {
  user_id: string
  user_name: string
  user_avatar: string | null
  predicted_home_score: number
  predicted_away_score: number
  predicted_advancing_team_id: string | null
  total_points: number | null
}

interface KnockoutMatchCardProps {
  match: MatchWithTeams
  myBet: Bet | null
  otherBets?: KnockoutBetDisplayEntry[]
  currentUserId?: string
}

export function KnockoutMatchCard({
  match,
  myBet,
  otherBets = [],
  currentUserId,
}: KnockoutMatchCardProps) {
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
  const [advancingTeamId, setAdvancingTeamId] = useState<string | null>(
    myBet?.predicted_advancing_team_id ?? null,
  )
  const [isPending, startTransition] = useTransition()
  const [showOthers, setShowOthers] = useState(false)

  const deadlinePassed = match.deadline_at
    ? isDeadlinePassed(match.deadline_at)
    : match.status !== 'scheduled'

  const isLocked = deadlinePassed || match.status === 'live' || match.status === 'finished'

  function handleSave() {
    if (homeScore === '' || awayScore === '' || !advancingTeamId) {
      toast.error('Preencha o placar e escolha quem avança.')
      return
    }

    startTransition(async () => {
      const result: SaveKnockoutBetResult = await saveKnockoutBet(
        match.id,
        homeScore as number,
        awayScore as number,
        advancingTeamId,
      )

      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(TOAST.betSaved)
      }
    })
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${isLocked ? 'bg-[var(--bg-surface)]' : 'bg-white'}`}>
      {/* Header: times + tiers + badge travado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {home && <TeamFlag flagUrl={home.flag_url} teamName={home.name} size={28} />}
          <div>
            <span className="font-semibold text-sm">{home?.name ?? '?'}</span>
            <div><TierBadge tier={(homeTier as 1|2|3|4|5)} /></div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          {isLocked ? (
            <Badge variant="travado" className="flex items-center gap-1 text-xs">
              <Lock className="w-3 h-3" />
              TRAVADO
            </Badge>
          ) : (
            <span className="text-xs text-[var(--text-secondary)]">vs</span>
          )}
          {match.status === 'live' && (
            <Badge variant="warning" className="text-xs">AO VIVO 🔴</Badge>
          )}
          {match.home_score !== null && match.away_score !== null && (
            <span className="text-lg font-bold font-display">
              {match.home_score}–{match.away_score}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-right">
          <div>
            <span className="font-semibold text-sm">{away?.name ?? '?'}</span>
            <div className="flex justify-end"><TierBadge tier={(awayTier as 1|2|3|4|5)} /></div>
          </div>
          {away && <TeamFlag flagUrl={away.flag_url} teamName={away.name} size={28} />}
        </div>
      </div>

      {/* Kickoff */}
      <p className="text-xs text-center text-[var(--text-secondary)]">
        {formatKickoff(match.kickoff_at)}
      </p>

      {/* Inputs de placar ou leitura */}
      {isLocked ? (
        myBet ? (
          <div className="text-center text-sm text-[var(--text-secondary)]">
            Seu palpite:{' '}
            <strong>{myBet.predicted_home_score}–{myBet.predicted_away_score}</strong>
            {myBet.predicted_advancing_team_id && (
              <span className="ml-2">
                · avança:{' '}
                <strong>
                  {[home, away].find((t) => t?.id === myBet.predicted_advancing_team_id)?.name ?? myBet.predicted_advancing_team_id}
                </strong>
              </span>
            )}
            {myBet.total_points !== null && (
              <span className="ml-2 text-success font-bold">
                · {myBet.total_points.toFixed(1)} pts
              </span>
            )}
          </div>
        ) : (
          <p className="text-center text-sm text-[var(--text-secondary)]">Sem palpite</p>
        )
      ) : (
        <div className="space-y-3">
          {/* Placar */}
          <div className="flex items-center justify-center gap-4">
            <InputScore
              value={homeScore}
              onChange={setHomeScore}
              disabled={isLocked}
              aria-label={`Gols ${home?.name}`}
            />
            <span className="text-[var(--text-secondary)]">×</span>
            <InputScore
              value={awayScore}
              onChange={setAwayScore}
              disabled={isLocked}
              aria-label={`Gols ${away?.name}`}
            />
          </div>

          {/* Quem avança */}
          <div className="space-y-1">
            <p className="text-xs text-center text-[var(--text-secondary)]">Quem avança?</p>
            <div className="flex justify-center gap-2">
              {[home, away].filter(Boolean).map((team) => (
                <button
                  key={team!.id}
                  type="button"
                  onClick={() => setAdvancingTeamId(team!.id)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all',
                    advancingTeamId === team!.id
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--primary-fg)]'
                      : 'bg-white border-[var(--border)] hover:border-[var(--primary)]',
                  ].join(' ')}
                >
                  <TeamFlag flagUrl={team!.flag_url} teamName={team!.name} size={16} />
                  {team!.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Preview de pontos */}
          {homeScore !== '' && awayScore !== '' && (
            <BetPreview
              homeTier={homeTier}
              awayTier={awayTier}
              predictedHome={homeScore as number}
              predictedAway={awayScore as number}
            />
          )}

          {/* Botão salvar */}
          <Button
            onClick={handleSave}
            disabled={isPending || homeScore === '' || awayScore === '' || !advancingTeamId}
            className="w-full"
          >
            {isPending ? 'Salvando...' : 'Salvar palpite'}
          </Button>
        </div>
      )}

      {/* Palpites dos outros (pós deadline) */}
      {isLocked && otherBets.length > 0 && (
        <div>
          <button
            type="button"
            className="text-xs text-brand-blue hover:underline w-full text-center"
            onClick={() => setShowOthers(!showOthers)}
          >
            {showOthers ? 'Esconder' : `Ver ${otherBets.length} palpites do bolão`}
          </button>
          {showOthers && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {otherBets.map((b) => (
                <div key={b.user_id} className="flex items-center gap-2 text-xs py-1 border-b border-[var(--border)] last:border-0">
                  <span className="font-medium flex-1">{b.user_name}</span>
                  <span>{b.predicted_home_score}–{b.predicted_away_score}</span>
                  {b.predicted_advancing_team_id && (
                    <span className="text-[var(--text-secondary)]">
                      {[home, away].find((t) => t?.id === b.predicted_advancing_team_id)?.name?.split(' ')[0] ?? '?'}
                    </span>
                  )}
                  {b.total_points !== null && (
                    <span className="text-success font-bold">
                      {b.total_points.toFixed(1)} pts
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
