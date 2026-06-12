'use client'

import { useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InputScore } from '@/components/ui/input-score'
import { BetPreview } from '@/components/bet-preview'
import { TeamFlag } from '@/components/team-flag'
import { saveBet } from '@/lib/actions/bets'
import { TOAST } from '@/lib/constants'
import type { MatchWithTeams, Bet } from '@/types'

interface EditBetDialogProps {
  match: MatchWithTeams
  currentBet: Bet
}

export function EditBetDialog({ match, currentBet }: EditBetDialogProps) {
  const [open, setOpen] = useState(false)
  const [homeScore, setHomeScore] = useState<number | ''>(
    currentBet.predicted_home_score,
  )
  const [awayScore, setAwayScore] = useState<number | ''>(
    currentBet.predicted_away_score,
  )
  const [isPending, startTransition] = useTransition()

  const homeTier = match.home_tier_at_kickoff ?? match.home_team?.current_tier ?? 3
  const awayTier = match.away_tier_at_kickoff ?? match.away_team?.current_tier ?? 3

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
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-blue transition-colors hover:bg-brand-blue/10"
        >
          <Pencil className="h-3 w-3" />
          Editar
        </button>
      </DialogTrigger>

      <DialogContent className="mx-4 max-w-sm rounded-2xl p-5">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Editar palpite</DialogTitle>
        </DialogHeader>

        {/* Match info */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
          <div className="flex flex-1 items-center gap-2">
            <TeamFlag
              flagUrl={match.home_team?.flag_url ?? null}
              teamName={match.home_team?.name ?? '?'}
              size={22}
            />
            <span className="text-sm font-semibold">{match.home_team?.name}</span>
          </div>
          <span className="shrink-0 font-display text-sm text-muted-foreground">×</span>
          <div className="flex flex-1 items-center justify-end gap-2">
            <span className="text-sm font-semibold">{match.away_team?.name}</span>
            <TeamFlag
              flagUrl={match.away_team?.flag_url ?? null}
              teamName={match.away_team?.name ?? '?'}
              size={22}
            />
          </div>
        </div>

        {/* Score inputs */}
        <div className="flex items-center justify-center gap-4 py-2">
          <InputScore
            value={homeScore}
            onChange={setHomeScore}
            aria-label={`Placar ${match.home_team?.name}`}
          />
          <span className="font-display text-2xl text-muted-foreground">×</span>
          <InputScore
            value={awayScore}
            onChange={setAwayScore}
            aria-label={`Placar ${match.away_team?.name}`}
          />
        </div>

        {/* Points preview */}
        <BetPreview
          homeTier={homeTier}
          awayTier={awayTier}
          predictedHome={homeScore}
          predictedAway={awayScore}
        />

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar palpite'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
