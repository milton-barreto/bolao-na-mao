'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminUpdateMatch, adminForceMatchStatus } from '@/lib/actions/admin'
import { MATCH_STATUS } from '@/lib/constants'
import type { MatchWithTeams } from '@/types'

interface EditMatchDialogProps {
  match: MatchWithTeams | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (recalculated: number) => void
}

export function EditMatchDialog({
  match,
  open,
  onOpenChange,
  onSaved,
}: EditMatchDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [homeScore, setHomeScore] = useState<string>('')
  const [awayScore, setAwayScore] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [reason, setReason] = useState('')

  // Sync state quando match muda
  const resetFields = (m: MatchWithTeams | null) => {
    setHomeScore(m?.home_score?.toString() ?? '')
    setAwayScore(m?.away_score?.toString() ?? '')
    setStatus(m?.status ?? 'scheduled')
    setReason('')
  }

  function handleOpenChange(open: boolean) {
    if (open && match) resetFields(match)
    onOpenChange(open)
  }

  function handleSubmit() {
    if (!match || !reason.trim()) {
      toast.error('Preencha a justificativa.')
      return
    }

    startTransition(async () => {
      const updates: Record<string, unknown> = { status }
      if (homeScore !== '') updates.home_score = parseInt(homeScore, 10)
      if (awayScore !== '') updates.away_score = parseInt(awayScore, 10)

      const res = await adminUpdateMatch(match.id, updates as Parameters<typeof adminUpdateMatch>[1], reason)

      if ('error' in res) {
        toast.error(res.error)
      } else {
        const recalculated = (res as { recalculated?: number }).recalculated ?? 0
        toast.success(
          recalculated > 0
            ? `${res.message} ${recalculated} palpites recalculados.`
            : res.message ?? 'Jogo atualizado.',
        )
        onSaved?.(recalculated)
        onOpenChange(false)
      }
    })
  }

  if (!match) return null

  const homeName = match.home_team?.name ?? match.home_team_id ?? '?'
  const awayName = match.away_team?.name ?? match.away_team_id ?? '?'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar jogo</DialogTitle>
          <p className="text-sm text-[var(--text-secondary)]">
            {homeName} vs {awayName}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Placar */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">{homeName}</Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                placeholder="–"
                className="text-center text-lg font-bold"
              />
            </div>
            <span className="text-lg font-bold text-[var(--text-secondary)] mt-4">×</span>
            <div className="flex-1">
              <Label className="text-xs mb-1 block">{awayName}</Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                placeholder="–"
                className="text-center text-lg font-bold"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-xs mb-1 block">Status</Label>
            <select
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-white"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {Object.entries(MATCH_STATUS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Justificativa */}
          <div>
            <Label className="text-xs mb-1 block">
              Justificativa <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Ex: Placar oficial confirmado pelo árbitro"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isPending || !reason.trim()}>
            {isPending ? 'Salvando...' : 'Salvar jogo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
